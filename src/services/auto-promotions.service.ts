import type { OrderItem, Product } from '../app/context/AppContext';
import {
  isBanderillaProduct,
  isOrdenDe6Product,
  isRamenProduct,
  isTeaProduct,
} from '../config/inventory.config';

export type AutoPromotionId = 'banderillas_2x1half' | 'dumplings_3x2' | 'ramen_free_tea';

export interface AutoPromotionRule {
  id: AutoPromotionId;
  name: string;
  active: boolean;
}

export const AUTO_PROMOTIONS_STORAGE_KEY = 'dumplings_auto_promotions';

export const DEFAULT_AUTO_PROMOTIONS: AutoPromotionRule[] = [
  {
    id: 'banderillas_2x1half',
    name: 'Banderillas: 2ª a mitad de precio',
    active: true,
  },
  {
    id: 'dumplings_3x2',
    name: 'Órdenes de 6: paga 2 de 3 (la más barata gratis)',
    active: true,
  },
  {
    id: 'ramen_free_tea',
    name: 'Ramen: 2 té gratis por cada 2 ramen',
    active: true,
  },
];

export interface OrderPricingResult {
  items: OrderItem[];
  subtotal: number;
  autoPromotionDiscount: number;
  total: number;
  appliedPromotions: string[];
}

export function loadAutoPromotions(): AutoPromotionRule[] {
  try {
    const raw = localStorage.getItem(AUTO_PROMOTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_PROMOTIONS;

    const saved = JSON.parse(raw) as AutoPromotionRule[];
    return DEFAULT_AUTO_PROMOTIONS.map(defaultRule => {
      const match = saved.find(rule => rule.id === defaultRule.id);
      return match ? { ...defaultRule, active: match.active } : defaultRule;
    });
  } catch {
    return DEFAULT_AUTO_PROMOTIONS;
  }
}

export function saveAutoPromotions(rules: AutoPromotionRule[]): void {
  localStorage.setItem(AUTO_PROMOTIONS_STORAGE_KEY, JSON.stringify(rules));
}

function expandUnitPrices(
  items: OrderItem[],
  matcher: (product: Product) => boolean
): number[] {
  const prices: number[] = [];
  for (const item of items) {
    if (!matcher(item.product)) continue;
    for (let i = 0; i < item.quantity; i += 1) {
      prices.push(item.product.price);
    }
  }
  return prices;
}

function calculateBanderillasDiscount(items: OrderItem[]): number {
  const unitPrices = expandUnitPrices(items, isBanderillaProduct);
  if (unitPrices.length < 2) return 0;

  unitPrices.sort((a, b) => b - a);
  let discount = 0;

  for (let i = 0; i + 1 < unitPrices.length; i += 2) {
    discount += unitPrices[i + 1] * 0.5;
  }

  return Math.round(discount * 100) / 100;
}

function calculateOrdenesDe6Discount(items: OrderItem[]): number {
  const unitPrices = expandUnitPrices(items, isOrdenDe6Product);
  if (unitPrices.length < 3) return 0;

  unitPrices.sort((a, b) => a - b);
  let discount = 0;

  for (let i = 0; i + 2 < unitPrices.length; i += 3) {
    discount += unitPrices[i];
  }

  return Math.round(discount * 100) / 100;
}

function findTeaProduct(products: Product[]): Product | undefined {
  return (
    products.find(product => isTeaProduct(product) && product.price > 0) ||
    products.find(product => isTeaProduct(product))
  );
}

function buildFreeTeaItems(ramenCount: number, products: Product[]): OrderItem[] {
  const pairs = Math.floor(ramenCount / 2);
  const freeTeaQty = pairs * 2;
  if (freeTeaQty <= 0) return [];

  const teaProduct = findTeaProduct(products);
  if (!teaProduct) return [];

  return [
    {
      product: { ...teaProduct, price: 0 },
      quantity: freeTeaQty,
      comment: 'Promo: 2 té gratis por cada 2 ramen',
    },
  ];
}

export function calculateOrderPricing(
  items: OrderItem[],
  rules: AutoPromotionRule[],
  products: Product[]
): OrderPricingResult {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let autoPromotionDiscount = 0;
  const appliedPromotions: string[] = [];
  const activeRules = new Map(rules.filter(rule => rule.active).map(rule => [rule.id, rule]));

  if (activeRules.has('banderillas_2x1half')) {
    const discount = calculateBanderillasDiscount(items);
    if (discount > 0) {
      autoPromotionDiscount += discount;
      appliedPromotions.push(activeRules.get('banderillas_2x1half')!.name);
    }
  }

  if (activeRules.has('dumplings_3x2')) {
    const discount = calculateOrdenesDe6Discount(items);
    if (discount > 0) {
      autoPromotionDiscount += discount;
      appliedPromotions.push(activeRules.get('dumplings_3x2')!.name);
    }
  }

  let finalItems = [...items];
  if (activeRules.has('ramen_free_tea')) {
    const ramenCount = items.reduce((sum, item) => {
      if (!isRamenProduct(item.product)) return sum;
      return sum + item.quantity;
    }, 0);

    const freeTeaItems = buildFreeTeaItems(ramenCount, products);
    if (freeTeaItems.length > 0) {
      finalItems = [...finalItems, ...freeTeaItems];
      appliedPromotions.push(activeRules.get('ramen_free_tea')!.name);
    }
  }

  autoPromotionDiscount = Math.round(autoPromotionDiscount * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - autoPromotionDiscount) * 100) / 100);

  return {
    items: finalItems,
    subtotal,
    autoPromotionDiscount,
    total,
    appliedPromotions,
  };
}
