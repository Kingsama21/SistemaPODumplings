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
    const docRef = await addDoc(collection(db, CASH_COLLECTION), {
      tipo: 'ingreso',
      monto,
      motivo,
      ordenId,
      createdAt: new Date(),
    });
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
    const docRef = await addDoc(collection(db, CASH_COLLECTION), {
      tipo: 'egreso',
      monto,
      motivo,
      createdAt: new Date(),
    });
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
    const q = query(
      collection(db, CASH_COLLECTION),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    
    const querySnapshot = await getDocs(q);
    let deletedCount = 0;
    
    // Eliminar cada documento encontrado
    for (const docSnapshot of querySnapshot.docs) {
      await deleteDoc(doc(db, CASH_COLLECTION, docSnapshot.id));
      deletedCount++;
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error eliminando movimientos por rango de fechas:', error);
    throw error;
  }
}
