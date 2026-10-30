import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const MESAS_COLLECTION = 'mesas';

/** Representación serializable de una mesa (fechas como ISO string). */
export interface MesaDoc {
  number: number;
  orders: Array<Record<string, unknown>>;
  total: number;
  createdAt: string;
}

const mesaId = (number: number) => `mesa_${number}`;

/**
 * Escucha las mesas en tiempo real para que todos los dispositivos vean lo mismo.
 */
export function onMesasChange(
  callback: (mesas: MesaDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, MESAS_COLLECTION),
    (snapshot) => {
      const mesas = snapshot.docs.map(d => {
        const data = d.data();
        return {
          number: Number(data.number),
          orders: Array.isArray(data.orders) ? data.orders : [],
          total: Number(data.total) || 0,
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : String(data.createdAt ?? new Date().toISOString()),
        } as MesaDoc;
      });
      callback(mesas);
    },
    (error) => {
      console.error('Error escuchando mesas:', error);
      onError?.(error as Error);
    }
  );
}

/**
 * Guarda el estado completo de una mesa.
 */
export async function saveMesa(mesa: MesaDoc): Promise<void> {
  await setDoc(doc(db, MESAS_COLLECTION, mesaId(mesa.number)), {
    number: mesa.number,
    orders: mesa.orders,
    total: mesa.total,
    createdAt: mesa.createdAt,
    updatedAt: Timestamp.now(),
  });
}
