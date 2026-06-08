import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Orden, ProductoEnOrden, ClienteDelivery, CrearOrdenOptions } from './types';

const ORDERS_COLLECTION = 'ordenes';

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene todas las órdenes (una sola vez)
 */
export async function getOrdenes(): Promise<Orden[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Orden));
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de TODAS las órdenes (incluyendo completadas)
 */
export function onOrdenesChange(
  callback: (ordenes: Orden[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const ordenes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Orden));
        callback(ordenes);
      },
      (error) => {
        console.error('Error escuchando órdenes:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de órdenes:', error);
    throw error;
  }
}

/**
 * Obtiene órdenes activas (no completadas)
 */
export async function getOrdenesActivas(): Promise<Orden[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Orden))
      .filter(orden => orden.estado !== 'completada');
  } catch (error) {
    console.error('Error obteniendo órdenes activas:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de órdenes activas (para cocina)
 */
export function onOrdenesActivasChange(
  callback: (ordenes: Orden[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (querySnapshot) => {
        const ordenes = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Orden))
          .filter(orden => orden.estado !== 'completada');
        callback(ordenes);
      },
      (error) => {
        console.error('Error escuchando órdenes activas:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de órdenes:', error);
    throw error;
  }
}

/**
 * Obtiene órdenes completadas (para historial)
 */
export async function getOrdenesCompletadas(): Promise<Orden[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('estado', '==', 'completada'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Orden));
  } catch (error) {
    console.error('Error obteniendo órdenes completadas:', error);
    throw error;
  }
}

/**
 * Crea una nueva orden
 */
const STATUS_MAP: Record<string, { status: string; estado: string }> = {
  pending: { status: 'pending', estado: 'pendiente' },
  preparing: { status: 'preparing', estado: 'en_preparacion' },
  ready: { status: 'ready', estado: 'listo' },
  completed: { status: 'completed', estado: 'completada' },
  cancelled: { status: 'cancelled', estado: 'cancelada' },
  pendiente: { status: 'pending', estado: 'pendiente' },
  en_preparacion: { status: 'preparing', estado: 'en_preparacion' },
  listo: { status: 'ready', estado: 'listo' },
  completada: { status: 'completed', estado: 'completada' },
  cancelada: { status: 'cancelled', estado: 'cancelada' },
};

