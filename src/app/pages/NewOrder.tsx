import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Product, OrderItem, Order } from '../context/AppContext';
import { ArrowLeft, Plus, Minus, ShoppingCart, Send, Store, Truck, CreditCard, DollarSign, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { abrirParaImprimirPDF } from '../../services/ticket-pdf.service';

export default function NewOrder() {
  const navigate = useNavigate();
  const { products, categories, createOrder } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<'local' | 'delivery'>('local');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [tableNumber, setTableNumber] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState({
    customerName: '',
    phone: '',
    address: '',
  });

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (orderType === 'delivery') {
      if (!deliveryInfo.customerName || !deliveryInfo.phone || !deliveryInfo.address) {
        toast.error('Por favor completa la información de delivery');
        return;
      }
    }

    try {
      console.log('handleSendToKitchen: Iniciando...');
      
      // Crear la orden y obtener su ID
      const ordenId = await createOrder(
        cart,
        orderType,
        paymentMethod,
        orderType === 'local' ? tableNumber || undefined : undefined,
        orderType === 'delivery' ? deliveryInfo : undefined
      );

      console.log('handleSendToKitchen: Orden creada con ID:', ordenId);

      // Crear objeto de la orden para generar ticket
      const orderObject: Order = {
        id: ordenId,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
        status: 'pending',
        timestamp: new Date(),
        orderType,
        paymentMethod,
        tableNumber: orderType === 'local' ? tableNumber : undefined,
        deliveryInfo: orderType === 'delivery' ? deliveryInfo : undefined,
      };

      // Guardar la orden en state
      setLastOrder(orderObject);

      toast.success('Orden enviada a cocina ✓');
      setCart([]);
      setTableNumber('');
      setDeliveryInfo({ customerName: '', phone: '', address: '' });

      // IMPRIMIR TICKET INMEDIATAMENTE
      console.log('handleSendToKitchen: Llamando a abrirParaImprimirPDF...');
      await abrirParaImprimirPDF(orderObject);
      console.log('handleSendToKitchen: Completado');
      
    } catch (error) {
      toast.error('Error al crear la orden');
      console.error('ERROR en handleSendToKitchen:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-secondary transition-colors rounded"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
                Nueva Orden
              </h1>
            </div>
          </div>

          {/* Order Type Selector */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setOrderType('local')}
              className={`flex-1 px-6 py-3 rounded transition-all flex items-center justify-center gap-2 ${
                orderType === 'local'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <Store size={20} />
              Comer en Local
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex-1 px-6 py-3 rounded transition-all flex items-center justify-center gap-2 ${
                orderType === 'delivery'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <Truck size={20} />
              Delivery
            </button>
          </div>

          {/* Payment Method Selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex-1 px-4 py-2 rounded transition-all flex items-center justify-center gap-2 text-sm ${
                paymentMethod === 'cash'
                  ? 'bg-green-600 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-green-600/20'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <DollarSign size={16} />
              Efectivo
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 px-4 py-2 rounded transition-all flex items-center justify-center gap-2 text-sm ${
                paymentMethod === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-blue-600/20'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <CreditCard size={16} />
              Tarjeta
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex-1 px-4 py-2 rounded transition-all flex items-center justify-center gap-2 text-sm ${
                paymentMethod === 'transfer'
                  ? 'bg-purple-600 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-purple-600/20'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <Landmark size={16} />
              Transferencia
            </button>
          </div>

          {/* Conditional Inputs */}
          {orderType === 'local' ? (
            <div className="mt-4">
              <input
                type="text"
                placeholder="# Mesa (opcional)"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded bg-input text-center"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Nombre del cliente *"
                value={deliveryInfo.customerName}
                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, customerName: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded bg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
              <input
                type="tel"
                placeholder="Teléfono *"
                value={deliveryInfo.phone}
                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded bg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
              <input
                type="text"
                placeholder="Dirección de entrega *"
                value={deliveryInfo.address}
                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded bg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Products Section */}
        <div className="flex-1 p-6">
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-2 rounded whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-2 rounded whitespace-nowrap transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-card border border-border p-6 rounded hover:border-accent hover:shadow-lg transition-all text-left group"
              >
                <div className="aspect-square bg-secondary rounded mb-4 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform">
                  🥟
                </div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {product.name}
                </h3>
                <p className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.125rem', fontWeight: 600 }}>
                  ${product.price}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-96 bg-card border-l border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart size={24} className="text-accent" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Carrito
              </h2>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
              {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p style={{ fontFamily: 'var(--font-sans)' }}>El carrito está vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="border border-border rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-destructive hover:underline text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                      ${item.product.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-border space-y-4">
            <div className="flex justify-between items-center">
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Total
              </span>
              <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700 }}>
                ${total}
              </span>
            </div>
            {lastOrder ? (
              <div className="space-y-2">
                <button
                  onClick={() => setLastOrder(null)}
                  className="w-full bg-secondary text-secondary-foreground py-3 rounded hover:opacity-90 transition-opacity"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1rem' }}
                >
                  Nueva Orden
                </button>
              </div>
            ) : (
              <button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="w-full bg-accent text-accent-foreground py-4 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem' }}
              >
                <Send size={20} />
                Enviar a Cocina
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
