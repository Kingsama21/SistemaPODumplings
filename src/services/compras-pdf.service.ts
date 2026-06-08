import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Compra } from '../app/context/AppContext';

export const generarPDFCompras = (compras: Compra[]): jsPDF.jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Estilo de colores
  const primaryColor = [255, 102, 30]; // Naranja
  const darkColor = [30, 30, 30]; // Gris oscuro
  const lightGray = [245, 245, 245];

  // Header/Título
  doc.setFontSize(26);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('DUMPLINGS DEL DRAGÓN', pageWidth / 2, 20, { align: 'center' });

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('RETRIBUCIÓN DE INVENTARIO', pageWidth / 2, 28, { align: 'center' });

  // Línea decorativa
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 32, pageWidth - 20, 32);

  // Fecha de generación
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  const fechaGen = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.text(`Fecha de Generación: ${fechaGen}`, pageWidth / 2, 38, { align: 'center' });

  // Tabla de compras
  const tableData = compras.map((compra) => [
    new Date(compra.fecha).toLocaleDateString('es-MX'),
    compra.descripcion,
    compra.cantidad.toFixed(2),
    compra.unidad,
    `$${compra.precioUnitario.toFixed(2)}`,
    compra.proveedor || '—',
    `$${compra.total.toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [['Fecha', 'Descripción', 'Cant.', 'Unidad', 'Precio Unit.', 'Proveedor', 'Total']],
    body: tableData,
    startY: 45,
    margin: { left: 15, right: 15 },
    styles: {
      font: 'helvetica',
      cellPadding: 4,
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
      textColor: darkColor
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      lineColor: primaryColor,
      lineWidth: 1
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      lineColor: [220, 220, 220],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 20 }
    },
    didDrawPage: () => {
      // Footer en cada página
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont(undefined, 'normal');
      const pageNumber = (doc as any).internal.pages.length - 1;
      doc.text(
        `Página ${pageNumber} | Sistema Comanda`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // Línea separadora en footer
      doc.setDrawColor(220, 220, 220);
      doc.line(20, pageHeight - 10, pageWidth - 20, pageHeight - 10);
    }
  });

  // Espacio después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Sección de totales
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.line(pageWidth - 75, finalY, pageWidth - 15, finalY);

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  
  const totalGeneral = compras.reduce((sum, c) => sum + c.total, 0);
  doc.text(`TOTAL COMPRAS:`, pageWidth - 75, finalY + 8);
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${totalGeneral.toFixed(2)}`, pageWidth - 15, finalY + 8, { align: 'right' });

  // Información adicional
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont(undefined, 'normal');
  doc.text(
    `Este documento fue generado automáticamente por Sistema Comanda el ${new Date().toLocaleString('es-MX')}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  return doc;
};

export const descargarPDFCompras = (compras: Compra[], nombreArchivo: string = 'retribucion-inventario.pdf') => {
  try {
    if (!compras || compras.length === 0) {
      console.error('No hay compras para generar PDF');
      alert('No hay compras para descargar');
      return;
    }

    console.log('Generando PDF con', compras.length, 'compras');
    const doc = generarPDFCompras(compras);
    console.log('PDF generado correctamente');
    doc.save(nombreArchivo);
    console.log('PDF descargado:', nombreArchivo);
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    alert('Error al generar el PDF. Revisa la consola para más detalles.');
  }
};
