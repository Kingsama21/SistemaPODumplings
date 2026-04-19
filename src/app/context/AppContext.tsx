import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import * as productosService from '../../services/productos.service';
import * as categoriasService from '../../services/categorias.service';
import * as ordenesService from '../../services/ordenes.service';
import * as cajaService from '../../services/caja.service';
import { abrirCajon } from '../../services/cajon.service';
import { abrirParaImprimirEgresoPDF } from '../../services/ticket-pdf.service';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  // Productos NO tienen stock (se hacen al momento)
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string; // kg, L, unidad, etc
  minStock?: number;
  lastRestockedAt?: Date;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed'; // % o monto fijo
  value: number; // porcentaje o monto
  applicableTo?: 'all' | 'product' | 'order'; // a qué aplica
  targetId?: string; // ID del producto si es aplicable a uno específico
  active: boolean;
  createdAt: Date;
}

export interface Promotion {
  id: string;
  code: string;
  discount: Discount;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: Date;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  discount?: Discount; // Descuento aplicado a este item
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  discountApplied?: Discount; // Descuento de orden (si aplica)
  originalTotal?: number; // Total antes del descuento
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  timestamp: Date;
  tableNumber?: string;
  orderType: 'local' | 'delivery';
  paymentMethod: 'cash' | 'card' | 'transfer';
  amountReceived?: number; // Monto recibido del cliente (para dine-in efectivo)
  change?: number; // Cambio del cliente (para dine-in efectivo)
  deliveryInfo?: {
    customerName: string;
    phone: string;
    address: string;
  };
}

export interface CashTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  timestamp: Date;
  orderId?: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
}

interface AppContextType {
  products: Product[];
  ingredients: Ingredient[];
  categories: Category[];
  orders: Order[];
  cashTransactions: CashTransaction[];
  discounts: Discount[];
  promotions: Promotion[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => void;
  createOrder: (
    items: OrderItem[],
    orderType: 'local' | 'delivery',
    paymentMethod: 'cash' | 'card' | 'transfer',
    tableNumber?: string,
    deliveryInfo?: { customerName: string; phone: string; address: string },
    amountReceived?: number,
    change?: number
  ) => Promise<string>;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  updateOrderPaymentMethod: (id: string, paymentMethod: 'cash' | 'card' | 'transfer') => void;
  deleteCashTransactionsByDateRange: (startDate: Date, endDate: Date) => void;
  deleteCashTransactionsByOrderId: (orderId: string) => Promise<number>;
  deleteAllOrders: () => Promise<number>;
  deleteAllCashTransactions: () => Promise<number>;
  addExpense: (amount: number, description: string) => void;
  // Ingredientes/Insumos (con inventario)
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => void;
  updateIngredientStock: (id: string, newStock: number) => Promise<void>;
  adjustIngredientStock: (id: string, adjustment: number) => Promise<void>;
  getLowStockIngredients: (threshold: number) => Ingredient[];
  // Descuentos
  createDiscount: (discount: Omit<Discount, 'id' | 'createdAt'>) => Promise<string>;
  updateDiscount: (id: string, discount: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  // Promociones
  createPromotion: (promotion: Omit<Promotion, 'id'>) => Promise<string>;
  updatePromotion: (id: string, promotion: Partial<Promotion>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  redeemPromotion: (code: string) => Promise<Discount | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialCategories: Category[] = [
  { id: '1', name: 'Dumplings' },
  { id: '2', name: 'Sopas' },
  { id: '3', name: 'Arroces' },
  { id: '4', name: 'Bebidas' },
];

const initialProducts: Product[] = [
  { id: '1', name: 'Dumplings de Cerdo', price: 85, category: 'Dumplings' },
  { id: '2', name: 'Dumplings de Pollo', price: 80, category: 'Dumplings' },
  { id: '3', name: 'Dumplings Vegetarianos', price: 75, category: 'Dumplings' },
  { id: '4', name: 'Sopa Wonton', price: 95, category: 'Sopas' },
  { id: '5', name: 'Sopa Miso', price: 70, category: 'Sopas' },
  { id: '6', name: 'Arroz Frito', price: 90, category: 'Arroces' },
  { id: '7', name: 'Arroz Blanco', price: 35, category: 'Arroces' },
  { id: '8', name: 'Té Verde', price: 30, category: 'Bebidas' },
  { id: '9', name: 'Agua', price: 20, category: 'Bebidas' },
];

const initialIngredients: Ingredient[] = [
  { id: 'ing_1', name: 'Carne Molida de Cerdo', stock: 5, unit: 'kg', minStock: 2 },
  { id: 'ing_2', name: 'Carne Molida de Pollo', stock: 4, unit: 'kg', minStock: 2 },
  { id: 'ing_3', name: 'Verdura Mixta (Col, Zanahoria)', stock: 8, unit: 'kg', minStock: 3 },
  { id: 'ing_4', name: 'Camarón Fresco', stock: 3, unit: 'kg', minStock: 1 },
  { id: 'ing_5', name: 'Agua', stock: 50, unit: 'L', minStock: 20 },
  { id: 'ing_6', name: 'Té Verde', stock: 2, unit: 'kg', minStock: 1 },
  { id: 'ing_7', name: 'Té Negro', stock: 2, unit: 'kg', minStock: 1 },
  { id: 'ing_8', name: 'Harina', stock: 10, unit: 'kg', minStock: 5 },
];


// LocalStorage keys (para fallback)
const STORAGE_KEYS = {
  PRODUCTS: 'dumplings_products',
  CATEGORIES: 'dumplings_categories',
  ORDERS: 'dumplings_orders',
  CASH_TRANSACTIONS: 'dumplings_cash_transactions',
  DISCOUNTS: 'dumplings_discounts',
  PROMOTIONS: 'dumplings_promotions',
  INGREDIENTS: 'dumplings_ingredients',
};

// LocalStorage utilities (para fallback)
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return fallback;
  }
};

const saveToStorage = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => loadFromStorage(STORAGE_KEYS.INGREDIENTS, initialIngredients));
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>(() => loadFromStorage(STORAGE_KEYS.DISCOUNTS, []));
  const [promotions, setPromotions] = useState<Promotion[]>(() => loadFromStorage(STORAGE_KEYS.PROMOTIONS, []));
  const [loading, setLoading] = useState(true);

