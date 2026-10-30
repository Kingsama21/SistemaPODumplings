import type { Order } from '../app/context/AppContext';

/**
 * Una "venta" es una orden cobrada. Las comandas enviadas a cocina desde una mesa
 * (forKitchen) y los deliveries con pago pendiente NO son ventas: el cobro de la
 * mesa genera su propia orden, así que contarlas duplicaría los totales.
 */
export function isSaleOrder(order: Pick<Order, 'status' | 'orderType' | 'forKitchen' | 'paymentPending'>): boolean {
  if (order.status === 'cancelled') return false;
  if (order.paymentPending) return false;
  if (order.orderType === 'delivery') return true;
  return order.forKitchen !== true;
}
