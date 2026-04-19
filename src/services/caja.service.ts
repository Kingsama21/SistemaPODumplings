import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MovimientoCaja, ResumenCaja } from './types';

const CASH_COLLECTION = 'caja';

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene todos los movimientos de caja (una sola vez)
 */
export async function getMovimientos(): Promise<MovimientoCaja[]> {
  try {
    const q = query(collection(db, CASH_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as MovimientoCaja));
  } catch (error) {
    console.error('Error obteniendo movimientos de caja:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de movimientos de caja
 */
export function onMovimientosChange(
  callback: (movimientos: MovimientoCaja[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, CASH_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const movimientos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as MovimientoCaja));
        callback(movimientos);
      },
      (error) => {
        console.error('Error escuchando movimientos:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de movimientos:', error);
    throw error;
  }
}

/**
 * Registra un ingreso (venta)
 */
export async function registrarIngreso(
  monto: number,
  motivo: string,
  ordenId?: string
): Promise<string> {
  try {
    const now = Timestamp.now();
    const movimiento: any = {
      type: 'income',
      amount: monto,
      description: motivo,
      timestamp: now,
      createdAt: now,
      paymentMethod: motivo.includes('Efectivo') ? 'cash' : motivo.includes('Tarjeta') ? 'card' : 'transfer',
    };

    // Guardar ordenId si existe
    if (ordenId) {
      movimiento.ordenId = ordenId;
      console.log(`✓ Registrando ingreso para orden ${ordenId}:`, { monto, motivo });
    }

    const docRef = await addDoc(collection(db, CASH_COLLECTION), movimiento);
    console.log(`✓ Ingreso guardado en Firebase con ID: ${docRef.id}, ordenId: ${ordenId}`);
    return docRef.id;
  } catch (error) {
    console.error('Error registrando ingreso:', error);
    throw error;
  }
}

/**
 * Registra un egreso (gasto)
 */
export async function registrarEgreso(
  monto: number,
  motivo: string
): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, CASH_COLLECTION), {
      type: 'expense',
      amount: monto,
      description: motivo,
      timestamp: now,
      createdAt: now,
    });
    console.log(`✓ Egreso guardado en Firebase con ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error registrando egreso:', error);
    throw error;
  }
}

/**
 * Obtiene movimientos de caja por fecha
 */
export async function getMovimientosPorFecha(fecha: Date): Promise<MovimientoCaja[]> {
  try {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, CASH_COLLECTION),
      where('createdAt', '>=', Timestamp.fromDate(inicio)),
      where('createdAt', '<=', Timestamp.fromDate(fin)),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as MovimientoCaja));
  } catch (error) {
    console.error('Error obteniendo movimientos por fecha:', error);
    throw error;
  }
}

/**
 * Calcula el resumen de caja
 */
export async function calcularResumenCaja(): Promise<ResumenCaja> {
  try {
    const movimientos = await getMovimientos();
    
    const totalIngresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    const totalEgresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
    };
  } catch (error) {
    console.error('Error calculando resumen de caja:', error);
    throw error;
  }
}

/**
 * Calcula el resumen de caja por fecha
 */
export async function calcularResumenCajaPorFecha(fecha: Date): Promise<ResumenCaja> {
  try {
    const movimientos = await getMovimientosPorFecha(fecha);
    
    const totalIngresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    const totalEgresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
    };
  } catch (error) {
    console.error('Error calculando resumen de caja por fecha:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real y calcula el resumen
 */
export function onResumenCajaChange(
  callback: (resumen: ResumenCaja) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, CASH_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const movimientos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as MovimientoCaja));

        const totalIngresos = movimientos
          .filter(m => m.tipo === 'ingreso')
          .reduce((sum, m) => sum + m.monto, 0);
        
        const totalEgresos = movimientos
          .filter(m => m.tipo === 'egreso')
          .reduce((sum, m) => sum + m.monto, 0);

        callback({
          totalIngresos,
          totalEgresos,
          balance: totalIngresos - totalEgresos,
        });
      },
      (error) => {
        console.error('Error escuchando resumen de caja:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de resumen:', error);
    throw error;
  }
}

/**
 * Elimina todos los movimientos dentro de un rango de fechas
 */
export async function deleteMovimientosByDateRange(startDate: Date, endDate: Date): Promise<number> {
  try {
    // Asegurar que las fechas cubren todo el día
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('Eliminando transacciones entre:', start, 'y', end);

    // Query para nuevo formato (timestamp)
    const q1 = query(
      collection(db, CASH_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end))
    );

    // Query para formato antiguo (createdAt)
    const q2 = query(
      collection(db, CASH_COLLECTION),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    
    const [querySnapshot1, querySnapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    // Combinar y deduplicar por ID
    const docsToDelete = new Map();
    querySnapshot1.docs.forEach(doc => docsToDelete.set(doc.id, doc));
    querySnapshot2.docs.forEach(doc => docsToDelete.set(doc.id, doc));
    
    console.log('Documentos encontrados para eliminar:', docsToDelete.size);
    
    let deletedCount = 0;
    
    // Eliminar cada documento encontrado
    for (const docSnapshot of docsToDelete.values()) {
      console.log('Eliminando documento:', docSnapshot.id);
      await deleteDoc(doc(db, CASH_COLLECTION, docSnapshot.id));
      deletedCount++;
    }
    
    console.log(`Total de ${deletedCount} transacciones eliminadas`);
    return deletedCount;
  } catch (error) {
    console.error('Error eliminando movimientos por rango de fechas:', error);
    throw error;
  }
}

/**
 * Elimina transacciones asociadas a una orden específica
 */
export async function deleteMovimientosByOrderId(orderId: string): Promise<number> {
  try {
    console.log('Eliminando transacciones para orden:', orderId);

    // Query 1: buscar por ordenId directo (nuevo formato)
    const q1 = query(
      collection(db, CASH_COLLECTION),
      where('ordenId', '==', orderId)
    );
    
    // Query 2: buscar por motivo antiguo (formato antiguo)
    const q2 = query(
      collection(db, CASH_COLLECTION),
      where('motivo', '>=', `Orden #${orderId}`),
      where('motivo', '<', `Orden #${orderId}~`)
    );

    // Query 3: buscar por description nuevo formato
    const q3 = query(
      collection(db, CASH_COLLECTION),
      where('description', '>=', `Orden #${orderId}`),
      where('description', '<', `Orden #${orderId}~`)
    );
    
    const [querySnapshot1, querySnapshot2, querySnapshot3] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
      getDocs(q3),
    ]);
    
    // Combinar y deduplicar por ID
    const docsToDelete = new Map();
    querySnapshot1.docs.forEach(doc => {
      console.log(`✓ Encontrado por ordenId: ${doc.id}`, doc.data());
      docsToDelete.set(doc.id, doc);
    });
    querySnapshot2.docs.forEach(doc => {
      console.log(`✓ Encontrado por motivo: ${doc.id}`, doc.data());
      docsToDelete.set(doc.id, doc);
    });
    querySnapshot3.docs.forEach(doc => {
      console.log(`✓ Encontrado por description: ${doc.id}`, doc.data());
      docsToDelete.set(doc.id, doc);
    });
    
    console.log('Documentos encontrados para eliminar:', docsToDelete.size);
    
    let deletedCount = 0;
    
    // Eliminar cada documento encontrado
    for (const docSnapshot of docsToDelete.values()) {
      console.log('Eliminando documento:', docSnapshot.id, docSnapshot.data());
      await deleteDoc(doc(db, CASH_COLLECTION, docSnapshot.id));
      deletedCount++;
    }
    
    console.log(`Total de ${deletedCount} transacciones eliminadas para orden ${orderId}`);
    return deletedCount;
  } catch (error) {
    console.error('Error eliminando movimientos por orden:', error);
    throw error;
  }
}

/**
 * Elimina TODAS las transacciones de caja (para limpiar datos de prueba)
 */
export async function deleteAllCashTransactions(): Promise<number> {
  try {
    console.log('⚠️ Eliminando TODAS las transacciones de caja...');
    
    const q = query(collection(db, CASH_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    console.log(`Encontradas ${querySnapshot.docs.length} transacciones para eliminar`);
    
    let deletedCount = 0;
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, CASH_COLLECTION, docSnapshot.id));
      deletedCount++;
    }
    
    console.log(`✓ ${deletedCount} transacciones eliminadas`);
    return deletedCount;
  } catch (error) {
    console.error('Error eliminando todas las transacciones:', error);
    throw error;
  }
}
