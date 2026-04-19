import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, CheckCircle, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import { abrirParaImprimirPDF } from '../../services/ticket-pdf.service';
import { useState } from 'react';

export default function Tickets() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, updateOrderPaymentMethod } = useApp();
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'transfer' | null>(null);

  const readyOrders = orders.filter(o => o.status === 'ready');



  const handleComplete = async (orderId: string) => {
    try {
      console.log('handleComplete: Iniciando...');
      const order = orders.find(o => o.id === orderId && o.status === 'ready');
      if (!order) {
        console.error('Orden no encontrada:', orderId);
        toast.error('No se encontró la orden');
        return;
      }
      
      console.log('handleComplete: Orden encontrada:', order.id);
      updateOrderStatus(orderId, 'completed');
      toast.success('Orden completada y cobrada');
      
      console.log('handleComplete: Esperando 200ms antes de abrir PDF...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('handleComplete: Llamando abrirParaImprimirPDF...');
      await abrirParaImprimirPDF(order);
      console.log('handleComplete: abrirParaImprimirPDF completado');
    } catch (error) {
      console.error('ERROR en handleComplete:', error);
      toast.error('Error al completar la orden');
    }
  };

  const handleUpdatePayment = (orderId: string, newMethod: 'cash' | 'card' | 'transfer') => {
    updateOrderPaymentMethod(orderId, newMethod);
    toast.success('Método de pago actualizado');
    setEditingPaymentId(null);
    setSelectedPayment(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-secondary transition-colors rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
            Caja / Tickets
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {readyOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 bg-secondary rounded-full mb-6">
              <CheckCircle size={64} className="text-muted-foreground" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No hay órdenes listas para cobrar
            </h2>
            <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              Las órdenes aparecerán aquí cuando estén listas
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {readyOrders.map(order => (
              <div key={order.id} className="bg-white p-8 max-w-sm mx-auto border border-gray-300 rounded shadow-lg" style={{ fontFamily: 'var(--font-sans)' }}>
                {/* Logo */}
                <div className="flex justify-center mb-4">
                  <img src="/descargar.png" alt="Dumplings del Dragón" className="h-32 object-contain" />
                </div>

                {/* Título */}
                <h1 className="text-center text-2xl font-black tracking-wider mb-1">DUMPLINGS</h1>
                <p className="text-center text-lg font-semibold mb-4">Comanda</p>

                {/* Separador */}
                <div className="border-t-2 border-dashed border-black mb-4" />

                {/* Número de Orden */}
                <p className="text-center text-lg font-bold mb-2">#{order.id.slice(-4)}</p>
                
                {/* Fecha y Hora */}
                <p className="text-center text-sm font-semibold mb-2">
                  {new Date(order.timestamp).toLocaleDateString('es-MX')} {new Date(order.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* Tipo de Orden */}
                <p className="text-center font-bold mb-4">
                  {order.orderType === 'delivery' ? 'DELIVERY' : 'LOCAL'}
                  {order.orderType === 'local' && order.tableNumber && ` - MESA ${order.tableNumber}`}
                </p>

                {/* Separador */}
                <div className="border-t-2 border-dashed border-black mb-4" />

                {/* Items */}
                <div className="space-y-2 mb-4">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => {
                      const product = item.product || (typeof item === 'object' && 'name' in item ? item : null);
                      if (!product || !product.name) {
                        return <div key={idx} className="text-sm text-muted-foreground">Item sin información</div>;
                      }
                      return (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {product.name}</span>
                          <span className="font-semibold">${((product.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground">Sin items</div>
                  )}
                </div>

                {/* Separador */}
                <div className="border-t-2 border-dashed border-black mb-4" />

                {/* Total */}
                <div className="flex justify-between mb-4 text-lg font-black">
                  <span>TOTAL</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>

                {/* Método de Pago */}
                {editingPaymentId === order.id ? (
                  <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="text-sm font-semibold mb-2 text-center">Cambiar método de pago:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleUpdatePayment(order.id, 'cash')}
                        className="w-full bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700"
                      >
                        EFECTIVO
                      </button>
                      <button
                        onClick={() => handleUpdatePayment(order.id, 'card')}
                        className="w-full bg-green-600 text-white py-2 rounded text-sm font-semibold hover:bg-green-700"
                      >
                        TARJETA
                      </button>
                      <button
                        onClick={() => handleUpdatePayment(order.id, 'transfer')}
                        className="w-full bg-purple-600 text-white py-2 rounded text-sm font-semibold hover:bg-purple-700"
                      >
                        TRANSFERENCIA
                      </button>
                      <button
                        onClick={() => setEditingPaymentId(null)}
                        className="w-full bg-gray-400 text-white py-2 rounded text-sm font-semibold hover:bg-gray-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-center font-bold text-sm flex-1">
                      {order.paymentMethod === 'cash' ? 'EFECTIVO' : order.paymentMethod === 'card' ? 'TARJETA' : 'TRANSFERENCIA'}
                    </p>
                    <button
                      onClick={() => setEditingPaymentId(order.id)}
                      className="ml-2 p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Editar método de pago"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}

                {/* Separador */}
                <div className="border-t-2 border-dashed border-black mb-4" />

                {/* Mensaje */}
                <p className="text-center font-semibold mb-6">¡Gracias!</p>

                {/* Botón Cobrar */}
                <button
                  onClick={() => {
                    console.log('CLICK EN COBRAR - orderId:', order.id);
                    handleComplete(order.id);
                  }}
                  className="w-full bg-accent text-accent-foreground py-3 rounded hover:opacity-90 transition-opacity font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Cobrar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
