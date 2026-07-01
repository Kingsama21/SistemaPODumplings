import type { Discount } from '../app/context/AppContext';

export interface DiscountableItem {
  product: { id: string; price: number };
  quantity: number;
}

export interface DiscountResult {
  subtotal: number;
  discountAmount: number;
  total: number;
  discountApplied: Discount;
}

export function getItemsSubtotal(items: DiscountableItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

export function applyDiscount(items: DiscountableItem[], discount: Discount): DiscountResult {
  const subtotal = getItemsSubtotal(items);
  let discountAmount = 0;
  const applicable = discount.applicableTo || 'all';

  if (applicable === 'product' && discount.targetId) {
    const itemSubtotal = items
      .filter(item => item.product.id === discount.targetId)
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    discountAmount =
      discount.type === 'percentage'
        ? itemSubtotal * (discount.value / 100)
        : Math.min(discount.value, itemSubtotal);
  } else {
    discountAmount =
      discount.type === 'percentage'
        ? subtotal * (discount.value / 100)
        : Math.min(discount.value, subtotal);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  return { subtotal, discountAmount, total, discountApplied: discount };
}

export function applyManualDiscountToTotal(
  startingTotal: number,
  discount: Discount
): { discountAmount: number; total: number; discountApplied: Discount } {
  const discountAmount =
    discount.type === 'percentage'
      ? Math.round(startingTotal * (discount.value / 100) * 100) / 100
      : Math.min(discount.value, startingTotal);

  const total = Math.max(0, Math.round((startingTotal - discountAmount) * 100) / 100);

  return { discountAmount, total, discountApplied: discount };
}

export function formatDiscountLabel(discount: Discount): string {
  return discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`;
}
