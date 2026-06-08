import { rtdb } from './firebase';
import {
  ref,
  set,
  get,
  onValue,
  Unsubscribe,
  update,
} from 'firebase/database';
import { Table } from '../app/context/AppContext';

const TABLES_PATH = 'restaurant/tables';

/**
 * Obtiene todas las mesas del Realtime Database
 */
export async function fetchTables(): Promise<Table[]> {
  try {
    const tablesRef = ref(rtdb, TABLES_PATH);
    const snapshot = await get(tablesRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        actions: (t.actions || []).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })),
        orders: (t.orders || []).map((o: any) => ({
          ...o,
          timestamp: new Date(o.timestamp),
        })),
      }));
    }

    // Si no hay datos, retornar 10 mesas vacías
    return Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      orders: [],
      total: 0,
      createdAt: new Date(),
      createdByMesero: '',
      createdByMeseroId: '',
      actions: [],
    }));
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de las mesas
 */
export function onTablesChange(
  callback: (tables: Table[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const tablesRef = ref(rtdb, TABLES_PATH);

    return onValue(
      tablesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const tables = Object.values(data).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            actions: (t.actions || []).map((a: any) => ({
              ...a,
              timestamp: new Date(a.timestamp),
            })),
            orders: (t.orders || []).map((o: any) => ({
              ...o,
              timestamp: new Date(o.timestamp),
            })),
          }));
          callback(tables);
        } else {
          // Si no hay datos, crear 10 mesas vacías
          const emptyTables = Array.from({ length: 10 }, (_, i) => ({
            number: i + 1,
            orders: [],
            total: 0,
            createdAt: new Date(),
            createdByMesero: '',
            createdByMeseroId: '',
            actions: [],
          }));
          callback(emptyTables);
        }
      },
      (error) => {
        console.error('Error escuchando mesas:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error al escuchar mesas:', error);
    throw error;
  }
}

/**
 * Actualiza una mesa específica
 */
export async function updateTable(table: Table): Promise<void> {
  try {
    const tableRef = ref(rtdb, `${TABLES_PATH}/${table.number}`);
    await set(tableRef, table);
  } catch (error) {
    console.error('Error actualizando mesa:', error);
    throw error;
  }
}

/**
 * Actualiza todas las mesas
 */
export async function updateAllTables(tables: Table[]): Promise<void> {
  try {
    const tablesRef = ref(rtdb, TABLES_PATH);
    const updates: Record<string, any> = {};

    tables.forEach((table) => {
      updates[`${table.number}`] = table;
    });

    await update(ref(rtdb), { [TABLES_PATH]: updates });
  } catch (error) {
    console.error('Error actualizando todas las mesas:', error);
    throw error;
  }
}
