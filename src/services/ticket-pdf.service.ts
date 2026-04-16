import { jsPDF } from 'jspdf';
import { Order } from '../app/context/AppContext';
import logoImage from '../imports/logo.jpeg';

const TICKET_WIDTH = 58; // mm (ancho de ticket térmico)
const TICKET_HEIGHT = 120; // mm (altura suficiente)
const MARGIN = 3; // mm
const CONTENT_WIDTH = TICKET_WIDTH - (MARGIN * 2);

/**
 * Convierte una imagen a base64
 */
async function imagenABase64(src: string): Promise<string> {
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        reject(new Error('No se pudo obtener contexto del canvas'));
      }
    };
    img.onerror = () => reject(new Error('Error al cargar la imagen'));
    img.src = src;
  });
}

/**
 * Genera PDF de ticket con tamaño exacto de ticket térmico (58mm) e imagen
 */
export async function generarTicketPDF(order: Order): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [TICKET_WIDTH, TICKET_HEIGHT],
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
  try {
    const logoBase64 = await imagenABase64(logoImage);
    const logoWidth = 50; // mm
    const logoHeight = 28; // mm
    const logoX = (TICKET_WIDTH - logoWidth) / 2;
    pdf.addImage(logoBase64, 'JPEG', logoX, currentY, logoWidth, logoHeight);
    currentY += logoHeight + 4;
  } catch (error) {
    console.warn('No se pudo cargar el logo:', error);
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
    pdf.setFontSize(fontSize);
  }

  addSeparator();

  // PRODUCTOS
  pdf.setFontSize(6);
  order.items.forEach(item => {
    const total = (item.product.price * item.quantity).toFixed(2);
    const name = item.product.name.substring(0, 20);
    
    pdf.text(`${item.quantity}x ${name}`, MARGIN, currentY);
    pdf.text(`$${total}`, TICKET_WIDTH - MARGIN, currentY, { align: 'right' });
    currentY += 3;
  });

  pdf.setFontSize(fontSize);
  addSeparator();

  // TOTAL
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL', MARGIN, currentY);
  pdf.text(`$${order.total.toFixed(2)}`, TICKET_WIDTH - MARGIN, currentY, { align: 'right' });
  currentY += 5;

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

/**
 * Abre el PDF en visor para imprimir SIN descargar
 */
export async function abrirParaImprimirPDF(order: Order) {
  try {
    console.log('1. Iniciando abrirParaImprimirPDF para orden:', order.id);
    
    const pdf = await generarTicketPDF(order);
    console.log('2. PDF generado exitosamente');
    
    const pdfBlob = pdf.output('blob');
    console.log('3. Blob creado, tamaño:', pdfBlob.size);
    
    const url = URL.createObjectURL(pdfBlob);
    console.log('4. URL creada:', url);
    
    console.log('5. Abriendo ventana...');
    const ventana = window.open(url, '_blank');
    console.log('6. Ventana abierta:', ventana ? 'Éxito' : 'Falló (posible bloqueador)');
    
    if (ventana) {
      setTimeout(() => {
        console.log('7. Abriendo diálogo de impresión...');
        ventana.print();
        console.log('8. Print() llamado');
      }, 800);
    } else {
      console.error('ERROR: ventana.open retornó null - verifica bloqueador de ventanas');
      alert('No se pudo abrir la ventana. Verifica el bloqueador de ventanas emergentes.');
    }
  } catch (error) {
    console.error('ERROR en abrirParaImprimirPDF:', error);
    console.error('Stack:', (error as Error).stack);
  }
}
