const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('printing:get-printers'),
  getPrinterSettings: () => ipcRenderer.invoke('printing:get-settings'),
  setPrinterSettings: (partial) => ipcRenderer.invoke('printing:set-settings', partial),
  getPrintStatus: () => ipcRenderer.invoke('printing:get-status'),
  printTicket: (order, options) => ipcRenderer.invoke('printing:print-ticket', order, options),
  printEgreso: (payload, options) => ipcRenderer.invoke('printing:print-egreso', payload, options),
  openCashDrawer: (options) => ipcRenderer.invoke('printing:open-drawer', options),
});
