import { Link } from 'react-router';
import { Plus, ClipboardList, ChefHat, Receipt, Settings, DollarSign, TrendingUp, AlertCircle, Package, History } from 'lucide-react';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { orders, products, cashTransactions, getLowStockIngredients } = useApp();
  
  // Calcular estadísticas
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.timestamp ?? o.createdAt ?? new Date());
      return orderDate.getTime() >= today.getTime();
    });
    const completedOrders = todayOrders.filter(o => o.status === 'completed');
    const pendingOrders = todayOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
    
    // Calcular total de TODAS las órdenes del día (no solo completadas)
    const totalSales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = todayOrders.length;
    
    // Productos más vendidos
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    todayOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const product = item.product || (typeof item === 'object' && 'id' in item ? item : null);
          if (product && product.id && product.name) {
            const existing = productSales.get(product.id) || { 
              name: product.name, 
              quantity: 0, 
              revenue: 0 
            };
            existing.quantity += item.quantity || 0;
            existing.revenue += (product.price || 0) * (item.quantity || 1);
            productSales.set(product.id, existing);
          }
        });
      }
    });
    
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Horarios pico
    const hourlyData = new Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      orders: 0,
    }));
    
    todayOrders.forEach(order => {
      const hour = new Date(order.timestamp).getHours();
      hourlyData[hour].orders += 1;
    });
    
    const lowStockIngredients = getLowStockIngredients(5);
    
    return {
      totalSales,
      totalOrders,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      topProducts,
      hourlyData: hourlyData.filter(h => h.orders > 0 || (parseInt(h.hour) >= 10 && parseInt(h.hour) <= 22)),
      lowStockIngredients,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    };
  }, [orders, products, getLowStockIngredients]);

  const menuItems = [
    { to: '/nueva-orden', icon: Plus, label: 'Nueva Orden', color: 'bg-accent text-accent-foreground' },
    { to: '/ordenes', icon: ClipboardList, label: 'Ver Órdenes', color: 'bg-primary text-primary-foreground' },
    { to: '/cocina', icon: ChefHat, label: 'Cocina - Comandas', color: 'bg-red-600 text-white font-bold' },
    { to: '/tickets', icon: Receipt, label: 'Tickets', color: 'bg-primary text-primary-foreground' },
    { to: '/caja', icon: DollarSign, label: 'Control de Caja', color: 'bg-primary text-primary-foreground' },
    { to: '/historial', icon: History, label: 'Historial de Ventas', color: 'bg-primary text-primary-foreground' },
    { to: '/admin', icon: Settings, label: 'Administración', color: 'bg-secondary text-secondary-foreground' },
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header con logo y título */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
            <div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                Dumplings del Dragón
              </h1>
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                Sistema de punto de venta - {new Date().toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">
        {/* Estadísticas del día */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Venta del Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${todayStats.totalSales.toLocaleString('es-MX')}</div>
              <p className="text-xs text-muted-foreground mt-1">Ticket promedio: ${todayStats.averageTicket.toFixed(0)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.totalOrders}</div>
              <div className="flex gap-2 mt-2 text-xs">
                <Badge variant="default">{todayStats.completedOrders} completadas</Badge>
                <Badge variant="secondary">{todayStats.pendingOrders} pendientes</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{todayStats.lowStockIngredients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Ingredientes para reabastecer</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold">En línea</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Órdenes por hora */}
          {todayStats.hourlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Órdenes por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={todayStats.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#ef4444" name="Órdenes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          
          {/* Productos más vendidos */}
          {todayStats.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayStats.topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} vendidos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${product.revenue.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stock bajo - Alertas */}
        {todayStats.lowStockIngredients.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle size={20} />
                Ingredientes con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {todayStats.lowStockIngredients.map(ingredient => (
                  <div key={ingredient.id} className="bg-background p-3 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="font-medium text-sm truncate">{ingredient.name}</p>
                    <p className="text-lg font-bold text-orange-600 mt-1">{ingredient.stock} {ingredient.unit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menú de acciones rápidas */}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-4">Acceso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`${item.color} p-6 transition-all hover:scale-105 hover:shadow-xl group relative overflow-hidden rounded-lg`}
                style={{
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10"
                     style={{
                       background: 'currentColor',
                       clipPath: 'polygon(100% 0, 0% 0, 100% 100%)'
                     }}
                />

                <div className="relative flex flex-col items-center text-center gap-3">
                  <item.icon size={32} strokeWidth={1.5} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {item.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Decorative element */}
        <div className="mt-16 flex justify-center opacity-10">
          <div className="h-px w-64 bg-foreground" />
        </div>
      </main>
    </div>
  );
}
