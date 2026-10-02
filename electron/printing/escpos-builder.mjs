/**
 * Constructor ESC/POS para tickets térmicos 58/80 mm.
 * Usa bytes RAW (no PDF/GDI) para evitar papel blanco / basura / avance infinito.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function encodeText(text) {
  // Latin-1 compatible + reemplazos para caracteres comunes en tickets MX.
  const normalized = String(text ?? '')
    .replaceAll('Á', 'A')
    .replaceAll('É', 'E')
    .replaceAll('Í', 'I')
    .replaceAll('Ó', 'O')
    .replaceAll('Ú', 'U')
    .replaceAll('Ü', 'U')
    .replaceAll('Ñ', 'N')
    .replaceAll('á', 'a')
    .replaceAll('é', 'e')
    .replaceAll('í', 'i')
    .replaceAll('ó', 'o')
    .replaceAll('ú', 'u')
    .replaceAll('ü', 'u')
    .replaceAll('ñ', 'n')
    .replaceAll('¿', '?')
    .replaceAll('¡', '!')
    .replaceAll('°', 'o')
    .replaceAll('–', '-')
    .replaceAll('—', '-')
    .replaceAll('“', '"')
    .replaceAll('”', '"')
    .replaceAll('‘', "'")
    .replaceAll('’', "'")
    .replaceAll('€', 'EUR')
    .replaceAll('📝', '')
    .replaceAll('🥟', '');

  const bytes = [];
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    bytes.push(code <= 0xff ? code : 0x3f); // '?'
  }
  return Uint8Array.from(bytes);
}

function concatChunks(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function lineWidth(paperWidthMm) {
  return paperWidthMm <= 58 ? 32 : 42;
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

function padLine(left, right, width) {
  const l = String(left ?? '');
  const r = String(right ?? '');
  const space = Math.max(1, width - l.length - r.length);
  return `${l}${' '.repeat(space)}${r}`.slice(0, width);
}

function wrapText(text, width) {
  const src = String(text ?? '');
  if (!src) return [''];
  const words = src.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word.slice(0, width);
      continue;
    }
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildOrderTicketBytes(order, options = {}) {
  const paperWidthMm = options.paperWidthMm === 58 ? 58 : 80;
  const width = lineWidth(paperWidthMm);
  const openDrawer = options.openDrawer !== false;
  const cut = options.cut !== false;
  const chunks = [];

  const push = (...arr) => chunks.push(Uint8Array.from(arr));
  const text = (value) => chunks.push(encodeText(value));
  const textLn = (value = '') => {
    text(value);
    push(LF);
  };
  const align = (mode) => push(ESC, 0x61, mode); // 0 left, 1 center, 2 right
  const bold = (on) => push(ESC, 0x45, on ? 1 : 0);
  const size = (n) => push(GS, 0x21, n); // 0 normal, 0x11 double
  const sep = () => textLn('-'.repeat(width));

  // Init + code page PC437 (seguro en la mayoría de térmicas)
  push(ESC, 0x40);
  push(ESC, 0x74, 0x00);

  align(1);
  size(0x11);
  bold(true);
  textLn('DUMPLINGS');
  size(0x00);
  bold(false);
  textLn('DEL DRAGON');
  textLn('Comanda');
  sep();

  const ts = new Date(order.timestamp || Date.now());
  const fecha = ts.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const hora = ts.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const folio = String(order.id || '').slice(-4) || '----';

  bold(true);
  textLn(`#${folio}`);
  bold(false);
  textLn(`${fecha} ${hora}`);

  const tipo = order.orderType === 'delivery' ? 'DELIVERY' : 'LOCAL';
  bold(true);
  textLn(tipo);
  bold(false);

  if (order.orderType === 'local' && order.tableNumber) {
    textLn(`Mesa ${order.tableNumber}`);
  }

  if (order.orderType === 'delivery' && order.deliveryInfo) {
    align(0);
    for (const line of wrapText(order.deliveryInfo.customerName || '', width)) {
      textLn(line);
    }
    if (order.deliveryInfo.phone) textLn(`Tel: ${order.deliveryInfo.phone}`);
    if (order.deliveryInfo.address) {
      for (const line of wrapText(order.deliveryInfo.address, width)) {
        textLn(line);
      }
    }
    if (order.deliveryFee && order.deliveryFee > 0) {
      bold(true);
      textLn(`Envio: ${money(order.deliveryFee)}`);
      bold(false);
    }
    align(1);
  }

  sep();
  align(0);

  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const name = String(item.product?.name || item.name || 'Producto').slice(0, width - 10);
    const lineTotal = (Number(item.product?.price) || Number(item.price) || 0) * qty;
    textLn(padLine(`${qty}x ${name}`, money(lineTotal), width));

    const comment =
      item.comment ||
      order.itemComments?.[item.product?.id || String(idx)] ||
      '';
    if (comment) {
      for (const line of wrapText(`* ${comment}`, width)) {
        textLn(line);
      }
    }
  });

  sep();
  bold(true);
  textLn(padLine('TOTAL', money(order.total), width));
  bold(false);

  if (order.originalTotal && order.originalTotal > order.total) {
    textLn(padLine('Subtotal', money(order.originalTotal), width));
    textLn(padLine('Descuento', `-${money(order.originalTotal - order.total)}`, width));
  }

  if (order.amountReceived != null && Number(order.amountReceived) > 0) {
    textLn(padLine('Recibido', money(order.amountReceived), width));
    if (order.change != null) {
      bold(true);
      textLn(padLine('Cambio', money(order.change), width));
      bold(false);
    }
  }

  if (order.tip && Number(order.tip) > 0) {
    textLn(padLine('Propina', money(order.tip), width));
  }

  sep();
  align(1);
  const metodos = { cash: 'EFECTIVO', card: 'TARJETA', transfer: 'TRANSFERENCIA' };
  bold(true);
  textLn(metodos[order.paymentMethod] || 'EFECTIVO');
  bold(false);
  sep();
  textLn('Gracias!');
  textLn('');
  textLn('');

  if (openDrawer && order.paymentMethod === 'cash') {
    // ESC p 0 50 50
    push(ESC, 0x70, 0x00, 0x32, 0x32);
  }

  if (cut) {
    // GS V 0 - full cut
    push(GS, 0x56, 0x00);
  }

  return concatChunks(chunks);
}

export function buildEgresoTicketBytes(payload, options = {}) {
  const paperWidthMm = options.paperWidthMm === 58 ? 58 : 80;
  const width = lineWidth(paperWidthMm);
  const openDrawer = options.openDrawer !== false;
  const cut = options.cut !== false;
  const chunks = [];

  const push = (...arr) => chunks.push(Uint8Array.from(arr));
  const text = (value) => chunks.push(encodeText(value));
  const textLn = (value = '') => {
    text(value);
    push(LF);
  };
  const align = (mode) => push(ESC, 0x61, mode);
  const bold = (on) => push(ESC, 0x45, on ? 1 : 0);
  const size = (n) => push(GS, 0x21, n);
  const sep = () => textLn('-'.repeat(width));

  push(ESC, 0x40);
  push(ESC, 0x74, 0x00);

  align(1);
  size(0x11);
  bold(true);
  textLn('DUMPLINGS');
  size(0x00);
  bold(false);
  textLn('EGRESO / GASTO');
  sep();

  const ts = new Date(payload.timestamp || Date.now());
  const fecha = ts.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const hora = ts.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  textLn(`${fecha} ${hora}`);
  sep();

  align(0);
  for (const line of wrapText(payload.descripcion || 'Gasto', width)) {
    textLn(line);
  }
  sep();

  align(1);
  size(0x11);
  bold(true);
  textLn(`-${money(payload.monto)}`);
  size(0x00);
  bold(false);
  sep();
  textLn('Comprobante de Egreso');
  textLn('');
  textLn('');

  if (openDrawer) {
    push(ESC, 0x70, 0x00, 0x32, 0x32);
  }
  if (cut) {
    push(GS, 0x56, 0x00);
  }

  return concatChunks(chunks);
}

export function buildOpenDrawerBytes() {
  return Uint8Array.from([ESC, 0x70, 0x00, 0x32, 0x32]);
}

export function scoreThermalPrinterName(name = '') {
  const n = String(name).toLowerCase();
  let score = 0;
  if (/(thermal|termica|térmica|pos|receipt|ticket|80mm|58mm|xp-?80|xp-?58|epson|tm-|star|bixolon|rongta|xprinter|generic)/i.test(n)) {
    score += 10;
  }
  if (/(pdf|onenote|fax|xps|microsoft print to|send to onenote|adobe)/i.test(n)) {
    score -= 50;
  }
  return score;
}
