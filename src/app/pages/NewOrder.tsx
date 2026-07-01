import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Product, OrderItem, Order } from '../context/AppContext';
import { ArrowLeft, Plus, Minus, ShoppingCart, Send, X, DollarSign, CreditCard, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { abrirParaImprimirPDF } from '../../services/ticket-pdf.service';
import { PromotionCodeInput } from '../components/PromotionCodeInput';
import { ComboVariantDialog } from '../components/ComboVariantDialog';
import { filterProductsByCategory } from '../../config/categories.config';
import { needsComboVariantSelector } from '../../config/inventory.config';
import { calculateOrderPricing } from '../../services/auto-promotions.service';
import type { DiscountResult } from '../../services/discount.service';

export default function NewOrder() {
  const navigate = useNavigate();
  const { products, categories, discounts, autoPromotions, redeemPromotion, createOrder, addPendingDelivery } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({
    customerName: '',
    phone: '',
    address: '',
  });
  // Estados para el diálogo de pago
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [change, setChange] = useState(0);
  const [selectedDeliveryFee, setSelectedDeliveryFee] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showOrderMethodDialog, setShowOrderMethodDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [itemComments, setItemComments] = useState<Record<string, string>>({});
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [pendingComboProduct, setPendingComboProduct] = useState<Product | null>(null);
  const [showComboVariantDialog, setShowComboVariantDialog] = useState(false);

  const getCartWithComments = (): OrderItem[] =>
    cart.map(item => ({
      ...item,
      comment: itemComments[item.product.id]?.trim() || item.comment,
    }));


  const filteredProducts = filterProductsByCategory(products, selectedCategory);

  const addToCart = (product: Product, variants?: OrderItem['variants']) => {
    if (variants) {
      setCart([...cart, { product, quantity: 1, variants }]);
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id && !item.variants);
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

  const orderPricing = useMemo(
    () => calculateOrderPricing(cart, autoPromotions, products),
    [cart, autoPromotions, products]
  );

  const autoPromotionSummary = {
    subtotal: orderPricing.subtotal,
    autoPromotionDiscount: orderPricing.autoPromotionDiscount,
    totalAfterAutoPromotions: orderPricing.total,
    appliedPromotions: orderPricing.appliedPromotions,
  };

  const paymentTotal = discountResult?.total ?? orderPricing.total;

  const handleAddProduct = (product: Product) => {
    if (needsComboVariantSelector(product)) {
      setPendingComboProduct(product);
      setShowComboVariantDialog(true);
      return;
    }

    addToCart(product);
  };

  const handleConfirmComboVariants = (variants: OrderItem['variants']) => {
    if (!pendingComboProduct) return;
    addToCart(pendingComboProduct, variants);
    toast.success(`${pendingComboProduct.name} agregado`);
    setShowComboVariantDialog(false);
    setPendingComboProduct(null);
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!deliveryInfo.customerName || !deliveryInfo.phone || !deliveryInfo.address) {
      toast.error('Por favor completa la información de delivery');
      return;
    }

    setShowCommentsDialog(true);
  };

  const handleConfirmComments = () => {
    setShowCommentsDialog(false);
    setShowOrderMethodDialog(true);
  };

  const handleSendWithoutPaying = async () => {
    setSendingToKitchen(true);
    try {
      const fee = 40;

      await addPendingDelivery(
        getCartWithComments(),
        deliveryInfo.customerName,
        deliveryInfo.phone,
        deliveryInfo.address,
        fee
      );

      toast.success('Comanda enviada a cocina ✓ — Pago pendiente');

      setCart([]);
      setItemComments({});
      setDeliveryInfo({ customerName: '', phone: '', address: '' });
      setShowOrderMethodDialog(false);
    } catch (error) {
      toast.error('Error al enviar a cocina');
      console.error('ERROR:', error);
    } finally {
      setSendingToKitchen(false);
    }
  };

  const handlePayNow = async () => {
    setShowOrderMethodDialog(false);
    // Mostrar diálogo de pago
    setDiscountResult(null);
    setShowPaymentDialog(true);
    setAmountReceived('');
    setChange(0);
    setSelectedDeliveryFee(null);
  };

  const handleConfirmPayment = async () => {
    // Prevenir clics múltiples
    if (processingPayment) return;
    setProcessingPayment(true);

    const received = paymentMethod === 'card' ? paymentTotal : parseFloat(amountReceived);

    if (isNaN(received) || received === 0) {
      toast.error('Ingresa un monto válido');
      setProcessingPayment(false);
      return;
    }

    if (selectedDeliveryFee === null) {
      toast.error('Por favor selecciona un monto de envío');
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
      await createAndPrintOrder(received, calculatedChange, selectedDeliveryFee);
      setShowPaymentDialog(false);
      // Limpiar estados de pago
      setAmountReceived('');
      setSelectedDeliveryFee(null);
      setDiscountResult(null);
    } catch (error) {
      toast.error('Error al crear la orden');
      console.error('ERROR en handleConfirmPayment:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const createAndPrintOrder = async (received?: number, calculatedChange?: number, deliveryFee?: number) => {
    try {
      console.log('createAndPrintOrder: Iniciando...');
      
      const cartWithComments = getCartWithComments();
      const pricing = calculateOrderPricing(cartWithComments, autoPromotions, products);
      const pricedItems = pricing.items.map((item, index) => {
        if (item.product.price === 0) return item;
        const source = cartWithComments[index];
        return source
          ? { ...item, comment: source.comment, variants: source.variants }
          : item;
      });
      const orderTotal = discountResult?.total ?? pricing.total;

      const ordenId = await createOrder(
        pricedItems,
        'delivery',
        paymentMethod,
        undefined,
        deliveryInfo,
        received,
        calculatedChange,
        deliveryFee,
        undefined,
        discountResult?.discountApplied,
        orderTotal
      );

      console.log('createAndPrintOrder: Orden creada con ID:', ordenId);

      const orderItemComments: Record<string, string> = {};
      cartWithComments.forEach((item, idx) => {
        if (item.comment?.trim()) {
          orderItemComments[String(idx)] = item.comment.trim();
        }
      });
      const kitchenNote = cartWithComments
        .map(item => item.comment?.trim() ? `${item.product.name} x${item.quantity}: ${item.comment.trim()}` : null)
        .filter(Boolean)
        .join('\n');

      // Crear objeto de la orden para generar ticket
      const orderObject: Order = {
        id: ordenId,
        items: pricedItems,
        total: orderTotal,
        originalTotal: pricing.subtotal,
        discountApplied: discountResult?.discountApplied,
        status: 'pending',
        timestamp: new Date(),
        orderType: 'delivery',
        paymentMethod: 'cash',
        deliveryInfo: deliveryInfo,
        amountReceived: received,
        change: calculatedChange,
        deliveryFee: deliveryFee,
        tip: undefined,
        itemComments: Object.keys(orderItemComments).length > 0 ? orderItemComments : undefined,
        kitchenNote: kitchenNote || undefined,
      };

      // Guardar la orden en state
      setLastOrder(orderObject);

      toast.success('Orden enviada a cocina ✓');
      setCart([]);
      setItemComments({});
      setDeliveryInfo({ customerName: '', phone: '', address: '' });
      setAmountReceived('');
      setChange(0);
      setSelectedDeliveryFee(null);
      setPaymentMethod('cash');
      setPaymentMethod('cash');

      // IMPRIMIR TICKET INMEDIATAMENTE
      console.log('createAndPrintOrder: Llamando a abrirParaImprimirPDF...');
      await abrirParaImprimirPDF(orderObject);
      console.log('createAndPrintOrder: Completado');
      
    } catch (error) {
      console.error('ERROR en createAndPrintOrder:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-secondary transition-colors rounded"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Delivery
              </h1>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="lg:hidden p-2 hover:bg-secondary transition-colors rounded relative"
            >
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* Delivery Info Inputs */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nombre del cliente *"
              value={deliveryInfo.customerName}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, customerName: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded bg-input text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <input
              type="tel"
              placeholder="Teléfono *"
              value={deliveryInfo.phone}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded bg-input text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <input
              type="text"
              placeholder="Dirección de entrega *"
              value={deliveryInfo.address}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded bg-input text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-3 md:p-6 flex flex-col overflow-hidden">
          {/* Category Filter */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2 flex-shrink-0 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded whitespace-nowrap text-sm transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded whitespace-nowrap text-sm transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 overflow-y-auto flex-1">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="bg-card border border-border p-3 md:p-6 rounded hover:border-accent hover:shadow-lg transition-all text-left group"
              >
                <div className="aspect-square bg-secondary rounded mb-2 md:mb-4 flex items-center justify-center text-2xl md:text-4xl group-hover:scale-105 transition-transform">
                  🥟
                </div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }} className="md:text-base line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-accent md:text-lg" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600 }}>
                  ${product.price}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section - Desktop */}
        <div className="hidden lg:flex lg:w-80 bg-card border-l border-border flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart size={24} className="text-accent" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 600 }}>
                Carrito
              </h2>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
              {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p style={{ fontFamily: 'var(--font-sans)' }}>El carrito está vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="border border-border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }} className="line-clamp-1">
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-destructive hover:underline text-xs"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-10 h-10 md:w-8 md:h-8 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px]"
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, minWidth: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-10 h-10 md:w-8 md:h-8 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] md:min-w-[32px] md:minmin-h-[32px]"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }}>
                      ${item.product.price * item.quantity}
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
                ${total}
              </span>
            </div>
            {lastOrder ? (
              <button
                onClick={() => setLastOrder(null)}
                className="w-full bg-secondary text-secondary-foreground py-2 rounded hover:opacity-90 transition-opacity text-sm"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                Nueva Orden
              </button>
            ) : (
              <button
                onClick={handleSendToKitchen}
                disabled={cart.length === 0}
                className="w-full bg-accent text-accent-foreground py-3 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                <Send size={16} />
                Enviar
              </button>
            )}
          </div>
        </div>

        {/* Cart Drawer - Mobile */}
        {showCart && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowCart(false)}>
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart size={24} className="text-accent" />
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontWeight: 600 }}>
                    Carrito
                  </h2>
                </div>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                    <p style={{ fontFamily: 'var(--font-sans)' }}>El carrito está vacío</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="border border-border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }} className="line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-destructive hover:underline text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-10 h-10 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors min-w-[44px] min-h-[44px]"
                          >
                            <Minus size={16} />
                          </button>
                          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, minWidth: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-10 h-10 rounded bg-secondary hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors min-w-[44px] min-h-[44px]"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <span className="text-accent" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }}>
                          ${item.product.price * item.quantity}
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
                    ${total}
                  </span>
                </div>
                {lastOrder ? (
                  <button
                    onClick={() => {
                      setLastOrder(null);
                      setShowCart(false);
                    }}
                    className="w-full bg-secondary text-secondary-foreground py-2 rounded hover:opacity-90 transition-opacity text-sm"
                    style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                  >
                    Nueva Orden
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSendToKitchen();
                      setShowCart(false);
                    }}
                    disabled={cart.length === 0}
                    className="w-full bg-accent text-accent-foreground py-3 rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                    style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
              {cart.map(item => (
                <div key={item.product.id} className="border border-border rounded p-3">
                  <p className="font-semibold text-sm mb-2">
                    {item.product.name} x{item.quantity}
                  </p>
                  <input
                    type="text"
                    placeholder="Ej: sin cebolla, extra picante..."
                    value={itemComments[item.product.id] || ''}
                    onChange={(e) => setItemComments({
                      ...itemComments,
                      [item.product.id]: e.target.value,
                    })}
                    className="w-full px-3 py-2 border border-border rounded bg-input text-sm"
                    style={{ fontFamily: 'var(--font-sans)' }}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCommentsDialog(false)}
                className="flex-1 px-4 py-3 border border-border rounded hover:bg-secondary transition-colors"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmComments}
                className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 transition-all flex items-center justify-center gap-2"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                <Send size={16} />
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Method Dialog */}
      {showOrderMethodDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-8 w-96 shadow-lg">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }} className="mb-6">
              ¿Cómo proceder?
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleSendWithoutPaying}
                disabled={sendingToKitchen}
                className="w-full py-4 px-6 bg-secondary border border-border rounded hover:border-accent transition-all text-center group disabled:opacity-50"
              >
                <p className="font-semibold group-hover:text-accent">📋 Enviar sin Pagar</p>
                <p className="text-xs text-muted-foreground mt-1">Envía comanda a cocina al instante</p>
                <p className="text-xs text-muted-foreground mt-1">Cobrar cuando el repartidor llegue</p>
              </button>

              <button
                onClick={handlePayNow}
                className="w-full py-4 px-6 bg-accent text-accent-foreground rounded hover:opacity-90 transition-all text-center"
              >
                <p className="font-semibold">💳 Pagar Ahora</p>
                <p className="text-xs opacity-90 mt-1">Cobrar inmediatamente</p>
                <p className="text-xs opacity-90 mt-1">Imprimir ticket al instante</p>
              </button>

              <button
                onClick={() => setShowOrderMethodDialog(false)}
                className="w-full py-3 px-6 border border-border rounded hover:bg-secondary transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog for Delivery */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-8 w-96 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
                Pago Delivery
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
                items={cart}
                discounts={discounts}
                redeemPromotion={redeemPromotion}
                onDiscountChange={setDiscountResult}
                autoPromotionSummary={autoPromotionSummary}
              />

              <div className="bg-secondary p-4 rounded">
                <p className="text-muted-foreground text-sm mb-2">Total a Pagar:</p>
                {discountResult || orderPricing.autoPromotionDiscount > 0 ? (
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

              {/* Delivery Fee Buttons */}
              <div>
                <label className="block text-sm font-medium mb-3">Seleccionar Monto de Envío:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[35, 40, 45, 50].map((fee) => (
                    <button
                      key={fee}
                      onClick={() => setSelectedDeliveryFee(fee)}
                      className={`py-3 rounded font-semibold transition-all ${
                        selectedDeliveryFee === fee
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary border border-border hover:bg-accent/20'
                      }`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      ${fee}
                    </button>
                  ))}
                </div>
                {selectedDeliveryFee && (
                  <p className="text-xs text-green-600 mt-2 font-medium">✓ Envío: ${selectedDeliveryFee} seleccionado</p>
                )}
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
                  onClick={handleConfirmPayment}
                  disabled={processingPayment || selectedDeliveryFee === null || (paymentMethod === 'cash' ? !amountReceived || change < 0 : false)}
                  className="flex-1 px-4 py-3 bg-accent text-accent-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  {processingPayment ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ComboVariantDialog
        product={pendingComboProduct}
        open={showComboVariantDialog}
        onConfirm={handleConfirmComboVariants}
        onCancel={() => {
          setShowComboVariantDialog(false);
          setPendingComboProduct(null);
        }}
      />
    </div>
  );
}
