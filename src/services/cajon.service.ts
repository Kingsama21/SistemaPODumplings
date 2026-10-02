import { openCashDrawer as openCashDrawerElectron } from './printing.service';

/**
 * Abre el cajón. En Electron usa ESC/POS RAW por la impresora térmica.
 * En navegador intenta WebUSB/Serial como respaldo.
 */
export async function abrirCajon() {
  try {
    const electronResult = await openCashDrawerElectron();
    if (electronResult.ok) {
      console.log('✓ Cajón abierto vía Electron/ESC-POS');
      return true;
    }
  } catch (error) {
    console.log('Electron cajón no disponible, intentando APIs web...', error);
  }

  try {
    console.log('🔓 Intentando abrir cajón (WebUSB/Serial)...');

    const comandoEscPos = new Uint8Array([0x1b, 0x70, 0x00, 0x32, 0x32]);

    if (navigator.usb) {
      try {
        const devices = await navigator.usb.getDevices();
        for (const device of devices) {
          try {
            await device.open();
            if (device.configuration === null) {
              await device.selectConfiguration(1);
            }
            await device.claimInterface(0);
            await device.transferOut(1, comandoEscPos);
            await device.close();
            console.log('✓ Cajón abierto por USB');
            return true;
          } catch {
            // siguiente dispositivo
          }
        }
      } catch {
        // ignore
      }
    }

    if (navigator.serial) {
      try {
        const ports = await navigator.serial.getPorts();
        for (const port of ports) {
          try {
            await port.open({ baudRate: 9600 });
            const writer = port.writable.getWriter();
            await writer.write(comandoEscPos);
            writer.releaseLock();
            await port.close();
            console.log('✓ Cajón abierto por Serial');
            return true;
          } catch {
            // siguiente puerto
          }
        }
      } catch {
        // ignore
      }
    }

    console.log('⚠️ No se pudo abrir el cajón automáticamente');
    return false;
  } catch (error) {
    console.error('Error intentando abrir cajón:', error);
    return false;
  }
}

export async function solicitarYAbrirCajon() {
  return abrirCajon();
}
