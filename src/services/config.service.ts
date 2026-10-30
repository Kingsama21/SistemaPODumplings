import { doc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Configuración compartida entre dispositivos (inventario, descuentos,
 * promociones, compras). Cada clave es un documento `config/{key}` con
 * la forma `{ items: [...] }`.
 */
const CONFIG_COLLECTION = 'config';

export type ConfigKey =
  | 'ingredients'
  | 'discounts'
  | 'promotions'
  | 'autoPromotions'
  | 'compras';

/** Quita `undefined` (Firestore los rechaza) y convierte fechas a ISO. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Escucha una lista de configuración. Llama con `null` si todavía no existe.
 */
export function onConfigChange<T>(
  key: ConfigKey,
  callback: (items: T[] | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, CONFIG_COLLECTION, key),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const items = snapshot.data().items;
      callback(Array.isArray(items) ? (items as T[]) : []);
    },
    (error) => {
      console.error(`Error escuchando config/${key}:`, error);
      onError?.(error as Error);
    }
  );
}

/**
 * Modifica una lista de forma transaccional: lee lo último del servidor,
 * aplica `updater` y escribe. Evita pisar cambios de otros dispositivos.
 */
export async function mutateConfig<T>(
  key: ConfigKey,
  updater: (current: T[]) => T[],
  seed: T[] = []
): Promise<T[]> {
  const ref = doc(db, CONFIG_COLLECTION, key);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.exists() && Array.isArray(snapshot.data().items)
      ? (snapshot.data().items as T[])
      : seed;
    const next = toPlain(updater(current));
    tx.set(ref, { items: next });
    return next;
  });
}

/**
 * Crea la lista solo si todavía no existe (migración desde localStorage).
 */
export async function seedConfigIfMissing<T>(key: ConfigKey, items: T[]): Promise<void> {
  const ref = doc(db, CONFIG_COLLECTION, key);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) {
      tx.set(ref, { items: toPlain(items) });
    }
  });
}
