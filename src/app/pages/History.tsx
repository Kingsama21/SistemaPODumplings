import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { ArrowLeft, DollarSign, Package, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function History() {
  const navigate = useNavigate();
  const { orders, cashTransactions } = useApp();
  const [filterType, setFilterType] = useState("today");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const filteredOrders = useMemo(() => {
    // Mostrar todas las órdenes excepto canceladas (para ver historial completo del día)
    const allOrders = orders.filter((o) => o.status !== 'cancelled');
    const now = new Date();
    let dateStart = new Date();
    
    switch (filterType) {
      case "today":
        dateStart.setHours(0, 0, 0, 0);
        break;
      case "week":
        dateStart.setDate(now.getDate() - now.getDay());
        dateStart.setHours(0, 0, 0, 0);
        break;
      case "month":
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateStart.setHours(0, 0, 0, 0);
        break;
      default:
        dateStart = new Date(2020, 0, 1);
    }
    
    now.setHours(23, 59, 59, 999);
    return allOrders.filter((o) => {
      const orderDate = new Date(o.timestamp ?? o.createdAt ?? new Date());
      return orderDate >= dateStart && orderDate <= now;
    });
  }, [orders, filterType]);

  const stats = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = filteredOrders.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const product = item.product || (typeof item === 'object' && 'id' in item ? item : null);
          if (product && product.id && product.name) {
            const k = product.id;
            const ex = map.get(k) || { name: product.name, qty: 0, revenue: 0 };
            ex.qty += item.quantity || 0;
            ex.revenue += (product.price || 0) * (item.quantity || 1);
            map.set(k, ex);
          }
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredOrders]);

  const paymentMethods = useMemo(
    () => ({
      cash: filteredOrders.filter((o) => o.paymentMethod === "cash").length,
      card: filteredOrders.filter((o) => o.paymentMethod === "card").length,
      transfer: filteredOrders.filter((o) => o.paymentMethod === "transfer").length,
    }),
    [filteredOrders]
  );

  const cashBalance = useMemo(() => {
    const income = cashTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const expense = cashTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    return income - expense;
  }, [cashTransactions]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-secondary rounded">
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}>
            Historial de Ventas
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8">
          {["today", "week", "month", "all"].map((t) => (
            <Button
              key={t}
              onClick={() => setFilterType(t)}
              variant={filterType === t ? "default" : "outline"}
            >
              {t === "today" ? "Hoy" : t === "week" ? "Semana" : t === "month" ? "Mes" : "Todo"}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex gap-2">
                <DollarSign size={16} /> Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">${stats.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.count} órdenes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex gap-2">
                <Package size={16} /> Órdenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.count}</div>
              <p className="text-xs text-muted-foreground mt-1">completadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex gap-2">
                <TrendingUp size={16} /> Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.avg.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">por orden</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${cashBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {topProducts.length > 0 ? (
                  topProducts.map((p, i) => (
                    <div key={i} className="flex justify-between pb-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{i + 1}. {p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.qty} unidades</p>
                      </div>
                      <p className="font-bold">${p.revenue.toFixed(0)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin ventas</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Efectivo</span>
                  <span className="font-bold">{paymentMethods.cash}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarjeta</span>
                  <span className="font-bold">{paymentMethods.card}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transferencia</span>
                  <span className="font-bold">{paymentMethods.transfer}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-xs font-semibold">
                      <th className="pb-3 px-2 w-12"></th>
                      <th className="pb-3 px-2 text-left">#</th>
                      <th className="pb-3 px-2 text-left">Tipo</th>
                      <th className="pb-3 px-2 text-center">Items</th>
                      <th className="pb-3 px-2 text-center">Pago</th>
                      <th className="pb-3 px-2">Fecha</th>
                      <th className="pb-3 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 50).map((o, i) => (
                      <Fragment key={`order-${i}`}>
                        <tr className="border-b hover:bg-secondary cursor-pointer">
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() =>
                                setExpandedOrderId(expandedOrderId === i ? null : i)
                              }
                              className="p-0"
                            >
                              <ChevronDown
                                size={18}
                                className={`transition-transform ${
                                  expandedOrderId === i ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </td>
                          <td className="py-2 px-2">{o.id || "-"}</td>
                          <td className="py-2 px-2">
                            {o.orderType === "local" ? "Local" : "Delivery"}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold">
                            {o.items?.length || 0}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {o.paymentMethod === "cash"
                              ? "Efectivo"
                              : o.paymentMethod === "card"
                              ? "Tarjeta"
                              : "Transferencia"}
                          </td>
                          <td className="py-2 px-2 text-xs">
                            {new Date(
                              o.timestamp ?? o.createdAt ?? new Date()
                            ).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-accent">
                            ${(o.total || 0).toFixed(2)}
                          </td>
                        </tr>
                        {expandedOrderId === i && o.items && (
                          <tr key={`expanded-${i}`} className="bg-secondary/50 border-b">
                            <td colSpan="7" className="px-4 py-4">
                              <div className="ml-4">
                                <h4 className="font-semibold mb-3 text-sm">
                                  Items pedidos:
                                </h4>
                                <div className="space-y-2">
                                  {o.items && o.items.length > 0 ? (
                                    o.items.map((item, idx) => {
                                      const product = item.product || (typeof item === 'object' && 'name' in item ? item : null);
                                      if (!product || !product.name) {
                                        return (
                                          <div key={idx} className="text-sm text-muted-foreground bg-background/50 p-2 rounded">
                                            Item sin información
                                          </div>
                                        );
                                      }
                                      return (
                                        <div
                                          key={idx}
                                          className="flex justify-between items-center text-sm bg-background/50 p-2 rounded"
                                        >
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {product.name}
                                            </p>
                                            {item.notes && (
                                              <p className="text-xs text-muted-foreground">
                                                Notas: {item.notes}
                                              </p>
                                            )}
                                          </div>
                                          <div className="text-right ml-4">
                                            <p className="font-semibold">x{item.quantity}</p>
                                            <p className="text-xs text-muted-foreground">
                                              ${(
                                                (product.price || 0) *
                                                (item.quantity || 1)
                                              ).toFixed(2)}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-sm text-muted-foreground">Sin items</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sin órdenes
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
