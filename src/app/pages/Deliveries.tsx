import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, X, CreditCard, DollarSign, Bike } from 'lucide-react';
import { toast } from 'sonner';
import { abrirParaImprimirPDF } from '../../services/ticket-pdf.service';
import { PromotionCodeInput } from '../components/PromotionCodeInput';
import type { DiscountResult } from '../../services/discount.service';

export default function Deliveries() {
  const navigate = useNavigate();
  const {
    pendingDeliveries,
    discounts,
    redeemPromotion,
    removePendingDelivery,
    payPendingDelivery,
    getPendingDeliveryTotal,
  } = useApp();
  
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);

  const handlePayDelivery = async () => {
    // Prevenir clics múltiples
    if (processingPayment) return;
    setProcessingPayment(true);

    if (!selectedDelivery) {
      setProcessingPayment(false);
      return;
    }

    const delivery = pendingDeliveries.find(d => d.id === selectedDelivery);
    if (!delivery) {
      setProcessingPayment(false);
      return;
    }

    const paymentTotal = discountResult?.total ?? delivery.total;
    const received = paymentMethod === 'cash' ? parseFloat(amountReceived) : paymentTotal;

    if (paymentMethod === 'cash') {
      if (isNaN(received) || received === 0) {
        toast.error('Ingresa un monto válido');
        setProcessingPayment(false);
        return;
      }

      if (received < paymentTotal) {
        toast.error(`Monto insuficiente. Falta ${(paymentTotal - received).toFixed(2)} pesos`);
        setProcessingPayment(false);
        return;
      }

      const calculatedChange = received - paymentTotal;
      setChange(calculatedChange);

      try {
        const ordenId = await payPendingDelivery(
          selectedDelivery,
          'cash',
          received,
          calculatedChange,
          discountResult?.discountApplied,
          paymentTotal
        );

        const orderObject = {
          id: ordenId,
          items: delivery.items,
          total: paymentTotal,
          originalTotal: discountResult ? discountResult.subtotal : undefined,
          discountApplied: discountResult?.discountApplied,
          status: 'pending' as const,
          timestamp: new Date(),
          orderType: 'delivery' as const,
          paymentMethod: 'cash' as const,
          deliveryInfo: {
            customerName: delivery.customerName,
            phone: delivery.phone,
            address: delivery.address,
          },
          amountReceived: received,
          change: calculatedChange,
          deliveryFee: delivery.deliveryFee,
          tip: undefined,
        };

        toast.success('Entrega pagada ✓');

        // Imprimir ticket
        await abrirParaImprimirPDF(orderObject);

        // Cerrar diálogos
        setShowPaymentDialog(false);
        setSelectedDelivery(null);
        setAmountReceived('');
        setPaymentMethod('cash');
        setDiscountResult(null);
      } catch (error) {
        toast.error('Error al pagar la entrega');
        console.error('ERROR:', error);
      } finally {
        setProcessingPayment(false);
      }
    } else {
      try {
        const ordenId = await payPendingDelivery(
          selectedDelivery,
          'card',
          paymentTotal,
          0,
          discountResult?.discountApplied,
          paymentTotal
        );

        const orderObject = {
          id: ordenId,
          items: delivery.items,
          total: paymentTotal,
          originalTotal: discountResult ? discountResult.subtotal : undefined,
          discountApplied: discountResult?.discountApplied,
          status: 'pending' as const,
          timestamp: new Date(),
          orderType: 'delivery' as const,
          paymentMethod: 'card' as const,
          deliveryInfo: {
            customerName: delivery.customerName,
            phone: delivery.phone,
            address: delivery.address,
          },
          amountReceived: paymentTotal,
          change: 0,
          deliveryFee: delivery.deliveryFee,
          tip: undefined,
        };

        toast.success('Entrega pagada con tarjeta ✓');

        await abrirParaImprimirPDF(orderObject);

        setShowPaymentDialog(false);
        setSelectedDelivery(null);
        setAmountReceived('');
        setPaymentMethod('cash');
        setDiscountResult(null);
      } catch (error) {
        toast.error('Error al pagar la entrega');
        console.error('ERROR:', error);
      } finally {
        setProcessingPayment(false);
      }
    }
  };

  // Vista de Entregas Pendientes (lista)
  if (!selectedDelivery) {
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
                Entregas Pendientes
              </h1>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {pendingDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bike size={64} className="text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">Sin entregas pendientes</p>
              <p className="text-sm text-muted-foreground mt-2">Las órdenes de delivery aparecerán aquí</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
              {pendingDeliveries.map(delivery => (
                <div
                  key={delivery.id}
                  onClick={() => setSelectedDelivery(delivery.id)}
                  className="p-6 border border-border rounded-lg hover:border-accent hover:bg-secondary/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{delivery.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{delivery.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-accent">
                        ${delivery.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">+ ${delivery.deliveryFee}</p>
                    </div>
                  </div>

                  <div className="mb-4 pb-4 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground mb-1">📍 {delivery.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {delivery.items.length} {delivery.items.length === 1 ? 'artículo' : 'artículos'}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(delivery.createdAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de Entrega Seleccionada
  const delivery = pendingDeliveries.find(d => d.id === selectedDelivery);
  if (!delivery) return null;

  const total = delivery.total;
  const paymentTotal = discountResult?.total ?? total;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedDelivery(null)}
                className="p-2 hover:bg-secondary transition-colors rounded"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                  {delivery.customerName}
                </h1>
                <p className="text-sm text-muted-foreground">{delivery.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent">
                ${total.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">+ ${delivery.deliveryFee} envío</p>
            </div>
          </div>

          <div className="bg-secondary p-3 rounded">
            <p className="text-sm font-medium">📍 {delivery.address}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="max-w-2xl">
          {/* Productos */}
          <div className="mb-8">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 600 }} className="mb-4">
              Productos
            </h2>
            <div className="space-y-2">
              {delivery.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <p className="font-bold">${(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-secondary p-6 rounded-lg mb-6 space-y-3">
            <div className="flex justify-between">
              <p>Subtotal:</p>
              <p className="font-semibold">${total.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p>Envío:</p>
              <p className="font-semibold">${delivery.deliveryFee}</p>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
              <p>Total:</p>
              <p className="text-accent">${total.toFixed(2)}</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={async () => {
                await removePendingDelivery(delivery.id, true);
                setSelectedDelivery(null);
                toast.success('Entrega cancelada');
              }}
              className="flex-1 px-4 py-3 border border-red-300 text-red-600 rounded hover:bg-red-500/10 transition-colors font-semibold"
            >
              Cancelar Entrega
            </button>
            <button
              onClick={() => {
                setDiscountResult(null);
                setShowPaymentDialog(true);
                setAmountReceived('');
                setPaymentMethod('cash');
              }}
              className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 transition-all font-semibold"
            >
              Cobrar Entrega
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
                Cobrar Entrega
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
                items={delivery.items}
                discounts={discounts}
                redeemPromotion={redeemPromotion}
                onDiscountChange={setDiscountResult}
              />

              <div className="bg-secondary p-4 rounded">
                <p className="text-muted-foreground text-sm mb-2">Total a Pagar:</p>
                {discountResult ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground line-through">${total.toFixed(2)}</p>
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
                  onClick={handlePayDelivery}
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
    </div>
  );
}
