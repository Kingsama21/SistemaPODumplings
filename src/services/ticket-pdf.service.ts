import { jsPDF } from 'jspdf';
import { Order } from '../app/context/AppContext';
import logoImage from '../imports/descargar.png';

const TICKET_WIDTH = 80; // mm (impresora térmica 80 mm)
const MARGIN = 3; // mm
const CONTENT_WIDTH = TICKET_WIDTH - (MARGIN * 2);
const LOGO_WIDTH = 68; // mm (~85% del ancho útil)
const LOGO_HEIGHT = 32; // mm

/** Calcula la altura exacta del ticket antes de crear el PDF (evita recortar después). */
function calcularAlturaTicket(order: Order, withLogo: boolean, measurePdf: jsPDF): number {
  let y = MARGIN;
  const fontSize = 7;

  if (withLogo) y += LOGO_HEIGHT + 4;
  y += 5 + 4 + 3; // encabezado + separador
  y += 4 + 4 + 4; // folio, fecha, tipo

  if (order.orderType === 'local' && order.tableNumber) {
    y += 4;
  } else if (order.orderType === 'delivery' && order.deliveryInfo) {
    y += measurePdf.splitTextToSize(order.deliveryInfo.customerName, CONTENT_WIDTH).length * 3;
    y += 3;
    if (order.deliveryFee && order.deliveryFee > 0) y += 3;
  }

  y += 3; // separador

  order.items.forEach((item, idx) => {
    y += 3;
    const comment = order.itemComments?.[item.product?.id || idx.toString()];
    if (comment) {
      y += measurePdf.splitTextToSize(comment, CONTENT_WIDTH - 2).length * 2 + 1;
    }
  });

  y += 3; // separador
  y += 4; // total

  if (order.amountReceived !== undefined && order.amountReceived > 0) {
    y += 3;
    if (order.change !== undefined) y += 4;
  }

  y += 3; // separador
  y += 4; // método de pago
  y += 3; // separador
  y += 4; // pie

  return Math.max(Math.ceil(y + MARGIN + 2), 40);
}

function calcularAlturaEgreso(descripcion: string, withLogo: boolean, measurePdf: jsPDF): number {
  let y = MARGIN;

  if (withLogo) y += LOGO_HEIGHT + 4;
  y += 5 + 4 + 3; // encabezado + separador
  y += 4 + 3; // fecha + separador
  y += measurePdf.splitTextToSize(descripcion, CONTENT_WIDTH).length * 3 + 2;
  y += 3; // separador
  y += 8; // monto
  y += 3; // separador
  y += 4; // pie

  return Math.max(Math.ceil(y + MARGIN + 2), 40);
}

/**
 * Convierte una imagen a base64 (fetch primero; canvas como respaldo).
 */
async function imagenABase64(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer la imagen'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('No se pudo obtener contexto del canvas'));
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = src;
    });
  }
}

