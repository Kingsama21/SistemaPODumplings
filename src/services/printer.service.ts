import { Order } from '../app/context/AppContext';
import { jsPDF } from 'jspdf';

const ANCHO = 42;
const SEPARADOR = '='.repeat(ANCHO);

/**
 * Genera contenido de ticket
 */
function generarContenidoTicket(order: Order): string {
  const timestamp = new Date(order.timestamp);
  const fecha = timestamp.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const hora = timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const tipoPedido = order.orderType === 'delivery' ? 'DELIVERY' : 'LOCAL';
  let clienteInfo = '';
  if (order.orderType === 'delivery' && order.deliveryInfo) {
    clienteInfo = `Cliente: ${order.deliveryInfo.customerName.substring(0, 25)}\nTel: ${order.deliveryInfo.phone}\n${order.deliveryInfo.address.substring(0, 40)}\n`;
  } else if (order.orderType === 'local' && order.tableNumber) {
    clienteInfo = `Mesa ${order.tableNumber}\n`;
  }

  const metodos: { [key: string]: string } = { cash: 'EFECTIVO', card: 'TARJETA', transfer: 'TRANSFERENCIA' };
  const metodoPago = metodos[order.paymentMethod] || 'EFECTIVO';

  const alinearProducto = (nombre: string, cantidad: number, precio: number): string => {
    const cantidadStr = `${cantidad}x`;
    const precioStr = `$${(precio * cantidad).toFixed(2)}`;
    const nombreCorto = nombre.length > 20 ? nombre.substring(0, 17) + '..' : nombre;
    const espacios = Math.max(1, ANCHO - nombreCorto.length - cantidadStr.length - precioStr.length - 2);
    return nombreCorto + ' '.repeat(espacios) + cantidadStr + ' ' + precioStr;
  };

  const productosTexto = order.items
    .map(item => alinearProducto(item.product.name, item.quantity, item.product.price))
    .join('\n');

  return `${SEPARADOR}
DUMPLINGS DRAGON
${SEPARADOR}
${fecha} ${hora}
${tipoPedido}
${clienteInfo}${SEPARADOR}
${productosTexto}
${SEPARADOR}
TOTAL: $${order.total.toFixed(2)}
${metodoPago}
${SEPARADOR}`;
}

/**
 * Intenta imprimir con QZ Tray
 */
async function imprimirConQZTray(order: Order): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cargar librería qz-tray.js desde QZ Tray local (puerto 8181)
    const script = document.createElement('script');
    script.src = 'http://localhost:8181/qz-tray.js';
    
    script.onload = () => {
      setTimeout(async () => {
        try {
          const qz = (window as any).qz;
          if (!qz) throw new Error('QZ Tray no cargó');

          // Solicitar permisos
          await qz.security.setCertificatePromise(async () => Promise.resolve());
          
          // Conectar
          await qz.websocket.connect();
          console.log('✅ Conectado a QZ Tray');

          // Obtener impresoras
          const impresoras = await qz.printers.find();
          if (!impresoras || impresoras.length === 0) {
            throw new Error('No hay impresoras disponibles');
          }

          // Buscar térmica o usar primera
          let impresora = impresoras.find((p: string) =>
            p.toLowerCase().includes('thermal') || p.toLowerCase().includes('58mm')
          ) || impresoras[0];

          console.log(`🖨️ Usando impresora: ${impresora}`);

          // Generar comandos ESC/POS
          const contenido = generarContenidoTicket(order);
          const ESC = '\x1B';
          let comandos = '';

          comandos += ESC + '@'; // Reset
          comandos += ESC + 'a' + '\x01'; // Centrar
          
          const lineas = contenido.split('\n');
          lineas.forEach(linea => {
            comandos += linea + '\n';
          });
          
          comandos += ESC + 'm'; // Corte de papel

          // Enviar a imprimir
          const config = [{
            type: 'raw',
            format: 'command',
            data: comandos
          }];

          await qz.print(impresora, config);
          await qz.websocket.disconnect();

          console.log('✅ Ticket impreso con QZ Tray');
          resolve();
        } catch (error) {
          console.error('❌ Error con QZ Tray:', error);
          reject(error);
        }
      }, 500);
    };

    script.onerror = () => {
      reject(new Error('No se pudo cargar QZ Tray desde localhost:8282'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Fallback: Imprime con PDF
 */
function imprimirConPDF(order: Order): void {
  const contenido = generarContenidoTicket(order);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, 100]
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  
  const lineas = contenido.split('\n');
  let y = 5;
  lineas.forEach(linea => {
    doc.text(linea, 2, y, { maxWidth: 54 });
    y += 3.5;
  });

  console.log('⚠️ QZ Tray no disponible, usando PDF');
  window.open(doc.output('bloburi'), '_blank');
}

/**
 * Función principal
 */
export function printReceipt(order: Order): void {
  console.log('🖨️ Intentando imprimir ticket...');
  
  imprimirConQZTray(order).catch(() => {
    imprimirConPDF(order);
  });
}
