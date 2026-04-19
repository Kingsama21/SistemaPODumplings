/**
 * Servicio para controlar el cajón de la caja fuerte
 * Utiliza ESC/POS (comandos estándar para impresoras térmicas)
 */

/**
 * Intenta abrir el cajón usando comando ESC/POS
 * Funciona con impresoras térmicas conectadas al navegador vía USB o red
 */
export async function abrirCajon() {
  try {
    console.log('🔓 Intentando abrir cajón...');
    
    // Comando ESC/POS para abrir cajón (pulso de 100ms)
    // ESC p m t1 t2
    // m = tipo de impulso (0 = pin 2, 1 = pin 5)
    // t1, t2 = duración del impulso
    const comandoEscPos = new Uint8Array([
      0x1B,  // ESC
      0x70,  // p
      0x00,  // m (tipo de impulso pin 2)
      0x64,  // t1 (100 ms)
      0x64,  // t2 (100 ms)
    ]);
    
    // Intenta enviar a impresoras Bluetooth o USB conectadas
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
            console.log('✓ Cajón abierto por USB exitosamente');
            return true;
          } catch (error) {
            console.log('No se pudo abrir por USB, probando otro dispositivo...');
          }
        }
      } catch (error) {
        console.log('USB no disponible o sin permisos');
      }
    }
    
    // Intenta enviar a impresora por puerto serie
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
            console.log('✓ Cajón abierto por puerto serie exitosamente');
            return true;
          } catch (error) {
            console.log('No se pudo abrir por puerto serie');
          }
        }
      } catch (error) {
        console.log('Serial API no disponible o sin permisos');
      }
    }
    
    console.log('⚠️ No se pudo abrir el cajón automáticamente');
    console.log('Asegúrate de tener una impresora térmica conectada con soporte ESC/POS');
    
    return false;
  } catch (error) {
    console.error('Error intentando abrir cajón:', error);
    return false;
  }
}

/**
 * Intenta abrir el cajón solicitando permisos de dispositivo al usuario
 * Útil para primera conexión
 */
export async function solicitarYAbrirCajon() {
  try {
    console.log('🔓 Solicitando permisos para abrir cajón...');
    
    if (navigator.usb) {
      try {
        const device = await navigator.usb.requestDevice({
          filters: [
            // Impresoras Epson
            { vendorId: 0x04b8 },
            // Impresoras Star
            { vendorId: 0x0519 },
            // Otros fabricantes comunes
            { vendorId: 0x0426 },
          ]
        });
        
        const comandoEscPos = new Uint8Array([0x1B, 0x70, 0x00, 0x64, 0x64]);
        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        await device.claimInterface(0);
        await device.transferOut(1, comandoEscPos);
        await device.close();
        
        console.log('✓ Cajón abierto exitosamente');
        return true;
      } catch (error) {
        console.log('Error con USB:', error);
      }
    }
    
    if (navigator.serial) {
      try {
        const port = await navigator.serial.requestPort();
        const comandoEscPos = new Uint8Array([0x1B, 0x70, 0x00, 0x64, 0x64]);
        
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(comandoEscPos);
        writer.releaseLock();
        await port.close();
        
        console.log('✓ Cajón abierto exitosamente');
        return true;
      } catch (error) {
        console.log('Error con Serial:', error);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error solicitando permisos:', error);
    return false;
  }
}
