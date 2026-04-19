import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Store, Truck, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Kitchen() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useApp();

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const preparingOrders = activeOrders.filter(o => o.status === 'preparing');
  const readyOrders = activeOrders.filter(o => o.status === 'ready');

  const handleStatusChange = (orderId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'completed') => {
    updateOrderStatus(orderId, newStatus);
    const statusText = {
      pending: 'Pendiente',
      preparing: 'En Preparación',
      ready: 'Lista',
      completed: 'Completada'
    };
    toast.success(`Orden actualizada a: ${statusText[newStatus]}`);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta orden?')) {
      try {
        await updateOrderStatus(orderId, 'cancelled');
        toast.success('Orden cancelada');
      } catch (error) {
        toast.error('Error al cancelar la orden');
        console.error(error);
      }
    }
  };

  const OrderColumn = ({
    title,
    orders,
    color,
    nextStatus,
    nextLabel
  }: {
    title: string;
    orders: typeof activeOrders;
    color: string;
    nextStatus?: 'preparing' | 'ready' | 'completed';
    nextLabel?: string;
  }) => (
    <div className="flex-1 min-w-[300px]">
      <div className={`${color} text-white p-4 rounded-t`}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
        </p>
      </div>
      <div className="space-y-4 p-4 bg-secondary rounded-b min-h-[400px]">
        {orders.map(order => (
          <div key={order.id} className="bg-card border border-border rounded p-4 shadow-sm">
            {/* Order Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                    Orden #{order.id.slice(-4)}
                  </h3>
                  {order.orderType === 'delivery' ? (
                    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded text-xs" style={{ fontWeight: 600 }}>
                      <Truck size={12} />
                      Delivery
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs" style={{ fontWeight: 600 }}>
                      <Store size={12} />
                      Local
                    </span>
                  )}
                </div>
                {order.orderType === 'local' && order.tableNumber && (
                  <p className="text-muted-foreground text-sm">Mesa {order.tableNumber}</p>
                )}
                {order.orderType === 'delivery' && order.deliveryInfo && (
                  <div className="text-muted-foreground text-sm">
                    <p>{order.deliveryInfo.customerName}</p>
                    <p className="text-xs">{order.deliveryInfo.phone}</p>
                  </div>
                )}
              </div>
              <span className="text-muted-foreground text-sm">
                {new Date(order.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Order Items */}
            <div className="border-t border-border pt-3 mb-4 space-y-2">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => {
                  const product = item.product || (typeof item === 'object' && 'name' in item ? item : null);
                  if (!product || !product.name) {
                    return (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>Item sin info</span>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="flex justify-between">
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                        {item.quantity}x
                      </span>
                      <span className="flex-1 ml-3">{product.name}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground text-sm">Sin items</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {nextStatus && nextLabel && (
                <button
                  onClick={() => handleStatusChange(order.id, nextStatus)}
                  className="flex-1 bg-accent text-accent-foreground py-2 rounded hover:opacity-90 transition-opacity"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  {nextLabel}
                </button>
              )}
              <button
                onClick={() => handleCancelOrder(order.id)}
                className="px-3 py-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
                title="Cancelar orden"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p style={{ fontFamily: 'var(--font-sans)' }}>No hay órdenes</p>
          </div>
        )}
      </div>
    </div>
  );

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
            Cocina - Comandas
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="flex gap-6 overflow-x-auto pb-4">
          <OrderColumn
            title="Pendientes"
            orders={pendingOrders}
            color="bg-accent"
            nextStatus="preparing"
            nextLabel="Iniciar Preparación"
          />
          <OrderColumn
            title="En Preparación"
            orders={preparingOrders}
            color="bg-primary"
            nextStatus="ready"
            nextLabel="Marcar como Lista"
          />
          <OrderColumn
            title="Listas para Servir"
            orders={readyOrders}
            color="bg-green-600"
            nextStatus="completed"
            nextLabel="Servido"
          />
        </div>
      </main>
    </div>
  );
}