function formatoImagenBase64(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

/**
 * Genera PDF de ticket con ancho 80 mm y altura ajustada al contenido.
 */
export async function generarTicketPDF(order: Order): Promise<jsPDF> {
  let logoBase64: string | null = null;
  try {
    logoBase64 = await imagenABase64(logoImage);
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error);
  }

  const measurePdf = new jsPDF({ unit: 'mm', format: [TICKET_WIDTH, 10] });
  const ticketHeight = calcularAlturaTicket(order, !!logoBase64, measurePdf);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [TICKET_WIDTH, ticketHeight],
  });

  let currentY = MARGIN;
  const fontSize = 7;

  // Función helper para añadir línea separadora
  const addSeparator = () => {
    currentY += 1;
    pdf.setDrawColor(100);
    pdf.line(MARGIN, currentY, TICKET_WIDTH - MARGIN, currentY);
    currentY += 2;
  };

  // LOGO
  if (logoBase64) {
    const logoX = (TICKET_WIDTH - LOGO_WIDTH) / 2;
    pdf.addImage(logoBase64, formatoImagenBase64(logoBase64), logoX, currentY, LOGO_WIDTH, LOGO_HEIGHT);
    currentY += LOGO_HEIGHT + 4;
  }

  // ENCABEZADO
  pdf.setFontSize(fontSize + 2);
  pdf.setFont(undefined, 'bold');
  pdf.text('DUMPLINGS', TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 5;
  
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, 'normal');
  pdf.text('Comanda', TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;
  addSeparator();

  // INFORMACIÓN DEL PEDIDO
  const timestamp = new Date(order.timestamp);
  const fecha = timestamp.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
  const hora = timestamp.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  pdf.setFontSize(fontSize + 1);
  pdf.setFont(undefined, 'bold');
  pdf.text(`#${order.id.slice(-4)}`, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;
  
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, 'normal');
  pdf.text(`${fecha} ${hora}`, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;

  // TIPO DE PEDIDO
  const tipoPedido = order.orderType === 'delivery' ? 'DELIVERY' : 'LOCAL';
  pdf.setFont(undefined, 'bold');
  pdf.text(tipoPedido, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;

  // Info adicional según tipo
  pdf.setFont(undefined, 'normal');
  if (order.orderType === 'local' && order.tableNumber) {
    pdf.text(`Mesa ${order.tableNumber}`, TICKET_WIDTH / 2, currentY, { align: 'center' });
    currentY += 4;
  } else if (order.orderType === 'delivery' && order.deliveryInfo) {
    pdf.setFontSize(6);
    const lines = pdf.splitTextToSize(order.deliveryInfo.customerName, CONTENT_WIDTH);
    lines.forEach((line: string) => {
      pdf.text(line, MARGIN, currentY);
      currentY += 3;
    });
    pdf.text(`Tel: ${order.deliveryInfo.phone}`, MARGIN, currentY);
    currentY += 3;
    
    // Mostrar monto del envío si existe
    if (order.deliveryFee && order.deliveryFee > 0) {
      pdf.setFont(undefined, 'bold');
      pdf.text(`Envío: $${order.deliveryFee.toFixed(2)}`, MARGIN, currentY);
      currentY += 3;
    }
    
    pdf.setFontSize(fontSize);
  }

  addSeparator();

  // PRODUCTOS
  pdf.setFontSize(6);
  order.items.forEach((item, idx) => {
    const total = (item.product.price * item.quantity).toFixed(2);
    const name = item.product.name.substring(0, 28);
    
    pdf.text(`${item.quantity}x ${name}`, MARGIN, currentY);
    pdf.text(`$${total}`, TICKET_WIDTH - MARGIN, currentY, { align: 'right' });
    currentY += 3;
    
    // Mostrar comentario si existe
    const comment = order.itemComments?.[item.product?.id || idx.toString()];
    if (comment) {
      pdf.setFont(undefined, 'italic');
      pdf.setTextColor(200, 100, 0); // Color naranja oscuro
      const commentLines = pdf.splitTextToSize(`📝 ${comment}`, CONTENT_WIDTH - 2);
      pdf.text(commentLines, MARGIN + 2, currentY);
      currentY += (commentLines.length * 2) + 1;
      pdf.setTextColor(0, 0, 0); // Volver a negro
      pdf.setFont(undefined, 'normal');
    }
  });

  pdf.setFontSize(fontSize);
  addSeparator();

  // TOTAL
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL', MARGIN, currentY);
  pdf.text(`$${order.total.toFixed(2)}`, TICKET_WIDTH - MARGIN, currentY, { align: 'right' });
  currentY += 4;

  // PAGO Y CAMBIO (solo si aplica - dine-in con efectivo)
  if (order.amountReceived !== undefined && order.amountReceived > 0) {
    pdf.setFontSize(fontSize - 1);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Recibido: $${order.amountReceived.toFixed(2)}`, MARGIN, currentY);
    currentY += 3;
    
    if (order.change !== undefined) {
      pdf.setFont(undefined, 'bold');
      pdf.text(`Cambio: $${order.change.toFixed(2)}`, MARGIN, currentY);
      currentY += 4;
    }
  }

  addSeparator();

  // MÉTODO DE PAGO
  const metodos: Record<string, string> = { 
    'cash': 'EFECTIVO', 
    'card': 'TARJETA', 
    'transfer': 'TRANSFERENCIA' 
  };
  const metodoPago = metodos[order.paymentMethod] || 'EFECTIVO';
  pdf.text(metodoPago, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;

  addSeparator();

  // PIE
  pdf.setFont(undefined, 'normal');
  pdf.text('¡Gracias!', TICKET_WIDTH / 2, currentY, { align: 'center' });

  return pdf;
}

// La impresión real está centralizada en printing.service.ts (Electron ESC/POS RAW).
export { printTicket as abrirParaImprimirPDF, printEgreso as abrirParaImprimirEgresoPDF } from './printing.service';

/**
 * Genera ticket de egreso/gasto (PDF solo para archivo/vista; no se usa para térmica).
 */
export async function generarTicketEgresoPDF(monto: number, descripcion: string, timestamp: Date = new Date()): Promise<jsPDF> {
  let logoBase64: string | null = null;
  try {
    logoBase64 = await imagenABase64(logoImage);
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error);
  }

  const measurePdf = new jsPDF({ unit: 'mm', format: [TICKET_WIDTH, 10] });
  const ticketHeight = calcularAlturaEgreso(descripcion, !!logoBase64, measurePdf);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [TICKET_WIDTH, ticketHeight],
  });

  let currentY = MARGIN;
  const fontSize = 7;

  // Función helper para línea separadora
  const addSeparator = () => {
    currentY += 1;
    pdf.setDrawColor(100);
    pdf.line(MARGIN, currentY, TICKET_WIDTH - MARGIN, currentY);
    currentY += 2;
  };

  // LOGO
  if (logoBase64) {
    const logoX = (TICKET_WIDTH - LOGO_WIDTH) / 2;
    pdf.addImage(logoBase64, formatoImagenBase64(logoBase64), logoX, currentY, LOGO_WIDTH, LOGO_HEIGHT);
    currentY += LOGO_HEIGHT + 4;
  }

  // ENCABEZADO
  pdf.setFontSize(fontSize + 2);
  pdf.setFont(undefined, 'bold');
  pdf.text('DUMPLINGS', TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 5;
  
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, 'normal');
  pdf.text('EGRESO / GASTO', TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;
  addSeparator();

  // FECHA Y HORA
  const fecha = timestamp.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
  const hora = timestamp.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  pdf.setFontSize(fontSize);
  pdf.text(`${fecha} ${hora}`, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 4;
  addSeparator();

  // DESCRIPCIÓN DEL GASTO
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(8);
  const lineasDescripcion = pdf.splitTextToSize(descripcion, CONTENT_WIDTH);
  lineasDescripcion.forEach((line: string) => {
    pdf.text(line, MARGIN, currentY);
    currentY += 3;
  });
  currentY += 2;

  addSeparator();

  // MONTO
  pdf.setFontSize(fontSize + 4);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(220, 53, 69); // Rojo para egreso
  pdf.text(`-$${monto.toFixed(2)}`, TICKET_WIDTH / 2, currentY, { align: 'center' });
  currentY += 8;
  pdf.setTextColor(0, 0, 0);

  addSeparator();

  // PIE
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, 'normal');
  pdf.text('Comprobante de Egreso', TICKET_WIDTH / 2, currentY, { align: 'center' });

  return pdf;
}
