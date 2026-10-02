import { Order } from '../app/context/AppContext';
import { printTicket } from './printing.service';

/**
 * Legacy entrypoint. Toda la impresión real ocurre en Electron (ESC/POS RAW).
 */
export function printReceipt(order: Order): void {
  void printTicket(order);
}
