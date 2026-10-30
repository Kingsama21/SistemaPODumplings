// ============================================
// TIPOS COMUNES PARA FIRESTORE
// ============================================

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagen?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Categoria {
  id: string;
  nombre: string;
  createdAt: Date;
}

export interface ProductoEnOrden {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comment?: string;
}

export interface CrearOrdenOptions {
  forKitchen?: boolean;
  initialStatus?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  kitchenNote?: string;
  paymentPending?: boolean;
  deliveryFee?: number;
}

export interface ClienteDelivery {
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface Orden {
  id: string;
  tipo: 'local' | 'delivery';
  numeroMesa?: string;
  cliente?: ClienteDelivery;
  productos: ProductoEnOrden[];
  total: number;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'completada';
  createdAt: Date;
  updatedAt: Date;
}

export interface MovimientoCaja {
  id: string;
  type: 'income' | 'expense' | 'tip';
  amount: number;
  description: string;
  paymentMethod?: 'cash' | 'card' | 'transfer';
  ordenId?: string;
  timestamp?: Date;
  createdAt: Date;
}

export interface ResumenCaja {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
}
