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
  tipo: 'ingreso' | 'egreso';
  monto: number;
  motivo: string;
  ordenId?: string;
  createdAt: Date;
}

export interface ResumenCaja {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
}
