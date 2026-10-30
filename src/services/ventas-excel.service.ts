import type { Order, CashTransaction, Compra } from '../app/context/AppContext';
import { isSaleOrder } from './sales';

const METHOD_LABEL: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
const MONEY = '"$"#,##0.00';

const sameDay = (value: Date | string, day: Date) => {
  const d = new Date(value);
  return (
    d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate()
  );
};

/** "YYYY-MM-DD" → Date local (evita el desfase de zona horaria de new Date('YYYY-MM-DD')). */
export function parseDay(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface ExportData {
  day: Date;
  orders: Order[];
  cashTransactions: CashTransaction[];
  compras: Compra[];
}

/**
 * Genera y descarga un .xlsx con las ventas, el resumen de caja y las compras de un día.
 * exceljs se carga bajo demanda para no engordar el arranque de la app.
 */
export async function descargarExcelVentasDia({ day, orders, cashTransactions, compras }: ExportData) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ISistema Comanda';

  const sales = orders
    .filter(o => isSaleOrder(o) && sameDay(o.timestamp, day))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const dayTx = cashTransactions.filter(t => sameDay(t.timestamp, day));
  const dayCompras = compras.filter(c => sameDay(c.fecha, day));

  const styleHeader = (ws: import('exceljs').Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  // ---- Ventas ----
  const ws = wb.addWorksheet('Ventas');
  ws.columns = [
    { header: 'Hora', key: 'hora', width: 9 },
    { header: 'Folio', key: 'folio', width: 12 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Productos', key: 'productos', width: 60 },
    { header: 'Método de pago', key: 'metodo', width: 16 },
    { header: 'Propina', key: 'propina', width: 12, style: { numFmt: MONEY } },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } },
  ];
  styleHeader(ws);
  sales.forEach(o => {
    ws.addRow({
      hora: new Date(o.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      folio: o.id.slice(-6).toUpperCase(),
      tipo: o.orderType === 'delivery' ? 'Delivery' : `Mesa ${o.tableNumber ?? ''}`.trim(),
      productos: o.items.map(i => `${i.quantity}x ${i.product.name}`).join(', '),
      metodo: METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
      propina: o.tip ?? 0,
      total: o.total,
    });
  });
  const last = sales.length + 1;
  const totalRow = ws.addRow({
    productos: 'TOTAL DEL DÍA',
    propina: { formula: `SUM(F2:F${Math.max(last, 2)})` },
    total: { formula: `SUM(G2:G${Math.max(last, 2)})` },
  });
  totalRow.font = { bold: true };

  // ---- Resumen ----
  const incomeBy = (method: string) =>
    dayTx.filter(t => t.type === 'income' && t.paymentMethod === method).reduce((s, t) => s + t.amount, 0);
  const cash = incomeBy('cash');
  const card = incomeBy('card');
  const transfer = incomeBy('transfer');
  const expenses = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const tips = dayTx.filter(t => t.type === 'tip').reduce((s, t) => s + t.amount, 0);
  const cashTips = dayTx
    .filter(t => t.type === 'tip' && (t.paymentMethod ?? 'cash') === 'cash')
    .reduce((s, t) => s + t.amount, 0);

  const rs = wb.addWorksheet('Resumen');
  rs.columns = [
    { header: 'Concepto', key: 'c', width: 38 },
    { header: 'Monto', key: 'm', width: 16, style: { numFmt: MONEY } },
  ];
  styleHeader(rs);
  rs.addRows([
    { c: 'Fecha', m: day.toLocaleDateString('es-MX', { dateStyle: 'long' }) },
    { c: 'Número de ventas', m: sales.length },
    { c: 'Ventas en efectivo', m: cash },
    { c: 'Ventas con tarjeta', m: card },
    { c: 'Ventas por transferencia', m: transfer },
    { c: 'Total vendido', m: cash + card + transfer },
    { c: 'Propinas (todas)', m: tips },
    { c: 'Propinas en efectivo', m: cashTips },
    { c: 'Egresos de caja', m: expenses },
    { c: 'Efectivo esperado (sin fondo inicial)', m: cash + cashTips - expenses },
  ]);
  rs.getRow(2).getCell(2).numFmt = '@';
  rs.getRow(3).getCell(2).numFmt = '0';
  rs.getRow(7).font = { bold: true };
  rs.getRow(11).font = { bold: true };

  // ---- Egresos y compras ----
  const wc = wb.addWorksheet('Egresos y compras');
  wc.columns = [
    { header: 'Tipo', key: 't', width: 12 },
    { header: 'Descripción', key: 'd', width: 46 },
    { header: 'Proveedor', key: 'p', width: 22 },
    { header: 'Monto', key: 'm', width: 14, style: { numFmt: MONEY } },
  ];
  styleHeader(wc);
  dayTx
    .filter(t => t.type === 'expense')
    .forEach(t => wc.addRow({ t: 'Egreso', d: t.description, p: '', m: t.amount }));
  dayCompras.forEach(c =>
    wc.addRow({
      t: 'Compra',
      d: `${c.cantidad} ${c.unidad} ${c.descripcion}`,
      p: c.proveedor ?? '',
      m: c.total,
    })
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas-${iso}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { sales: sales.length };
}
