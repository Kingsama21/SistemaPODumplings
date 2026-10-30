import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface CorteCaja {
  id: string;
  date: Date; // Fecha del corte
  startTime: Date; // Hora de inicio del día
  endTime: Date; // Hora del corte
  totalIncome: number; // Ingresos totales
  totalExpense: number; // Egresos totales
  cashPayments: number; // Pagos en efectivo
  cardPayments: number; // Pagos con tarjeta
  transferPayments: number; // Pagos por transferencia
  theoreticalTotal: number; // Efectivo esperado en caja: fondo + efectivo + propinas - egresos
  countedAmount: number; // Cantidad física contada
  difference: number; // Diferencia (conteo - esperado). Positivo = sobra, negativo = falta
  openingFloat?: number; // Fondo inicial de caja
  tips?: number; // Propinas incluidas en el efectivo esperado
  salesTotal?: number; // Ventas totales del periodo (todos los métodos)
  notes?: string;
  createdAt: Date;
}

const CUTS_COLLECTION = 'corte_caja';

/**
 * Obtiene todos los cortes de caja
 */
export async function getAllCortes(): Promise<CorteCaja[]> {
  try {
    const q = query(collection(db, CUTS_COLLECTION), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as CorteCaja));
  } catch (error) {
    console.error('Error obteniendo cortes de caja:', error);
    throw error;
  }
}

/**
 * Obtiene cortes de caja por fecha
 */
export async function getCortesPorFecha(fecha: Date): Promise<CorteCaja[]> {
  try {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, CUTS_COLLECTION),
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as CorteCaja));
  } catch (error) {
    console.error('Error obteniendo cortes por fecha:', error);
    throw error;
  }
}

/**
 * Crea un nuevo corte de caja
 */
export async function crearCorteCaja(
  corte: Omit<CorteCaja, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const corteData = {
      date: Timestamp.fromDate(corte.date),
      startTime: Timestamp.fromDate(corte.startTime),
      endTime: Timestamp.fromDate(corte.endTime),
      totalIncome: corte.totalIncome,
      totalExpense: corte.totalExpense,
      cashPayments: corte.cashPayments,
      cardPayments: corte.cardPayments,
      transferPayments: corte.transferPayments,
      theoreticalTotal: corte.theoreticalTotal,
      countedAmount: corte.countedAmount,
      difference: corte.difference,
      openingFloat: corte.openingFloat ?? 0,
      tips: corte.tips ?? 0,
      salesTotal: corte.salesTotal ?? corte.totalIncome,
      notes: corte.notes || '',
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, CUTS_COLLECTION), corteData);
    console.log(`✓ Corte de caja creado con ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creando corte de caja:', error);
    throw error;
  }
}
