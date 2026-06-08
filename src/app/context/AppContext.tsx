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
  comment?: string;
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
  tip?: number; // Propina dejada por el cliente
  deliveryFee?: number; // Monto del envío (solo para mostrar en ticket, no se registra en caja)
  deliveryInfo?: {
    customerName: string;
    phone: string;
    address: string;
  };
  itemComments?: Record<string, string>;
  forKitchen?: boolean;
  paymentPending?: boolean;
  kitchenNote?: string;
}

export interface CashTransaction {
  id: string;
  type: 'income' | 'expense' | 'tip'; // tip = propina
  amount: number;
  description: string;
  timestamp: Date;
  orderId?: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
  tip?: number; // Propina asociada (para desglose)
}

export interface Compra {
  id: string;
  fecha: Date;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
  proveedor?: string;
  createdAt: Date;
}

export interface TableOrderItem {
  id: string; // ID único para cada orden en la mesa
  product: Product;
  quantity: number;
  timestamp: Date;
  status: 'pending' | 'sent' | 'cancelled'; // pending=no enviado, sent=enviado a cocina, cancelled=cancelado
  comment?: string;
}

export interface Table {
  number: number; // Mesa 1-10
  orders: TableOrderItem[]; // Órdenes agregadas a la mesa
  total: number; // Total de la mesa
  createdAt: Date; // Cuándo se abrió la mesa
}

export interface PendingDelivery {
  id: string; // ID único de la entrega pendiente
  items: OrderItem[]; // Productos ordenados
  total: number; // Total de la orden
  customerName: string;
  phone: string;
  address: string;
  deliveryFee: number; // Costo del envío
  status: 'pending' | 'out_for_delivery' | 'delivered'; // Estado de la entrega
  createdAt: Date; // Cuándo se creó la orden
  paymentMethod?: 'cash' | 'card'; // Se define al pagar
  amountReceived?: number; // Se define al pagar
  change?: number; // Se define al pagar
}

interface AppContextType {
  products: Product[];
  ingredients: Ingredient[];
  categories: Category[];
  orders: Order[];
  cashTransactions: CashTransaction[];
  discounts: Discount[];
  promotions: Promotion[];
  compras: Compra[];
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
  // Compras
  addCompra: (compra: Omit<Compra, 'id' | 'createdAt'>) => Promise<string>;
  updateCompra: (id: string, compra: Partial<Compra>) => Promise<void>;
  deleteCompra: (id: string) => Promise<void>;
  getComprasByDateRange: (startDate: Date, endDate: Date) => Compra[];
  // Mesas (Sistema de mesas para local)
  tables: Table[];
  addToTable: (tableNumber: number, product: Product, quantity: number) => void;
  removeFromTable: (tableNumber: number, orderId: string) => void;
  getTableTotal: (tableNumber: number) => number;
  payTable: (
    tableNumber: number,
    paymentMethod: 'cash' | 'card' | 'transfer',
    amountReceived?: number,
    tip?: number,
    discountApplied?: Discount,
    finalTotal?: number
  ) => Promise<string>;
  clearTable: (tableNumber: number) => void;
  getTableOrders: (tableNumber: number) => TableOrderItem[];
  sendTableOrderToKitchen: (tableNumber: number, comments?: Record<string, string>) => Promise<string>;
  moveTableOrders: (fromTable: number, toTable: number) => void;
  // Entregas Pendientes (Delivery sin pagar)
  pendingDeliveries: PendingDelivery[];
  addPendingDelivery: (items: OrderItem[], customerName: string, phone: string, address: string, deliveryFee: number) => Promise<string>;
  removePendingDelivery: (deliveryId: string, cancelOrder?: boolean) => Promise<void>;
  payPendingDelivery: (
    deliveryId: string,
    paymentMethod: 'cash' | 'card',
    amountReceived: number,
    change: number,
    discountApplied?: Discount,
    finalTotal?: number
  ) => Promise<string>;
  getPendingDeliveryTotal: (deliveryId: string) => number;
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
  COMPRAS: 'dumplings_compras',
};

