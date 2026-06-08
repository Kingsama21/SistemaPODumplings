import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, Minus, X, CreditCard, DollarSign, ChefHat, ArrowRight, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { abrirParaImprimirPDF } from '../../services/ticket-pdf.service';
import { PromotionCodeInput } from '../components/PromotionCodeInput';
import type { DiscountResult } from '../../services/discount.service';

export default function Tables() {
  const navigate = useNavigate();
  const {
    tables,
    products,
    categories,
    discounts,
    redeemPromotion,
    addToTable,
    removeFromTable,
    getTableOrders,
    getTableTotal,
    payTable,
    clearTable,
    sendTableOrderToKitchen,
    moveTableOrders,
  } = useApp();
  
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedTargetTable, setSelectedTargetTable] = useState<number | null>(null);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [orderComments, setOrderComments] = useState<Record<string, string>>({});
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const tableData = selectedTable ? tables.find(t => t.number === selectedTable) : null;
  const tableOrders = selectedTable ? getTableOrders(selectedTable) : [];
  const pendingTableOrders = tableOrders.filter(order => order.status === 'pending');
  const tableTotal = selectedTable ? getTableTotal(selectedTable) : 0;
  const payableItems = tableOrders
    .filter(order => order.status !== 'cancelled')
    .map(order => ({ product: order.product, quantity: order.quantity }));
  const paymentTotal = discountResult?.total ?? tableTotal;

  const handleAddProduct = (product) => {
    if (selectedTable) {
      addToTable(selectedTable, product, 1);
      toast.success(`${product.name} agregado`);
    }
  };

  const handleSendToKitchen = () => {
    if (!selectedTable) return;

    if (pendingTableOrders.length === 0) {
      toast.error('No hay productos nuevos para enviar a cocina');
      return;
    }

    setShowCommentsDialog(true);
  };

  const confirmSendToKitchen = async () => {
    if (!selectedTable) return;

    setSendingToKitchen(true);
    try {
      await sendTableOrderToKitchen(selectedTable, orderComments);
      toast.success('Comanda enviada a cocina ✓');
      setShowCommentsDialog(false);
      setOrderComments({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error enviando a cocina');
      console.error('ERROR:', error);
    } finally {
      setSendingToKitchen(false);
    }
  };

  const handleConfirmPayment = async () => {
    // Prevenir clics múltiples
    if (processingPayment) return;
    setProcessingPayment(true);

    const tipAmount = tip ? parseFloat(tip) : 0;
    
    // Para tarjeta, usar el total directamente
    const received = paymentMethod === 'card' ? paymentTotal : parseFloat(amountReceived);

    if (isNaN(received) || received === 0) {
      toast.error('Ingresa un monto válido');
      setProcessingPayment(false);
      return;
    }

    if (paymentMethod === 'cash' && received < paymentTotal) {
      toast.error(`Monto insuficiente. Falta ${(paymentTotal - received).toFixed(2)} pesos`);
      setProcessingPayment(false);
      return;
    }

    const calculatedChange = received - paymentTotal;
    setChange(calculatedChange);

    try {
      if (!selectedTable) return;

      const ordenId = await payTable(
        selectedTable,
        paymentMethod,
        received,
        tipAmount,
        discountResult?.discountApplied,
        paymentTotal
      );

      const orderObject = {
        id: ordenId,
        items: tableOrders,
        total: paymentTotal,
        originalTotal: discountResult ? discountResult.subtotal : undefined,
        discountApplied: discountResult?.discountApplied,
        status: 'pending' as const,
        timestamp: new Date(),
        orderType: 'local' as const,
        paymentMethod: 'cash' as const,
        tableNumber: `Mesa ${selectedTable}`,
        amountReceived: received,
        change: calculatedChange,
        tip: tipAmount,
      };

      toast.success('Mesa pagada ✓');
      
      // Limpiar mesa
      clearTable(selectedTable);
      
      // Imprimir ticket
      await abrirParaImprimirPDF(orderObject);

      // Cerrar diálogos
      setShowPaymentDialog(false);
      setSelectedTable(null);
      setAmountReceived('');
      setTip('');
      setPaymentMethod('cash');
      setChange(0);
      setDiscountResult(null);
    } catch (error) {
      toast.error('Error al pagar la mesa');
      console.error('ERROR en handleConfirmPayment:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMoveTable = () => {
    if (!selectedTable || selectedTargetTable === null) {
      toast.error('Selecciona una mesa destino');
      return;
    }

    try {
      moveTableOrders(selectedTable, selectedTargetTable);
      toast.success(`✓ Órdenes movidas de Mesa ${selectedTable} a Mesa ${selectedTargetTable}`);
      setShowMoveDialog(false);
      setSelectedTargetTable(null);
      setSelectedTable(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error moviendo mesa');
    }
  };

  // Vista de Mesas (grid 3x3)
  if (!selectedTable) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-secondary transition-colors rounded"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Mesas
              </h1>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-6">
            {tables.map(table => {
              const orders = getTableOrders(table.number);
              const total = getTableTotal(table.number);
              const isEmpty = orders.length === 0;

              return (
                <button
                  key={table.number}
                  onClick={() => setSelectedTable(table.number)}
                  className={`p-12 rounded-lg border-2 transition-all text-center ${
                    isEmpty
                      ? 'border-border bg-secondary hover:border-accent hover:bg-secondary/80'
                      : 'border-accent bg-accent/10 hover:bg-accent/20'
                  }`}
                >
                  <div className="text-4xl font-bold mb-4">{table.number}</div>
                  <div className="text-base text-muted-foreground mb-3">
                    {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
                  </div>
                  {!isEmpty && (
                    <div className="text-2xl font-bold text-accent">
                      ${total.toFixed(2)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vista de Mesa Seleccionada
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedTable(null)}
                className="p-2 hover:bg-secondary transition-colors rounded"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Mesa {selectedTable}
              </h1>
            </div>
            <div className="text-2xl font-bold text-accent">
              ${tableTotal.toFixed(2)}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded whitespace-nowrap text-sm font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded whitespace-nowrap text-sm font-semibold transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Productos */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="p-4 border border-border rounded hover:border-accent hover:bg-secondary transition-all text-left group"
              >
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600 }} className="line-clamp-2 mb-2 group-hover:text-accent">
                  {product.name}
                </p>
                <p className="text-accent font-bold">${product.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Órdenes de la Mesa */}
        <div className="w-80 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 600 }}>
              Órdenes
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tableOrders.length} {tableOrders.length === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tableOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p style={{ fontFamily: 'var(--font-sans)' }}>Ningún producto</p>
              </div>
            ) : (
              tableOrders.map(order => (
                <div
                  key={order.id}
                  className={`border rounded p-3 transition-all ${
                    order.status === 'cancelled'
                      ? 'border-red-300 bg-red-50 opacity-60'
                      : order.status === 'sent'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-border'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          textDecoration: order.status === 'cancelled' ? 'line-through' : 'none',
                        }}
                        className="line-clamp-1"
                      >
                        {order.product.name}
                      </h4>
                      {order.status === 'sent' && (
                        <p className="text-xs text-blue-600 font-medium">En cocina</p>
                      )}
                      {order.status === 'cancelled' && (
                        <p className="text-xs text-red-600 font-medium">Cancelado</p>
                      )}
                      {order.comment && (
                        <p className="text-xs text-orange-600 mt-1">📝 {order.comment}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromTable(selectedTable!, order.id)}
                      className="text-destructive hover:underline text-xs ml-2"
                      title={order.status === 'sent' ? 'Marcar como cancelado' : 'Eliminar'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromTable(selectedTable!, order.id)}
                        className="w-6 h-6 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                        disabled={order.status === 'cancelled'}
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 600,
                          minWidth: '1.5rem',
                          textAlign: 'center',
                          fontSize: '0.875rem',
                        }}
                      >
                        {order.quantity}
                      </span>
                      <button
                        onClick={() => addToTable(selectedTable!, order.product, 1)}
                        className="w-6 h-6 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={order.status !== 'pending'}
                        title={order.status === 'sent' ? 'No puedes agregar si ya está en cocina' : ''}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span
                      className="text-accent"
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        opacity: order.status === 'cancelled' ? 0.5 : 1,
                      }}
                    >
                      ${(order.product.price * order.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between items-center">
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.125rem', fontWeight: 600 }}>
                Total
              </span>
              <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700 }}>
                ${tableTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleSendToKitchen}
              disabled={pendingTableOrders.length === 0 || sendingToKitchen}
              className="w-full bg-orange-500 text-white py-3 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <ChefHat size={16} />
              {sendingToKitchen ? 'Enviando...' : 'Enviar a Cocina'}
            </button>
            <button
              onClick={() => setShowMoveDialog(true)}
              disabled={tableOrders.length === 0}
              className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <ArrowRight size={16} />
              Cambiar Mesa
            </button>
            <button
              onClick={() => {
                setDiscountResult(null);
                setShowPaymentDialog(true);
              }}
              disabled={tableOrders.length === 0}
              className="w-full bg-accent text-accent-foreground py-3 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <CreditCard size={16} />
              Cobrar Mesa
            </button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-8 w-96 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
                Pago Mesa {selectedTable}
              </h2>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <PromotionCodeInput
                items={payableItems}
                discounts={discounts}
                redeemPromotion={redeemPromotion}
                onDiscountChange={setDiscountResult}
              />

              <div className="bg-secondary p-4 rounded">
                <p className="text-muted-foreground text-sm mb-2">Total a Pagar:</p>
                {discountResult ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground line-through">${tableTotal.toFixed(2)}</p>
                    <p className="text-3xl font-bold text-accent">${paymentTotal.toFixed(2)}</p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-accent">${paymentTotal.toFixed(2)}</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-3">Método de Pago:</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-3 px-4 rounded font-semibold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'cash'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary border border-border hover:bg-accent/20'
                    }`}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    <DollarSign size={20} />
                    Efectivo
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-3 px-4 rounded font-semibold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'card'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary border border-border hover:bg-accent/20'
                    }`}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    <CreditCard size={20} />
                    Tarjeta
                  </button>
                </div>
              </div>

              {/* Amount Input - Only for Cash */}
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Monto Recibido:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => {
                      setAmountReceived(e.target.value);
                      const received = parseFloat(e.target.value);
                      if (!isNaN(received)) {
                        setChange(Math.max(0, received - paymentTotal));
                      }
                    }}
                    autoFocus
                    className="w-full px-4 py-3 border border-border rounded text-lg font-bold bg-input text-right"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  />
                </div>
              )}

              {/* Card Info - Only for Card */}
              {paymentMethod === 'card' && (
                <div className="bg-blue-500/10 border border-blue-300 p-4 rounded">
                  <p className="text-sm font-medium mb-2">Se cobrará en tarjeta:</p>
                  <p className="text-2xl font-bold text-blue-600">${paymentTotal.toFixed(2)}</p>
                </div>
              )}

              {/* Tip */}
              <div>
                <label className="block text-sm font-medium mb-2">Propina (opcional):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded text-lg font-bold bg-input text-right"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              {/* Change Display - Only for Cash */}
              {paymentMethod === 'cash' && amountReceived && (
                <div className={`p-4 rounded ${change >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className="text-muted-foreground text-sm mb-2">Cambio:</p>
                  <p className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${change.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1 px-4 py-3 border border-border rounded hover:bg-secondary transition-colors"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={processingPayment || (paymentMethod === 'cash' ? !amountReceived || change < 0 : false)}
                  className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  {processingPayment ? 'Procesando...' : 'Cobrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Dialog */}
      {showCommentsDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare size={24} className="text-orange-500" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Comentarios para cocina
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega instrucciones por producto (opcional)
            </p>

            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto">
              {pendingTableOrders.map(order => (
                <div key={order.id} className="border border-border rounded p-3">
                  <p className="font-semibold text-sm mb-2">
                    {order.product.name} x{order.quantity}
                  </p>
                  <input
                    type="text"
                    placeholder="Ej: sin cebolla, extra picante..."
                    value={orderComments[order.id] || ''}
                    onChange={(e) => setOrderComments({
                      ...orderComments,
                      [order.id]: e.target.value,
                    })}
                    className="w-full px-3 py-2 border border-border rounded bg-input text-sm"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentsDialog(false);
                  setOrderComments({});
                }}
                className="flex-1 px-4 py-3 border border-border rounded hover:bg-secondary transition-colors"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmSendToKitchen}
                disabled={sendingToKitchen}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                <ChefHat size={16} />
                {sendingToKitchen ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Table Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.25rem' }}>
              Cambiar Mesa {selectedTable}
            </h2>
            
            <div className="space-y-2">
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#666' }}>
                Selecciona la mesa destino:
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {tables.map(table => (
                  <button
                    key={table.number}
                    onClick={() => setSelectedTargetTable(table.number)}
                    disabled={table.number === selectedTable}
                    className={`py-3 rounded font-semibold text-sm transition-all ${
                      selectedTargetTable === table.number
                        ? 'bg-accent text-accent-foreground'
                        : table.number === selectedTable
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                        : 'border border-border hover:bg-secondary'
                    }`}
                    style={{ fontFamily: 'var(--font-sans)' }}
                  >
                    Mesa {table.number}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMoveDialog(false);
                  setSelectedTargetTable(null);
                }}
                className="flex-1 px-4 py-3 border border-border rounded hover:bg-secondary transition-colors"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleMoveTable}
                disabled={selectedTargetTable === null}
                className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                <ArrowRight size={16} />
                Cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
