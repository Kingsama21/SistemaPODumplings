/// <reference types="vite/client" />

interface PrintResult {
  ok: boolean;
  status?: string;
  message?: string;
  printerName?: string;
  bytes?: number;
}

interface ElectronAPI {
  isElectron: boolean;
  getPrinters: () => Promise<unknown>;
  getPrinterSettings: () => Promise<unknown>;
  setPrinterSettings: (partial: unknown) => Promise<unknown>;
  getPrintStatus: () => Promise<unknown>;
  printTicket: (order: unknown, options?: unknown) => Promise<PrintResult>;
  printEgreso: (payload: unknown, options?: unknown) => Promise<PrintResult>;
  openCashDrawer: (options?: unknown) => Promise<PrintResult>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