// LocalStorage utilities (para fallback)
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    
    const parsed = JSON.parse(item);
    
    // Convertir compras - deserializar Dates
    if (key === STORAGE_KEYS.COMPRAS && Array.isArray(parsed)) {
      return parsed.map((c: any) => ({
        ...c,
        fecha: new Date(c.fecha),
        createdAt: new Date(c.createdAt),
      })) as T;
    }
    
    return parsed;
  
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

function normalizeDeliveryInfo(info: any): Order['deliveryInfo'] | undefined {
  if (!info) return undefined;
  const customerName = info.customerName || info.nombre;
  const phone = info.phone || info.telefono;
  const address = info.address || info.direccion;
  if (!customerName && !phone && !address) return undefined;
  return { customerName: customerName || '', phone: phone || '', address: address || '' };
}

function buildKitchenCommentPayload(
  items: { name: string; quantity: number; comment?: string }[]
): { kitchenNote?: string; itemComments?: Record<string, string> } {
  const kitchenNote = items
    .map(item => {
      const comment = item.comment?.trim();
      return comment ? `${item.name} x${item.quantity}: ${comment}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const itemComments: Record<string, string> = {};
  items.forEach((item, idx) => {
    const comment = item.comment?.trim();
    if (comment) {
      itemComments[String(idx)] = comment;
    }
  });

  return {
    kitchenNote: kitchenNote || undefined,
    itemComments: Object.keys(itemComments).length > 0 ? itemComments : undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => loadFromStorage(STORAGE_KEYS.INGREDIENTS, initialIngredients));
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>(() => loadFromStorage(STORAGE_KEYS.DISCOUNTS, []));
  const [promotions, setPromotions] = useState<Promotion[]>(() => loadFromStorage(STORAGE_KEYS.PROMOTIONS, []));
  const [compras, setCompras] = useState<Compra[]>(() => loadFromStorage(STORAGE_KEYS.COMPRAS, []));
  // Inicializar 10 mesas vacías
  const [tables, setTables] = useState<Table[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      orders: [],
      total: 0,
      createdAt: new Date(),
    }));
  });
  // Entregas pendientes de pago
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
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
            const rawItems = o.items || o.productos || [];
            const items = rawItems.map((item: any) => {
              if (item.product) {
                return {
                  ...item,
                  comment: item.comment,
                };
              }

              return {
                product: {
                  id: item.id,
                  name: item.name || item.nombre,
                  price: item.price ?? item.precio,
                  category: '',
                },
                quantity: item.quantity ?? item.cantidad,
                comment: item.comment,
              };
            });
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
              deliveryInfo: normalizeDeliveryInfo(o.deliveryInfo || o.cliente),
              itemComments: o.itemComments || {},
              amountReceived: o.amountReceived,
              change: o.change,
              tip: o.tip,
              deliveryFee: o.deliveryFee,
              forKitchen: o.forKitchen,
              paymentPending: o.paymentPending,
              kitchenNote: o.kitchenNote,
            } as Order;
          });
        setOrders(ordenes);

        const pending = ordenes
          .filter(o => o.paymentPending && o.orderType === 'delivery' && o.status !== 'cancelled')
          .map(o => ({
            id: o.id,
            items: o.items,
            total: o.total,
            customerName: o.deliveryInfo?.customerName || '',
            phone: o.deliveryInfo?.phone || '',
            address: o.deliveryInfo?.address || '',
            deliveryFee: o.deliveryFee || 0,
            status: 'pending' as const,
            createdAt: new Date(o.timestamp),
          }));
        setPendingDeliveries(pending);
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
    change?: number,
    deliveryFee?: number,
    tip?: number,
    discountApplied?: Discount,
    finalTotal?: number
  ): Promise<string> => {
    try {
      const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const total = finalTotal ?? subtotal;
      
      const productos = items.map(item => ({
        id: item.product.id,
        nombre: item.product.name,
        precio: item.product.price,
        cantidad: item.quantity,
        ...(item.comment?.trim() ? { comment: item.comment.trim() } : {}),
      }));

      const { kitchenNote, itemComments } = buildKitchenCommentPayload(
        items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          comment: item.comment,
        }))
      );

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
        change,
        tip,
        undefined,
        itemComments,
        {
          ...(deliveryFee !== undefined ? { deliveryFee } : {}),
          ...(kitchenNote ? { kitchenNote } : {}),
        }
      );

      const discountNote = discountApplied
        ? ` - Descuento: ${discountApplied.name}`
        : '';

      // Registrar ingreso (siempre el total completo, el envío solo es para el ticket)
      await cajaService.registrarIngreso(
        total,
        `Orden #${ordenId.slice(-4)}${orderType === 'delivery' ? ' - Delivery' : ''}${discountNote} (${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'})`,
        ordenId
      );

      // Registrar propina si existe
      if (tip && tip > 0) {
        await cajaService.registrarPropina(tip, `Propina - Orden #${ordenId.slice(-4)}`, ordenId);
      }

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

      if (!promo || !promo.discount.active) return null;

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

  // ============ COMPRAS ============
  const addCompra = async (compra: Omit<Compra, 'id' | 'createdAt'>): Promise<string> => {
    const newCompra: Compra = {
      ...compra,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    const newCompras = [...compras, newCompra];
    setCompras(newCompras);
    saveToStorage(STORAGE_KEYS.COMPRAS, newCompras);
    return newCompra.id;
  };

  const updateCompra = async (id: string, updates: Partial<Compra>) => {
    const updated = compras.map(c =>
      c.id === id ? { ...c, ...updates, total: updates.cantidad && updates.precioUnitario ? updates.cantidad * updates.precioUnitario : (updates.total || c.total) } : c
    );
    setCompras(updated);
    saveToStorage(STORAGE_KEYS.COMPRAS, updated);
  };

  const deleteCompra = async (id: string) => {
    const filtered = compras.filter(c => c.id !== id);
    setCompras(filtered);
    saveToStorage(STORAGE_KEYS.COMPRAS, filtered);
  };

  const getComprasByDateRange = (startDate: Date, endDate: Date): Compra[] => {
    return compras.filter(c => {
      const compraDate = new Date(c.fecha);
      return compraDate >= startDate && compraDate <= endDate;
    });
  };

  // ============================================
  // FUNCIONES DE MESAS
  // ============================================

  const addToTable = (tableNumber: number, product: Product, quantity: number) => {
    const updatedTables = tables.map(table => {
      if (table.number === tableNumber) {
        const newOrder: TableOrderItem = {
          id: `order_${Date.now()}_${Math.random()}`,
          product,
          quantity,
          timestamp: new Date(),
          status: 'pending',
        };
        const newOrders = [...table.orders, newOrder];
        const newTotal = newOrders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.product.price * o.quantity), 0);
        return {
          ...table,
          orders: newOrders,
          total: newTotal,
        };
      }
      return table;
    });
    setTables(updatedTables);
  };

  const removeFromTable = (tableNumber: number, orderId: string) => {
    const updatedTables = tables.map(table => {
      if (table.number === tableNumber) {
        // Si está pending (no enviado), eliminar completamente
        // Si está sent (enviado), marcar como cancelled
        const newOrders = table.orders.map(o => {
          if (o.id === orderId) {
            if (o.status === 'pending') {
              // Eliminar completamente si aún no fue enviado
              return null;
            } else if (o.status === 'sent') {
              // Marcar como cancelado si ya fue enviado
              return { ...o, status: 'cancelled' as const };
            }
          }
          return o;
        }).filter(o => o !== null) as TableOrderItem[];
        
        const newTotal = newOrders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.product.price * o.quantity), 0);
        return {
          ...table,
          orders: newOrders,
          total: newTotal,
        };
      }
      return table;
    });
    setTables(updatedTables);
  };

  const getTableTotal = (tableNumber: number): number => {
    const table = tables.find(t => t.number === tableNumber);
    return table ? table.total : 0;
  };

  const getTableOrders = (tableNumber: number): TableOrderItem[] => {
    const table = tables.find(t => t.number === tableNumber);
    return table ? table.orders : [];
  };

  const payTable = async (
    tableNumber: number,
    paymentMethod: 'cash' | 'card' | 'transfer',
    amountReceived?: number,
    tip?: number,
    discountApplied?: Discount,
    finalTotal?: number
  ): Promise<string> => {
    try {
      const table = tables.find(t => t.number === tableNumber);
      if (!table || table.orders.length === 0) {
        throw new Error('Mesa vacía');
      }

      // Filtrar solo items que no estén cancelados
      const validItems = table.orders.filter(o => o.status !== 'cancelled');
      
      if (validItems.length === 0) {
        throw new Error('No hay productos válidos para cobrar (todos cancelados)');
      }

      const subtotal = validItems.reduce((sum, o) => sum + (o.product.price * o.quantity), 0);
      const total = finalTotal ?? subtotal;

      const items: OrderItem[] = validItems.map(o => ({
        product: o.product,
        quantity: o.quantity,
      }));

      const change = amountReceived ? amountReceived - total : 0;

      // Crear la orden
      const ordenId = await ordenesService.crearOrden(
        'local',
        items.map(item => ({
          id: item.product.id,
          nombre: item.product.name,
          precio: item.product.price,
          cantidad: item.quantity,
        })),
        total,
        `Mesa ${tableNumber}`,
        undefined,
        paymentMethod,
        amountReceived,
        change,
        tip,
        undefined,
        undefined,
        { forKitchen: false, initialStatus: 'completed' }
      );

      await ordenesService.completeActiveKitchenOrdersForTable(`Mesa ${tableNumber}`);

      const discountNote = discountApplied
        ? ` - Descuento: ${discountApplied.name}`
        : '';

      await cajaService.registrarIngreso(
        total,
        `Mesa #${tableNumber}${discountNote} (${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'})`,
        ordenId
      );

      // Registrar propina si existe
      if (tip && tip > 0) {
        await cajaService.registrarPropina(tip, `Propina - Mesa #${tableNumber}`, ordenId);
      }

      return ordenId;
    } catch (error) {
      console.error('Error pagando mesa:', error);
      throw error;
    }
  };

  const clearTable = (tableNumber: number) => {
    const updatedTables = tables.map(table => {
      if (table.number === tableNumber) {
        return {
          ...table,
          orders: [],
          total: 0,
          createdAt: new Date(),
        };
      }
      return table;
    });
    setTables(updatedTables);
  };

  const moveTableOrders = (fromTable: number, toTable: number) => {
    if (fromTable === toTable) {
      throw new Error('Debe seleccionar una mesa diferente');
    }

    const sourceTable = tables.find(t => t.number === fromTable);
    if (!sourceTable || sourceTable.orders.length === 0) {
      throw new Error('Mesa origen vacía');
    }

    const updatedTables = tables.map(table => {
      // Mesa origen: vaciar órdenes
      if (table.number === fromTable) {
        return {
          ...table,
          orders: [],
          total: 0,
          createdAt: new Date(),
        };
      }
      // Mesa destino: agregar órdenes de la mesa origen
      if (table.number === toTable) {
        return {
          ...table,
          orders: [...table.orders, ...sourceTable.orders],
          total: table.total + sourceTable.total,
        };
      }
      return table;
    });
    setTables(updatedTables);
  };

  const sendTableOrderToKitchen = async (tableNumber: number, comments?: Record<string, string>): Promise<string> => {
    try {
      const table = tables.find(t => t.number === tableNumber);
      if (!table || table.orders.length === 0) {
        throw new Error('Mesa vacía - no hay nada para enviar a cocina');
      }

      const pendingItems = table.orders.filter(o => o.status === 'pending');

      if (pendingItems.length === 0) {
        throw new Error('No hay productos nuevos para enviar a cocina');
      }

      const total = pendingItems.reduce((sum, o) => sum + (o.product.price * o.quantity), 0);

      const productos = pendingItems.map(o => {
        const comment = comments?.[o.id]?.trim();
        return {
          id: o.product.id,
          nombre: o.product.name,
          precio: o.product.price,
          cantidad: o.quantity,
          ...(comment ? { comment } : {}),
        };
      });

      const { kitchenNote, itemComments } = buildKitchenCommentPayload(
        pendingItems.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          comment: comments?.[item.id],
        }))
      );

      const ordenId = await ordenesService.crearOrden(
        'local',
        productos,
        total,
        `Mesa ${tableNumber}`,
        undefined,
        'cash',
        undefined,
        undefined,
        undefined,
        undefined,
        itemComments,
        {
          forKitchen: true,
          initialStatus: 'pending',
          kitchenNote,
        }
      );

      const updatedTables = tables.map(t => {
        if (t.number === tableNumber) {
          const updatedOrders = t.orders.map(o => {
            if (o.status === 'pending') {
              return { ...o, status: 'sent' as const, comment: comments?.[o.id]?.trim() };
            }
            return o;
          });
          return {
            ...t,
            orders: updatedOrders,
          };
        }
        return t;
      });
      setTables(updatedTables);

      return ordenId;
    } catch (error) {
      console.error('Error enviando orden a cocina:', error);
      throw error;
    }
  };

  // ============================================
  // ENTREGAS PENDIENTES (Delivery sin pagar)
  // ============================================

  const addPendingDelivery = async (
    items: OrderItem[],
    customerName: string,
    phone: string,
    address: string,
    deliveryFee: number
  ): Promise<string> => {
    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const productos = items.map(item => ({
      id: item.product.id,
      nombre: item.product.name,
      precio: item.product.price,
      cantidad: item.quantity,
      ...(item.comment?.trim() ? { comment: item.comment.trim() } : {}),
    }));

    const { kitchenNote, itemComments } = buildKitchenCommentPayload(
      items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        comment: item.comment,
      }))
    );

    const ordenId = await ordenesService.crearOrden(
      'delivery',
      productos,
      total,
      undefined,
      { nombre: customerName, telefono: phone, direccion: address },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      itemComments,
      { forKitchen: true, paymentPending: true, deliveryFee, kitchenNote }
    );

    return ordenId;
  };

  const removePendingDelivery = async (deliveryId: string, cancelOrder = false) => {
    if (cancelOrder) {
      await ordenesService.actualizarEstadoOrden(deliveryId, 'cancelled');
    }
    setPendingDeliveries(pendingDeliveries.filter(d => d.id !== deliveryId));
  };

  const getPendingDeliveryTotal = (deliveryId: string): number => {
    const delivery = pendingDeliveries.find(d => d.id === deliveryId);
    return delivery ? delivery.total : 0;
  };

  const payPendingDelivery = async (
    deliveryId: string,
    paymentMethod: 'cash' | 'card',
    amountReceived: number,
    change: number,
    discountApplied?: Discount,
    finalTotal?: number
  ): Promise<string> => {
    try {
      const delivery = pendingDeliveries.find(d => d.id === deliveryId);
      if (!delivery) {
        throw new Error('Entrega no encontrada');
      }

      const total = finalTotal ?? delivery.total;

      await ordenesService.registrarPagoOrden(
        deliveryId,
        paymentMethod,
        amountReceived,
        change,
        delivery.deliveryFee
      );

      const discountNote = discountApplied
        ? ` - Descuento: ${discountApplied.name}`
        : '';

      await cajaService.registrarIngreso(
        total,
        `Delivery - ${delivery.customerName}${discountNote} (${paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'})`,
        deliveryId
      );

      return deliveryId;
    } catch (error) {
      console.error('Error pagando entrega:', error);
      throw error;
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
        compras,
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
        // Compras
        addCompra,
        updateCompra,
        deleteCompra,
        getComprasByDateRange,
        // Mesas
        tables,
        addToTable,
        removeFromTable,
        getTableTotal,
        payTable,
        clearTable,
        getTableOrders,
        sendTableOrderToKitchen,
        moveTableOrders,
        // Entregas Pendientes
        pendingDeliveries,
        addPendingDelivery,
        removePendingDelivery,
        payPendingDelivery,
        getPendingDeliveryTotal,
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