  // ============================================
  // SINCRONIZAR CON FIREBASE EN TIEMPO REAL
  // ============================================

  useEffect(() => {
    setLoading(true);
    
    // Escuchar productos
    const unsubProductos = productosService.onProductosChange(
      (data) => {
        const products = data
          .filter(p => p.id && p.id.trim()) // Filtrar productos sin ID
          .map(p => ({
            id: p.id,
            name: p.nombre,
            price: p.precio,
            category: p.categoria,
            image: p.imagen,
          } as Product));
        setProducts(products);
      },
      (error) => console.error('Error en productos:', error)
    );

    // Escuchar categorías
    const unsubCategorias = categoriasService.onCategoriasChange(
      (data) => {
        const cats = data
          .filter(c => c.id && c.id.trim()) // Filtrar categorías sin ID
          .map(c => ({
            id: c.id,
            name: c.nombre,
          } as Category));
        setCategories(cats);
      },
      (error) => console.error('Error en categorías:', error)
    );

    // Escuchar TODAS las órdenes (incluyendo completadas)
    const unsubOrdenes = ordenesService.onOrdenesChange(
      (data) => {
        // Mapeo de estados de Firebase (español) a React (inglés)
        const statusMap: Record<string, Order['status']> = {
          'pending': 'pending',
          'preparing': 'preparing',
          'ready': 'ready',
          'completed': 'completed',
          'cancelled': 'cancelled',
          'pendiente': 'pending',
          'en_preparacion': 'preparing',
          'listo': 'ready',
          'completada': 'completed',
          'cancelada': 'cancelled',
        };

        const ordenes = data
          .filter(o => o.id && o.id.trim()) // Filtrar órdenes sin ID
          .map((o: any) => {
            // Soportar ambos formatos (nuevo y antiguo)
            const status = statusMap[o.status || o.estado] || 'pending';
            const items = o.items || (o.productos?.map((p: any) => ({
              product: {
                id: p.id,
                name: p.nombre,
                price: p.precio,
                category: '',
              },
              quantity: p.cantidad,
            })));
            const paymentMethod = (o.paymentMethod || o.metodoPago || 'cash') as 'cash' | 'card' | 'transfer';
            const timestamp = o.timestamp || o.createdAt;

            return {
              id: o.id,
              items: items || [],
              total: o.total,
              status,
              timestamp,
              createdAt: timestamp, // Mapear también como createdAt para compatibilidad
              tableNumber: o.tableNumber || o.numeroMesa,
              orderType: o.type || o.tipo,
              paymentMethod,
              deliveryInfo: o.deliveryInfo || o.cliente,
            } as Order;
          });
        setOrders(ordenes);
      },
      (error) => console.error('Error en órdenes:', error)
    );

    // Escuchar movimientos de caja
    const unsubCaja = cajaService.onMovimientosChange(
      (data) => {
        const movimientos = data
          .filter(m => m.id && m.id.trim()) // Filtrar movimientos sin ID
          .map((m: any) => {
            // Soportar ambos formatos (antiguo y nuevo)
            const type = m.type || (m.tipo === 'ingreso' ? 'income' : 'expense');
            const amount = m.amount ?? m.monto ?? 0;
            const description = m.description ?? m.motivo ?? '';
            const timestamp = m.timestamp ?? m.createdAt ?? new Date();
            const orderId = m.ordenId;

            // Extraer método de pago de la descripción o del campo directo
            let paymentMethod: 'cash' | 'card' | 'transfer' | undefined = m.paymentMethod;
            if (!paymentMethod && description) {
              if (description.includes('Efectivo')) paymentMethod = 'cash';
              else if (description.includes('Tarjeta')) paymentMethod = 'card';
              else if (description.includes('Transferencia')) paymentMethod = 'transfer';
            }

            return {
              id: m.id,
              type: type as 'income' | 'expense',
              amount,
              description,
              timestamp,
              orderId,
              paymentMethod,
            } as CashTransaction;
          });
        setCashTransactions(movimientos);
      },
      (error) => console.error('Error en caja:', error)
    );

    setLoading(false);

    // Desuscribirse al desmontar
    return () => {
      unsubProductos();
      unsubCategorias();
      unsubOrdenes();
      unsubCaja();
    };
  }, []);

