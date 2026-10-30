import { app, BrowserWindow, shell, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.js';
import { getLocalIPv4Addresses } from '../network-urls.mjs';
import {
  getPrinters,
  getPrinterSettings,
  getPrintStatus,
  openCashDrawer,
  printEgresoTicket,
  printOrderTicket,
  setPrinterSettings,
} from './printing/printing-service.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.ELECTRON_PORT) || 5173;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let kitchenWindow = null;
/** @type {import('http').Server | null} */
let httpServer = null;

function resolveStaticDir() {
  return path.join(app.getAppPath(), 'dist');
}

function resolveDataFile() {
  const userDataDir = app.getPath('userData');
  const target = path.join(userDataDir, 'data.json');

  if (!fs.existsSync(target)) {
    const candidates = [
      path.join(process.resourcesPath, 'data.json'),
      path.join(__dirname, '..', 'data.json'),
    ];
    for (const seed of candidates) {
      if (fs.existsSync(seed)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        fs.copyFileSync(seed, target);
        break;
      }
    }
  }

  return target;
}

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(process.resourcesPath, 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function createWindow() {
  const icon = resolveAppIcon();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'ISistema Comanda - Dumplings',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (process.env.ELECTRON_DEV === '1') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const startUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${PORT}`;
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Ventana de cocina: misma app (comparte sesión, Firestore y caché), solo una ventana más.
 * Si hay un segundo monitor/TV conectado se abre ahí a pantalla completa.
 */
function openKitchenWindow() {
  if (kitchenWindow && !kitchenWindow.isDestroyed()) {
    if (kitchenWindow.isMinimized()) kitchenWindow.restore();
    kitchenWindow.focus();
    return { reused: true, externalDisplay: false };
  }

  const mainBounds = mainWindow?.getBounds();
  const primaryId = mainBounds
    ? screen.getDisplayMatching(mainBounds).id
    : screen.getPrimaryDisplay().id;
  const external = screen.getAllDisplays().find((d) => d.id !== primaryId);
  const icon = resolveAppIcon();

  kitchenWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    ...(external ? { x: external.bounds.x, y: external.bounds.y } : {}),
    autoHideMenuBar: true,
    title: 'Cocina - Dumplings',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (external) kitchenWindow.setFullScreen(true);

  const baseUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${PORT}`;
  kitchenWindow.loadURL(`${baseUrl}/cocina`);
  kitchenWindow.on('closed', () => {
    kitchenWindow = null;
  });

  return { reused: false, externalDisplay: Boolean(external) };
}

async function waitForHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // reintentar
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`El servidor no respondió a tiempo: ${url}`);
}

async function boot() {
  const usingExternalUrl = Boolean(process.env.ELECTRON_START_URL);

  if (!usingExternalUrl) {
    const staticDir = resolveStaticDir();
    if (!fs.existsSync(staticDir)) {
      throw new Error(
        `No se encontró el frontend en "${staticDir}". Ejecuta "pnpm build" antes de abrir Electron.`
      );
    }

    httpServer = await startServer({
      port: PORT,
      host: '0.0.0.0',
      dataFile: resolveDataFile(),
      staticDir,
      printNetwork: true,
    });

    await waitForHealth(`http://127.0.0.1:${PORT}/api/health`);
  }

  createWindow();
}

function registerNetworkIpc() {
  ipcMain.handle('kitchen:open', async () => openKitchenWindow());
  // URLs que los meseros abren en su celular (misma red WiFi)
  ipcMain.handle('network:get-urls', async () =>
    getLocalIPv4Addresses().map((ip) => `http://${ip}:${PORT}/login`)
  );
}

function registerPrintingIpc() {
  ipcMain.handle('printing:get-printers', async () => getPrinters());
  ipcMain.handle('printing:get-settings', async () => getPrinterSettings());
  ipcMain.handle('printing:set-settings', async (_event, partial) => setPrinterSettings(partial || {}));
  ipcMain.handle('printing:get-status', async () => getPrintStatus());
  ipcMain.handle('printing:print-ticket', async (_event, order, options) => {
    try {
      return await printOrderTicket(order, options || {});
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error?.message || 'No se pudo imprimir el ticket',
      };
    }
  });
  ipcMain.handle('printing:print-egreso', async (_event, payload, options) => {
    try {
      return await printEgresoTicket(payload, options || {});
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error?.message || 'No se pudo imprimir el egreso',
      };
    }
  });
  ipcMain.handle('printing:open-drawer', async (_event, options) => {
    try {
      return await openCashDrawer(options || {});
    } catch (error) {
      return {
        ok: false,
        status: 'error',
        message: error?.message || 'No se pudo abrir el cajón',
      };
    }
  });
}

// Una sola ventana: si abren el programa dos veces, se trae al frente la que ya está abierta
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  registerPrintingIpc();
  registerNetworkIpc();
  boot().catch((err) => {
    console.error('Error al iniciar Electron:', err);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
});
