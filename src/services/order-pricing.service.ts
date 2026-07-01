import type { Discount, OrderItem, Product } from '../app/context/AppContext';
import { applyDiscount } from './discount.service';
import {
  calculateOrderPricing,
  type AutoPromotionRule,
  type OrderPricingResult,
} from './auto-promotions.service';

export interface FullOrderPricingResult extends OrderPricingResult {
  manualDiscountAmount: number;
  finalTotal: number;
  manualDiscountApplied?: Discount;
}

export function calculateFullOrderPricing(
  items: OrderItem[],
  autoPromotionRules: AutoPromotionRule[],
  products: Product[],
  manualDiscount?: Discount | null
): FullOrderPricingResult {
  const autoPricing = calculateOrderPricing(items, autoPromotionRules, products);

  if (!manualDiscount) {
    return {
      ...autoPricing,
      manualDiscountAmount: 0,
      finalTotal: autoPricing.total,
    };
  }

  const manualResult = applyDiscount(
    autoPricing.items.filter(item => item.product.price > 0),
    manualDiscount
  );

  const manualDiscountAmount = Math.min(
    manualResult.discountAmount,
    autoPricing.total
  );
  const finalTotal = Math.max(
    0,
    Math.round((autoPricing.total - manualDiscountAmount) * 100) / 100
  );

  return {
    ...autoPricing,
    manualDiscountAmount,
    finalTotal,
    manualDiscountApplied: manualDiscount,
  };
}