  // ============================================
  // FUNCIONES PARA PRODUCTOS
  // ============================================

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      await productosService.addProducto({
        nombre: product.name,
        precio: product.price,
        categoria: product.category,
        imagen: product.image || '',
      });
    } catch (error) {
      console.error('Error agregando producto:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updatedProduct: Partial<Product>) => {
    try {
      await productosService.updateProducto(id, {
        nombre: updatedProduct.name,
        precio: updatedProduct.price,
        categoria: updatedProduct.category,
        imagen: updatedProduct.image,
      });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productosService.deleteProducto(id);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  };

  // ============================================
  // FUNCIONES PARA CATEGORÍAS
  // ============================================

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      await categoriasService.addCategoria(category.name);
    } catch (error) {
      console.error('Error agregando categoría:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      await categoriasService.updateCategoria(id, name);
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoriasService.deleteCategoria(id);
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      throw error;
    }
  };

  // ============================================
  // FUNCIONES PARA ÓRDENES
  // ============================================

  const createOrder = async (
    items: OrderItem[],
    orderType: 'local' | 'delivery',
    paymentMethod: 'cash' | 'card' | 'transfer',
    tableNumber?: string,
    deliveryInfo?: { customerName: string; phone: string; address: string },
    amountReceived?: number,
    change?: number
  ): Promise<string> => {
    try {
      const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      const productos = items.map(item => ({
        id: item.product.id,
        nombre: item.product.name,
        precio: item.product.price,
        cantidad: item.quantity,
      }));

      // Crear orden
      const ordenId = await ordenesService.crearOrden(
        orderType,
        productos,
        total,
        tableNumber,
        deliveryInfo && {
          nombre: deliveryInfo.customerName,
          telefono: deliveryInfo.phone,
          direccion: deliveryInfo.address,
        },
        paymentMethod,
        amountReceived,
        change
      );

      // Registrar ingreso automáticamente
      await cajaService.registrarIngreso(
        total,
        `Orden #${ordenId.slice(-4)}${orderType === 'delivery' ? ' - Delivery' : ''} (${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'})`,
        ordenId
      );

      // Retornar el ID de la orden creada
      return ordenId;
    } catch (error) {
      console.error('Error creando orden:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const statusMap = {
        'pending': 'pendiente',
        'preparing': 'en_preparacion',
        'ready': 'listo',
        'completed': 'completada',
        'cancelled': 'cancelada',
      };
      await ordenesService.actualizarEstadoOrden(id, statusMap[status]);
    } catch (error) {
      console.error('Error actualizando estado de orden:', error);
      throw error;
    }
  };

  const updateOrderPaymentMethod = (id: string, paymentMethod: 'cash' | 'card' | 'transfer') => {
    try {
      const updated = orders.map(o => 
        o.id === id ? { ...o, paymentMethod } : o
      );
      setOrders(updated);
      saveToStorage(STORAGE_KEYS.ORDERS, updated);
    } catch (error) {
      console.error('Error actualizando método de pago:', error);
      throw error;
    }
  };

  const deleteCashTransactionsByDateRange = async (startDate: Date, endDate: Date) => {
    try {
      const count = await cajaService.deleteMovimientosByDateRange(startDate, endDate);
      console.log(`${count} transacciones eliminadas de Firebase`);
    } catch (error) {
      console.error('Error eliminando transacciones de caja:', error);
      throw error;
    }
  };

  const deleteCashTransactionsByOrderId = async (orderId: string): Promise<number> => {
    try {
      const count = await cajaService.deleteMovimientosByOrderId(orderId);
      console.log(`${count} transacciones eliminadas para orden ${orderId}`);
      return count;
    } catch (error) {
      console.error('Error eliminando transacciones por orden:', error);
      throw error;
    }
  };

  const deleteAllOrders = async (): Promise<number> => {
    try {
      const count = await ordenesService.deleteAllOrders();
      console.log(`✓ ${count} órdenes eliminadas`);
      return count;
    } catch (error) {
      console.error('Error eliminando todas las órdenes:', error);
      throw error;
    }
  };

  const deleteAllCashTransactions = async (): Promise<number> => {
    try {
      const count = await cajaService.deleteAllCashTransactions();
      console.log(`✓ ${count} transacciones de caja eliminadas`);
      return count;
    } catch (error) {
      console.error('Error eliminando todas las transacciones:', error);
      throw error;
    }
  };

  // ============================================
  // FUNCIONES PARA CAJA
  // ============================================

  const addExpense = async (amount: number, description: string) => {
    try {
      await cajaService.registrarEgreso(amount, description);
      // Abrir ticket de egreso para imprimir (esto abrirá la caja)
      setTimeout(() => {
        abrirParaImprimirEgresoPDF(amount, description);
      }, 500);
    } catch (error) {
      console.error('Error registrando egreso:', error);
      throw error;
    }
  };

  // ============================================
  // FUNCIONES PARA INVENTARIO (INGREDIENTES)
  // ============================================

  const addIngredient = (ingredient: Omit<Ingredient, 'id'>) => {
    try {
      const id = `ing_${Date.now()}`;
      const newIngredient: Ingredient = {
        ...ingredient,
        id,
        lastRestockedAt: new Date()
      };
      const updated = [...ingredients, newIngredient];
      setIngredients(updated);
      saveToStorage(STORAGE_KEYS.INGREDIENTS, updated);
    } catch (error) {
      console.error('Error agregando ingrediente:', error);
      throw error;
    }
  };

  const updateIngredient = async (id: string, ingredient: Partial<Ingredient>) => {
    try {
      const updated = ingredients.map(i => (i.id === id ? { ...i, ...ingredient } : i));
      setIngredients(updated);
      saveToStorage(STORAGE_KEYS.INGREDIENTS, updated);
    } catch (error) {
      console.error('Error actualizando ingrediente:', error);
      throw error;
    }
  };

  const deleteIngredient = (id: string) => {
    try {
      const updated = ingredients.filter(i => i.id !== id);
      setIngredients(updated);
      saveToStorage(STORAGE_KEYS.INGREDIENTS, updated);
    } catch (error) {
      console.error('Error eliminando ingrediente:', error);
      throw error;
    }
  };

  const updateIngredientStock = async (id: string, newStock: number) => {
    try {
      const updated = ingredients.map(i => 
        i.id === id ? { ...i, stock: newStock, lastRestockedAt: new Date() } : i
      );
      setIngredients(updated);
      saveToStorage(STORAGE_KEYS.INGREDIENTS, updated);
    } catch (error) {
      console.error('Error actualizando stock:', error);
      throw error;
    }
  };

  const adjustIngredientStock = async (id: string, adjustment: number) => {
    try {
      const ingredient = ingredients.find(i => i.id === id);
      if (!ingredient) throw new Error('Ingrediente no encontrado');
      const newStock = Math.max(0, ingredient.stock + adjustment);
      await updateIngredientStock(id, newStock);
    } catch (error) {
      console.error('Error ajustando stock:', error);
      throw error;
    }
  };

  const getLowStockIngredients = (threshold: number = 5): Ingredient[] => {
    return ingredients.filter(i => i.stock <= (i.minStock || threshold));
  };

  // ============================================
  // FUNCIONES PARA DESCUENTOS
  // ============================================

  const createDiscount = async (discount: Omit<Discount, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const id = `discount_${Date.now()}`;
      const newDiscount: Discount = {
        ...discount,
        id,
        createdAt: new Date(),
      };
      const updated = [...discounts, newDiscount];
      setDiscounts(updated);
      saveToStorage(STORAGE_KEYS.DISCOUNTS, updated);
      return id;
    } catch (error) {
      console.error('Error creando descuento:', error);
      throw error;
    }
  };

  const updateDiscount = async (id: string, discount: Partial<Discount>) => {
    try {
      const updated = discounts.map(d => (d.id === id ? { ...d, ...discount } : d));
      setDiscounts(updated);
      saveToStorage(STORAGE_KEYS.DISCOUNTS, updated);
    } catch (error) {
      console.error('Error actualizando descuento:', error);
      throw error;
    }
  };

  const deleteDiscount = async (id: string) => {
    try {
      const updated = discounts.filter(d => d.id !== id);
      setDiscounts(updated);
      saveToStorage(STORAGE_KEYS.DISCOUNTS, updated);
    } catch (error) {
      console.error('Error eliminando descuento:', error);
      throw error;
    }
  };

  // ============================================
  // FUNCIONES PARA PROMOCIONES
  // ============================================

  const createPromotion = async (promotion: Omit<Promotion, 'id'>): Promise<string> => {
    try {
      const id = `promo_${Date.now()}`;
      const newPromotion: Promotion = {
        ...promotion,
        id,
      };
      const updated = [...promotions, newPromotion];
      setPromotions(updated);
      saveToStorage(STORAGE_KEYS.PROMOTIONS, updated);
      return id;
    } catch (error) {
      console.error('Error creando promoción:', error);
      throw error;
    }
  };

  const updatePromotion = async (id: string, promotion: Partial<Promotion>) => {
    try {
      const updated = promotions.map(p => (p.id === id ? { ...p, ...promotion } : p));
      setPromotions(updated);
      saveToStorage(STORAGE_KEYS.PROMOTIONS, updated);
    } catch (error) {
      console.error('Error actualizando promoción:', error);
      throw error;
    }
  };

  const deletePromotion = async (id: string) => {
    try {
      const updated = promotions.filter(p => p.id !== id);
      setPromotions(updated);
      saveToStorage(STORAGE_KEYS.PROMOTIONS, updated);
    } catch (error) {
      console.error('Error eliminando promoción:', error);
      throw error;
    }
  };

  const redeemPromotion = async (code: string): Promise<Discount | null> => {
    try {
      const promo = promotions.find(
        p => p.code.toUpperCase() === code.toUpperCase() && 
             p.active && 
             (!p.expiresAt || new Date(p.expiresAt) > new Date()) &&
             (!p.usageLimit || p.usageCount < p.usageLimit)
      );

      if (!promo) return null;

      // Incrementar uso
      await updatePromotion(promo.id, {
        usageCount: promo.usageCount + 1,
      });

      return promo.discount;
    } catch (error) {
      console.error('Error canjeando promoción:', error);
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        products,
        ingredients,
        categories,
        orders,
        cashTransactions,
        discounts,
        promotions,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        createOrder,
        updateOrderStatus,
        updateOrderPaymentMethod,
        deleteCashTransactionsByDateRange,
        deleteCashTransactionsByOrderId,
        deleteAllOrders,
        deleteAllCashTransactions,
        addExpense,
        // Ingredientes/Insumos
        addIngredient,
        updateIngredient,
        deleteIngredient,
        updateIngredientStock,
        adjustIngredientStock,
        getLowStockIngredients,
        // Descuentos
        createDiscount,
        updateDiscount,
        deleteDiscount,
        // Promociones
        createPromotion,
        updatePromotion,
        deletePromotion,
        redeemPromotion,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
