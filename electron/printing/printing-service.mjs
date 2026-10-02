import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import {
  buildEgresoTicketBytes,
  buildOpenDrawerBytes,
  buildOrderTicketBytes,
  scoreThermalPrinterName,
} from './escpos-builder.mjs';
import { listWindowsPrinters, sendRawToWindowsPrinter } from './windows-raw-print.mjs';

const DEFAULT_SETTINGS = {
  printerName: '',
  paperWidthMm: 80,
  openDrawer: true,
  cut: true,
};

/** @type {'idle' | 'printing' | 'success' | 'error'} */
let status = 'idle';
let lastError = null;
let chain = Promise.resolve();
let busy = false;

function settingsPath() {
  return path.join(app.getPath('userData'), 'printer-settings.json');
}

export function getPrinterSettings() {
  try {
    const file = settingsPath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        paperWidthMm: parsed.paperWidthMm === 58 ? 58 : 80,
      };
    }
  } catch (error) {
    console.error('[printing] Error leyendo settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function setPrinterSettings(partial = {}) {
  const current = getPrinterSettings();
  const next = {
    ...current,
    ...partial,
    paperWidthMm: partial.paperWidthMm === 58 ? 58 : current.paperWidthMm === 58 ? 58 : 80,
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function getPrintStatus() {
  return { status, lastError, busy };
}

async function resolvePrinterName(explicitName) {
  const settings = getPrinterSettings();
  const printers = await listWindowsPrinters();
  if (!printers.length) {
    throw new Error('No hay impresoras instaladas en Windows');
  }

  const wanted = (explicitName || settings.printerName || '').trim();
  if (wanted) {
    const exact = printers.find((p) => p.name === wanted);
    if (!exact) {
      throw new Error(`La impresora configurada no está disponible: "${wanted}"`);
    }
    return exact.name;
  }

  const ranked = [...printers].sort(
    (a, b) => scoreThermalPrinterName(b.name) - scoreThermalPrinterName(a.name)
  );
  const best = ranked[0];
  if (scoreThermalPrinterName(best.name) <= 0) {
    // No parece térmica, pero usamos la primera y avisamos en log
    console.warn('[printing] No se detectó impresora térmica por nombre. Usando:', best.name);
  }

  // Persistir selección automática para siguientes tickets
  setPrinterSettings({ printerName: best.name });
  return best.name;
}

function enqueue(job) {
  const run = chain.then(async () => {
    if (busy) {
      throw new Error('Ya hay una impresión en curso. Espera a que termine.');
    }
    busy = true;
    status = 'printing';
    lastError = null;
    try {
      const result = await job();
      status = 'success';
      return result;
    } catch (error) {
      status = 'error';
      lastError = error?.message || String(error);
      console.error('[printing] Error:', error);
      throw error;
    } finally {
      busy = false;
    }
  });

  // Evitar unhandled rejection en la cadena
  chain = run.catch(() => {});
  return run;
}

export async function getPrinters() {
  const printers = await listWindowsPrinters();
  const settings = getPrinterSettings();
  return {
    printers,
    settings,
    status: getPrintStatus(),
  };
}

export function printOrderTicket(order, options = {}) {
  return enqueue(async () => {
    if (!order || !order.id) {
      throw new Error('Pedido inválido para imprimir');
    }

    const settings = getPrinterSettings();
    const printerName = await resolvePrinterName(options.printerName);
    const bytes = buildOrderTicketBytes(order, {
      paperWidthMm: options.paperWidthMm || settings.paperWidthMm,
      openDrawer: options.openDrawer ?? settings.openDrawer,
      cut: options.cut ?? settings.cut,
    });

    console.log(`[printing] Enviando ticket #${String(order.id).slice(-4)} RAW (${bytes.length} bytes) -> "${printerName}"`);
    await sendRawToWindowsPrinter(printerName, bytes);

    return {
      ok: true,
      printerName,
      bytes: bytes.length,
      status: 'success',
      message: 'Ticket impreso correctamente',
    };
  });
}

export function printEgresoTicket(payload, options = {}) {
  return enqueue(async () => {
    const settings = getPrinterSettings();
    const printerName = await resolvePrinterName(options.printerName);
    const bytes = buildEgresoTicketBytes(payload, {
      paperWidthMm: options.paperWidthMm || settings.paperWidthMm,
      openDrawer: options.openDrawer ?? settings.openDrawer,
      cut: options.cut ?? settings.cut,
    });

    console.log(`[printing] Enviando egreso RAW (${bytes.length} bytes) -> "${printerName}"`);
    await sendRawToWindowsPrinter(printerName, bytes);

    return {
      ok: true,
      printerName,
      bytes: bytes.length,
      status: 'success',
      message: 'Egreso impreso correctamente',
    };
  });
}

export function openCashDrawer(options = {}) {
  return enqueue(async () => {
    const printerName = await resolvePrinterName(options.printerName);
    const bytes = buildOpenDrawerBytes();
    await sendRawToWindowsPrinter(printerName, bytes);
    return { ok: true, printerName, message: 'Cajón abierto' };
  });
}
