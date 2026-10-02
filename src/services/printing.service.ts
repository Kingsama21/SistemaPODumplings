import type { Order } from '../app/context/AppContext';
import { toast } from 'sonner';

type PrintResult = {
  ok: boolean;
  status?: string;
  message?: string;
  printerName?: string;
};

type ElectronPrintingAPI = {
  isElectron?: boolean;
  printTicket?: (order: unknown, options?: unknown) => Promise<PrintResult>;
  printEgreso?: (payload: unknown, options?: unknown) => Promise<PrintResult>;
  openCashDrawer?: (options?: unknown) => Promise<PrintResult>;
  getPrinters?: () => Promise<unknown>;
  getPrinterSettings?: () => Promise<unknown>;
  setPrinterSettings?: (partial: unknown) => Promise<unknown>;
  getPrintStatus?: () => Promise<unknown>;
};

let printingLock = false;
const recentTicketIds = new Map<string, number>();
const DEDUPE_MS = 4000;

function getAPI(): ElectronPrintingAPI | undefined {
  return (window as Window & { electronAPI?: ElectronPrintingAPI }).electronAPI;
}

function serializeOrder(order: Order) {
  return {
    id: order.id,
    items: (order.items || []).map((item) => ({
      quantity: item.quantity,
      comment: item.comment,
      product: {
        id: item.product?.id,
        name: item.product?.name,
        price: item.product?.price,
      },
    })),
    total: order.total,
    originalTotal: order.originalTotal,
    discountApplied: order.discountApplied
      ? {
          name: order.discountApplied.name,
          type: order.discountApplied.type,
          value: order.discountApplied.value,
        }
      : undefined,
    timestamp: order.timestamp instanceof Date ? order.timestamp.toISOString() : order.timestamp,
    tableNumber: order.tableNumber,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    amountReceived: order.amountReceived,
    change: order.change,
    tip: order.tip,
    deliveryFee: order.deliveryFee,
    deliveryInfo: order.deliveryInfo,
    itemComments: order.itemComments,
  };
}

function isDuplicateTicket(orderId: string) {
  const now = Date.now();
  const prev = recentTicketIds.get(orderId);
  if (prev && now - prev < DEDUPE_MS) {
    return true;
  }
  recentTicketIds.set(orderId, now);
  // limpieza simple
  for (const [id, ts] of recentTicketIds) {
    if (now - ts > DEDUPE_MS * 3) recentTicketIds.delete(id);
  }
  return false;
}

/**
 * Única entrada de impresión de tickets del POS.
 * En Electron: ESC/POS RAW desde el proceso main.
 */
export async function printTicket(order: Order): Promise<PrintResult> {
  if (!order?.id) {
    const message = 'Pedido inválido para imprimir';
    toast.error(message);
    return { ok: false, message };
  }

  if (printingLock || isDuplicateTicket(order.id)) {
    const message = 'Ya hay una impresión en curso';
    toast.message(message);
    return { ok: false, message };
  }

  const api = getAPI();
  if (!api?.printTicket) {
    const message =
      'La impresión térmica solo está disponible en la app Electron. Abre ISistema Comanda desde el acceso directo.';
    toast.error(message);
    return { ok: false, message };
  }

  printingLock = true;
  const loadingId = toast.loading('Imprimiendo ticket...');

  try {
    const result = await api.printTicket(serializeOrder(order));
    toast.dismiss(loadingId);

    if (result?.ok) {
      toast.success(result.message || 'Ticket impreso correctamente');
      return result;
    }

    const message =
      result?.message ||
      'No se pudo imprimir. Verifica que la impresora esté conectada y seleccionada.';
    toast.error(message);
    return { ok: false, message };
  } catch (error) {
    toast.dismiss(loadingId);
    const message = error instanceof Error ? error.message : 'Error al imprimir ticket';
    toast.error(message);
    return { ok: false, message };
  } finally {
    printingLock = false;
  }
}

export async function printEgreso(monto: number, descripcion: string): Promise<PrintResult> {
  if (printingLock) {
    const message = 'Ya hay una impresión en curso';
    toast.message(message);
    return { ok: false, message };
  }

  const api = getAPI();
  if (!api?.printEgreso) {
    const message = 'La impresión térmica solo está disponible en la app Electron.';
    toast.error(message);
    return { ok: false, message };
  }

  printingLock = true;
  const loadingId = toast.loading('Imprimiendo egreso...');

  try {
    const result = await api.printEgreso({
      monto,
      descripcion,
      timestamp: new Date().toISOString(),
    });
    toast.dismiss(loadingId);

    if (result?.ok) {
      toast.success(result.message || 'Egreso impreso correctamente');
      return result;
    }

    const message = result?.message || 'No se pudo imprimir el egreso';
    toast.error(message);
    return { ok: false, message };
  } catch (error) {
    toast.dismiss(loadingId);
    const message = error instanceof Error ? error.message : 'Error al imprimir egreso';
    toast.error(message);
    return { ok: false, message };
  } finally {
    printingLock = false;
  }
}

export async function openCashDrawer(): Promise<PrintResult> {
  const api = getAPI();
  if (!api?.openCashDrawer) {
    return { ok: false, message: 'Cajón solo disponible en Electron' };
  }
  try {
    return await api.openCashDrawer();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'No se pudo abrir el cajón',
    };
  }
}

/** Compatibilidad con llamadas antiguas */
export async function abrirParaImprimirPDF(order: Order) {
  return printTicket(order);
}

export async function abrirParaImprimirEgresoPDF(monto: number, descripcion: string) {
  return printEgreso(monto, descripcion);
}
