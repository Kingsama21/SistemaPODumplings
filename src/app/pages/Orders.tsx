import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Clock, ChefHat, CheckCircle2, Store, Truck, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Orders() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useApp();

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-accent text-accent-foreground';
      case 'preparing': return 'bg-primary text-primary-foreground';
      case 'ready': return 'bg-green-600 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'En Preparación';
      case 'ready': return 'Lista';
      case 'completed': return 'Completada';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'preparing': return ChefHat;
      case 'ready': return CheckCircle2;
      default: return Clock;
    }
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
            Órdenes Activas
          </h1>
          <span className="ml-auto bg-accent text-accent-foreground px-4 py-2 rounded" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            {activeOrders.length} {activeOrders.length === 1 ? 'orden' : 'órdenes'}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 bg-secondary rounded-full mb-6">
              <CheckCircle2 size={64} className="text-muted-foreground" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No hay órdenes activas
            </h2>
            <p className="text-muted-foreground mb-8" style={{ fontFamily: 'var(--font-sans)' }}>
              Todas las órdenes han sido completadas
            </p>
            <button
              onClick={() => navigate('/nueva-orden')}
              className="bg-accent text-accent-foreground px-8 py-3 rounded hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              Crear Nueva Orden
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map(order => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <div key={order.id} className="bg-card border border-border rounded p-6 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem' }}>
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
                        <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                          Mesa {order.tableNumber}
                        </p>
                      )}
                      {order.orderType === 'delivery' && order.deliveryInfo && (
                        <div className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                          <p>{order.deliveryInfo.customerName}</p>
                          <p>{order.deliveryInfo.phone}</p>
                        </div>
                      )}
                    </div>
                    <div className={`${getStatusColor(order.status)} px-3 py-1 rounded flex items-center gap-2`} style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      <StatusIcon size={16} />
                      {getStatusText(order.status)}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-border pt-4 mb-4 space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => {
                        const product = item.product || (typeof item === 'object' && 'name' in item ? item : null);
                        if (!product || !product.name) {
                          return (
                            <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                              <span>Item sin información</span>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {product.name}
                            </span>
                            <span className="text-muted-foreground">
                              ${(product.price || 0) * (item.quantity || 1)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">Sin items</div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-border pt-4 flex justify-between items-center">
                    <span className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                      {new Date(order.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.25rem' }}>
                        ${order.total}
                      </span>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="p-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
                        title="Cancelar orden"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