export async function crearOrden(
  tipo: 'local' | 'delivery',
  productos: ProductoEnOrden[],
  total: number,
  numeroMesa?: string,
  cliente?: ClienteDelivery,
  paymentMethod?: 'cash' | 'card' | 'transfer',
  amountReceived?: number,
  change?: number,
  tip?: number,
  orderId?: string,
  itemComments?: Record<string, string>,
  options?: CrearOrdenOptions
): Promise<string> {
  try {
    const now = Timestamp.now();
    const initialStatus = options?.initialStatus || 'pending';
    const mappedStatus = STATUS_MAP[initialStatus] || STATUS_MAP.pending;

    const orderData: any = {
      type: tipo,
      items: productos.map(p => ({
        id: p.id,
        name: p.nombre,
        price: p.precio,
        quantity: p.cantidad,
        ...(p.comment ? { comment: p.comment } : {}),
      })),
      total,
      status: mappedStatus.status,
      paymentMethod: paymentMethod || 'cash',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    };

    // Mantener campos antiguos para compatibilidad
    orderData.tipo = tipo;
    orderData.productos = productos;
    orderData.estado = mappedStatus.estado;
    orderData.metodoPago = paymentMethod || 'cash';

    if (options?.forKitchen !== undefined) {
      orderData.forKitchen = options.forKitchen;
    } else if (tipo === 'delivery') {
      orderData.forKitchen = true;
    }

    if (options?.kitchenNote) {
      orderData.kitchenNote = options.kitchenNote;
    }

    if (options?.paymentPending) {
      orderData.paymentPending = true;
    }

    if (options?.deliveryFee !== undefined && options.deliveryFee >= 0) {
      orderData.deliveryFee = options.deliveryFee;
    }

    // Solo agregar campos si tienen valor (Firestore rechaza undefined)
    if (tipo === 'local' && numeroMesa) {
      orderData.numeroMesa = numeroMesa;
      orderData.tableNumber = numeroMesa;
    }
    if (tipo === 'delivery' && cliente) {
      orderData.cliente = cliente;
      orderData.deliveryInfo = cliente;
    }
    // Guardar pago y cambio si aplican (para dine-in)
    if (amountReceived !== undefined && amountReceived > 0) {
      orderData.amountReceived = amountReceived;
    }
    if (change !== undefined && change >= 0) {
      orderData.change = change;
    }
    if (tip !== undefined && tip > 0) {
      orderData.tip = tip;
    }
    // Guardar comentarios de items
    if (itemComments && Object.keys(itemComments).length > 0) {
      orderData.itemComments = itemComments;
    }

    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
    console.log(`✓ Orden creada con ID: ${docRef.id}, Método de pago: ${paymentMethod || 'cash'}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creando orden:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de una orden
 */
/**
 * Registra el pago de una orden ya existente (delivery enviado sin pagar)
 */
export async function registrarPagoOrden(
  ordenId: string,
  paymentMethod: 'cash' | 'card' | 'transfer',
  amountReceived?: number,
  change?: number,
  deliveryFee?: number
): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      paymentPending: false,
      paymentMethod,
      metodoPago: paymentMethod,
      updatedAt: new Date(),
    };

    if (amountReceived !== undefined && amountReceived > 0) {
      updates.amountReceived = amountReceived;
    }
    if (change !== undefined && change >= 0) {
      updates.change = change;
    }
    if (deliveryFee !== undefined && deliveryFee >= 0) {
      updates.deliveryFee = deliveryFee;
    }

    await updateDoc(doc(db, ORDERS_COLLECTION, ordenId), updates);
    console.log(`✓ Pago registrado en orden ${ordenId}`);
  } catch (error) {
    console.error('Error registrando pago de orden:', error);
    throw error;
  }
}

/**
 * Marca como completadas las comandas activas de una mesa (para cocina)
 */
export async function completeActiveKitchenOrdersForTable(numeroMesa: string): Promise<number> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    let completedCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      const tableNumber = data.tableNumber || data.numeroMesa;
      if (tableNumber !== numeroMesa) continue;

      const status = data.status || data.estado;
      const isActive = ['pending', 'preparing', 'ready', 'pendiente', 'en_preparacion', 'listo'].includes(status);
      if (!isActive) continue;

      const isKitchenOrder =
        data.forKitchen === true ||
        (data.forKitchen !== false && data.type !== 'delivery' && data.tipo !== 'delivery' && !data.amountReceived);

      if (!isKitchenOrder) continue;

      await updateDoc(doc(db, ORDERS_COLLECTION, docSnapshot.id), {
        status: 'completed',
        estado: 'completada',
        updatedAt: new Date(),
      });
      completedCount++;
    }

    if (completedCount > 0) {
      console.log(`✓ ${completedCount} comanda(s) de ${numeroMesa} marcadas como completadas`);
    }

    return completedCount;
  } catch (error) {
    console.error('Error completando comandas de mesa:', error);
    throw error;
  }
}

export async function actualizarEstadoOrden(
  ordenId: string,
  nuevoEstado: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'pendiente' | 'en_preparacion' | 'listo' | 'completada' | 'cancelada'
): Promise<void> {
  try {
    const mapped = STATUS_MAP[nuevoEstado] || STATUS_MAP.pending;

    const docRef = doc(db, ORDERS_COLLECTION, ordenId);
    await updateDoc(docRef, {
      status: mapped.status,
      estado: mapped.estado,
      updatedAt: new Date(),
    });
    
    console.log(`✓ Estado de orden ${ordenId} actualizado a: ${nuevoEstado}`);
  } catch (error) {
    console.error('Error actualizando estado de orden:', error);
    throw error;
  }
}

/**
 * Obtiene órdenes por fecha
 */
export async function getOrdenesPorFecha(fecha: Date): Promise<Orden[]> {
  try {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('createdAt', '>=', Timestamp.fromDate(inicio)),
      where('createdAt', '<=', Timestamp.fromDate(fin)),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Orden));
  } catch (error) {
    console.error('Error obteniendo órdenes por fecha:', error);
    throw error;
  }
}

/**
 * Elimina TODAS las órdenes (para limpiar datos de prueba)
 */
export async function deleteAllOrders(): Promise<number> {
  try {
    console.log('⚠️ Eliminando TODAS las órdenes...');
    
    const q = query(collection(db, ORDERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    console.log(`Encontradas ${querySnapshot.docs.length} órdenes para eliminar`);
    
    let deletedCount = 0;
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, ORDERS_COLLECTION, docSnapshot.id));
      deletedCount++;
    }
    
    console.log(`✓ ${deletedCount} órdenes eliminadas`);
    return deletedCount;
  } catch (error) {
    console.error('Error eliminando todas las órdenes:', error);
    throw error;
  }
}
