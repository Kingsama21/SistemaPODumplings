import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Lista impresoras instaladas en Windows.
 */
export async function listWindowsPrinters() {
  if (process.platform !== 'win32') {
    return [];
  }

  const script = `
$ErrorActionPreference = 'Stop'
Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus |
  ConvertTo-Json -Compress
`;

  const stdout = await runPowershell(script);
  if (!stdout.trim()) return [];

  try {
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((p) => p && p.Name)
      .map((p) => ({
        name: String(p.Name),
        driverName: p.DriverName ? String(p.DriverName) : '',
        portName: p.PortName ? String(p.PortName) : '',
        status: p.PrinterStatus != null ? String(p.PrinterStatus) : '',
      }));
  } catch (error) {
    console.error('[printing] No se pudo parsear lista de impresoras:', error);
    return [];
  }
}

/**
 * Envía bytes RAW (ESC/POS) a una impresora de Windows vía winspool.
 * Evita GDI/PDF, que en térmicas produce papel blanco / basura / avance infinito.
 */
export async function sendRawToWindowsPrinter(printerName, data) {
  if (process.platform !== 'win32') {
    throw new Error('La impresión RAW solo está soportada en Windows');
  }
  if (!printerName || typeof printerName !== 'string') {
    throw new Error('Nombre de impresora inválido');
  }
  if (!data || !(data instanceof Uint8Array || Buffer.isBuffer(data))) {
    throw new Error('Datos de impresión inválidos');
  }

  const tmpFile = path.join(os.tmpdir(), `escpos-${Date.now()}-${Math.random().toString(16).slice(2)}.bin`);
  fs.writeFileSync(tmpFile, Buffer.from(data));

  const safePrinter = printerName.replace(/'/g, "''");
  const safePath = tmpFile.replace(/'/g, "''");

  const script = `
$ErrorActionPreference = 'Stop'
$printerName = '${safePrinter}'
$filePath = '${safePath}'

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName.Normalize(), out hPrinter, IntPtr.Zero)) {
      throw new Exception("OpenPrinter failed. Win32=" + Marshal.GetLastWin32Error());
    }
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "ISistema Comanda Ticket";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di)) {
        throw new Exception("StartDocPrinter failed. Win32=" + Marshal.GetLastWin32Error());
      }
      try {
        if (!StartPagePrinter(hPrinter)) {
          throw new Exception("StartPagePrinter failed. Win32=" + Marshal.GetLastWin32Error());
        }
        try {
          IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
          try {
            Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
            int written;
            if (!WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written)) {
              throw new Exception("WritePrinter failed. Win32=" + Marshal.GetLastWin32Error());
            }
            if (written != bytes.Length) {
              throw new Exception("WritePrinter incomplete: " + written + "/" + bytes.Length);
            }
          } finally {
            Marshal.FreeCoTaskMem(pUnmanagedBytes);
          }
        } finally {
          EndPagePrinter(hPrinter);
        }
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($filePath)
[RawPrinterHelper]::SendBytes($printerName, $bytes)
Write-Output 'OK'
`;

  try {
    const out = await runPowershell(script, 45000);
    if (!String(out).includes('OK')) {
      throw new Error(`La impresora no confirmó el trabajo RAW. Salida: ${out}`);
    }
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}

function runPowershell(script, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true }
    );

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Timeout ejecutando PowerShell de impresión'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `PowerShell salió con código ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}
