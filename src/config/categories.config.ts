import type { Product } from '../app/context/AppContext';

/** Categoría solo ramen Buldak (sin dumplings) */
export const RAMEN_BULDAK_SOLO_CATEGORY = 'Ramen Buldak';

/** Categoría combo ramen Buldak + dumplings */
export const RAMEN_BULDAK_COMBO_CATEGORY = 'Ramen Buldak y Dumplings';

/** Nombre viejo del combo (misma categoría, otro nombre) */
export const RAMEN_BULDAK_COMBO_LEGACY_CATEGORY = 'Ramen Carbonara y Dumplings';

/** Nombres viejos de categoría combo → nombre actual */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  [RAMEN_BULDAK_COMBO_LEGACY_CATEGORY]: RAMEN_BULDAK_COMBO_CATEGORY,
};

/** Variantes de nombre que deben mostrarse bajo la misma pestaña del combo */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  [RAMEN_BULDAK_COMBO_CATEGORY]: [
    RAMEN_BULDAK_COMBO_CATEGORY,
    RAMEN_BULDAK_COMBO_LEGACY_CATEGORY,
  ],
};

export function normalizeProductCategory(category: string): string {
  return LEGACY_CATEGORY_MAP[category] ?? category;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isRamenBuldakComboCategory(category: string): boolean {
  const cat = normalizeText(category);
  return (
    cat === normalizeText(RAMEN_BULDAK_COMBO_CATEGORY) ||
    cat === normalizeText(RAMEN_BULDAK_COMBO_LEGACY_CATEGORY)
  );
}

export function isRamenBuldakSoloCategory(category: string): boolean {
  return normalizeText(category) === normalizeText(RAMEN_BULDAK_SOLO_CATEGORY);
}

export function productBelongsToCategory(product: Product, categoryName: string): boolean {
  // Evitar que "Ramen Buldak y Dumplings" muestre productos de "Ramen Buldak" y viceversa
  if (categoryName === RAMEN_BULDAK_SOLO_CATEGORY) {
    return isRamenBuldakSoloCategory(product.category);
  }
  if (categoryName === RAMEN_BULDAK_COMBO_CATEGORY) {
    return isRamenBuldakComboCategory(product.category);
  }

  const aliases = CATEGORY_ALIASES[categoryName];
  if (aliases) {
    return aliases.includes(product.category);
  }
  return product.category === categoryName;
}

export function filterProductsByCategory(products: Product[], categoryName: string): Product[] {
  if (categoryName === 'all') return products;
  return products.filter(product => productBelongsToCategory(product, categoryName));
}
