import type { Product } from '../app/context/AppContext';
import {
  isRamenBuldakComboCategory,
  isRamenBuldakSoloCategory,
  RAMEN_BULDAK_COMBO_CATEGORY,
} from './categories.config';

export const BULDAK_FLAVORS = [
  'Original',
  'Spicy',
  'Carbonara',
  'Cheese',
  'Habanero Limón',
] as const;

/** Tipos de dumpling del restaurante */
export const DUMPLING_TYPES = [
  'Verduras',
  'Vegphi',
  'Res',
  'Lasagñoso',
  'Camaron',
  'Camphi',
] as const;

export type BuldakFlavor = (typeof BULDAK_FLAVORS)[number];
export type DumplingType = (typeof DUMPLING_TYPES)[number];

export interface OrderItemVariants {
  buldakFlavor?: BuldakFlavor;
  dumplingType?: DumplingType;
}

export interface StockDeduction {
  stockKey: string;
  quantity: number;
}

export const DEFAULT_SELLABLE_STOCK_ITEMS = [
  ...BULDAK_FLAVORS.map(flavor => ({ name: `Buldak ${flavor}`, unit: 'pza', stock: 20, minStock: 5 })),
  ...DUMPLING_TYPES.map(type => ({ name: `Dumpling ${type}`, unit: 'pza', stock: 30, minStock: 10 })),
  { name: 'Banderilla Coreana', unit: 'pza', stock: 40, minStock: 10 },
  { name: 'Ramen Buldak', unit: 'pza', stock: 25, minStock: 8 },
  { name: 'Té Oloong', unit: 'pza', stock: 30, minStock: 10 },
  { name: 'Té Verde', unit: 'pza', stock: 30, minStock: 10 },
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Combo: categoría "Ramen Buldak y Dumplings" (NO "Ramen Buldak" solo) */
export function isRamenBuldakCombo(product: Product): boolean {
  return isRamenBuldakComboCategory(product.category);
}

/** Solo ramen Buldak, sin dumplings — categoría "Ramen Buldak" */
export function isRamenBuldakSolo(product: Product): boolean {
  return isRamenBuldakSoloCategory(product.category);
}

export function isOrdenDe6Product(product: Product): boolean {
  const category = normalizeText(product.category);
  const name = normalizeText(product.name);
  return (
    category.includes('ordenes de 6') ||
    category.includes('orden de 6') ||
    name.includes('orden de 6') ||
    name.includes('ordenes de 6')
  );
}

export function isBanderillaProduct(product: Product): boolean {
  const text = `${product.name} ${product.category}`;
  return normalizeText(text).includes('banderilla');
}

export function isDumplingProduct(product: Product): boolean {
  if (isRamenBuldakCombo(product) || isOrdenDe6Product(product)) return false;
  const category = normalizeText(product.category);
  const name = normalizeText(product.name);
  return category.includes('dumpling') || name.includes('dumpling');
}

/** Cuenta para promo de té gratis (ramen solo o combo, no otras categorías Buldak) */
export function isRamenProduct(product: Product): boolean {
  if (isRamenBuldakSolo(product) || isRamenBuldakCombo(product)) return true;
  return normalizeText(product.category) === normalizeText('Ramen');
}

export function isTeaProduct(product: Product): boolean {
  const text = normalizeText(`${product.name} ${product.category}`);
  return (
    text.includes('oolong') ||
    text.includes('oloong') ||
    text.includes('te verde') ||
    text.includes('te oloong') ||
    text.includes('te oloong botella') ||
    /\bte\b/.test(text)
  );
}

export function parseDumplingTypeFromName(name: string): DumplingType | undefined {
  const normalized = normalizeText(name);
  const sortedTypes = [...DUMPLING_TYPES].sort(
    (a, b) => normalizeText(b).length - normalizeText(a).length
  );

  return sortedTypes.find(type => normalized.includes(normalizeText(type)));
}

export function parseBuldakFlavorFromName(name: string): BuldakFlavor | undefined {
  const normalized = normalizeText(name);
  const sortedFlavors = [...BULDAK_FLAVORS].sort(
    (a, b) => normalizeText(b).length - normalizeText(a).length
  );

  return sortedFlavors.find(flavor => normalized.includes(normalizeText(flavor)));
}

/** Selector de sabor + dumpling: solo en categoría combo */
export function needsComboVariantSelector(product: Product): boolean {
  if (!isRamenBuldakCombo(product)) return false;
  return !parseDumplingTypeFromName(product.name) || !parseBuldakFlavorFromName(product.name);
}

export function buildVariantComment(variants?: OrderItemVariants): string | undefined {
  if (!variants?.buldakFlavor && !variants?.dumplingType) return undefined;
  const parts: string[] = [];
  if (variants.buldakFlavor) parts.push(`Buldak: ${variants.buldakFlavor}`);
  if (variants.dumplingType) parts.push(`Dumpling: ${variants.dumplingType}`);
  return parts.join(' | ');
}

export function resolveStockDeductions(
  product: Product,
  quantity: number,
  variants?: OrderItemVariants
): StockDeduction[] {
  // Combo: ramen + sabor buldak + tipo dumpling
  if (isRamenBuldakCombo(product)) {
    const deductions: StockDeduction[] = [{ stockKey: 'Ramen Buldak', quantity }];
    const buldakFlavor = variants?.buldakFlavor ?? parseBuldakFlavorFromName(product.name);
    const dumplingType = variants?.dumplingType ?? parseDumplingTypeFromName(product.name);

    if (buldakFlavor) {
      deductions.push({ stockKey: `Buldak ${buldakFlavor}`, quantity });
    }
    if (dumplingType) {
      deductions.push({ stockKey: `Dumpling ${dumplingType}`, quantity });
    }
    return deductions;
  }

  // Ramen Buldak solo: ramen + sabor (sin dumpling)
  if (isRamenBuldakSolo(product)) {
    const deductions: StockDeduction[] = [{ stockKey: 'Ramen Buldak', quantity }];
    const buldakFlavor = variants?.buldakFlavor ?? parseBuldakFlavorFromName(product.name);
    if (buldakFlavor) {
      deductions.push({ stockKey: `Buldak ${buldakFlavor}`, quantity });
    }
    return deductions;
  }

  if (isOrdenDe6Product(product)) {
    const dumplingType = parseDumplingTypeFromName(product.name);
    if (dumplingType) {
      return [{ stockKey: `Dumpling ${dumplingType}`, quantity: quantity * 6 }];
    }
  }

  if (isDumplingProduct(product)) {
    const matchedType = parseDumplingTypeFromName(product.name);
    if (matchedType) {
      return [{ stockKey: `Dumpling ${matchedType}`, quantity }];
    }
  }

  if (isBanderillaProduct(product)) {
    return [{ stockKey: 'Banderilla Coreana', quantity }];
  }

  if (isTeaProduct(product)) {
    if (normalizeText(product.name).includes('oolong') || normalizeText(product.name).includes('oloong')) {
      return [{ stockKey: 'Té Oloong', quantity }];
    }
    return [{ stockKey: 'Té Verde', quantity }];
  }

  if (isRamenProduct(product)) {
    return [{ stockKey: 'Ramen Buldak', quantity }];
  }

  return [{ stockKey: product.name, quantity }];
}

// Re-export for UI labels
export { RAMEN_BULDAK_COMBO_CATEGORY };
