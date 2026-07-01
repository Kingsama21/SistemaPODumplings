import type { Ingredient, OrderItem } from '../app/context/AppContext';
import {
  DEFAULT_SELLABLE_STOCK_ITEMS,
  resolveStockDeductions,
  type StockDeduction,
} from '../config/inventory.config';

export function ensureSellableStockItems(ingredients: Ingredient[]): Ingredient[] {
  const existingNames = new Set(ingredients.map(item => item.name.toLowerCase()));
  const missing = DEFAULT_SELLABLE_STOCK_ITEMS.filter(
    item => !existingNames.has(item.name.toLowerCase())
  );

  if (missing.length === 0) return ingredients;

  const additions: Ingredient[] = missing.map((item, index) => ({
    id: `ing_stock_${Date.now()}_${index}`,
    name: item.name,
    stock: item.stock,
    unit: item.unit,
    minStock: item.minStock,
    lastRestockedAt: new Date(),
  }));

  return [...ingredients, ...additions];
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function findIngredientForStockKey(
  stockKey: string,
  ingredients: Ingredient[]
): Ingredient | undefined {
  const target = normalizeText(stockKey);

  return ingredients.find(ingredient => {
    const name = normalizeText(ingredient.name);
    return name === target || name.includes(target) || target.includes(name);
  });
}

export function collectStockDeductions(items: OrderItem[]): StockDeduction[] {
  const totals = new Map<string, number>();

  for (const item of items) {
    const deductions = resolveStockDeductions(item.product, item.quantity, item.variants);
    for (const deduction of deductions) {
      totals.set(deduction.stockKey, (totals.get(deduction.stockKey) ?? 0) + deduction.quantity);
    }
  }

  return [...totals.entries()].map(([stockKey, quantity]) => ({ stockKey, quantity }));
}

export function applyStockDeductions(
  ingredients: Ingredient[],
  deductions: StockDeduction[]
): { updated: Ingredient[]; missing: string[] } {
  const missing: string[] = [];
  const updated = ingredients.map(ingredient => ({ ...ingredient }));

  for (const deduction of deductions) {
    const ingredient = findIngredientForStockKey(deduction.stockKey, updated);
    if (!ingredient) {
      missing.push(deduction.stockKey);
      continue;
    }

    ingredient.stock = Math.max(0, ingredient.stock - deduction.quantity);
    ingredient.lastRestockedAt = new Date();
  }

  return { updated, missing };
}
