import {
  getConfigItems,
  mutateConfig,
  onConfigChange,
  seedConfigIfMissing,
} from './config.service';

export interface Waiter {
  id: string;
  name: string;
}

/** Meseros con los que arranca el sistema la primera vez. */
export const DEFAULT_WAITERS: Waiter[] = [{ id: 'waiter_mariel', name: 'Mariel' }];

const MAX_NAME_LENGTH = 30;
const RESERVED_NAMES = ['admin', 'administrador', 'cajero'];

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ');
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function validateName(name: string, others: Waiter[]): string {
  const clean = normalize(name);
  if (!clean) throw new Error('Escribe el nombre del mesero');
  if (clean.length > MAX_NAME_LENGTH) throw new Error(`El nombre es muy largo (máximo ${MAX_NAME_LENGTH} letras)`);
  if (RESERVED_NAMES.some(reserved => sameName(reserved, clean))) {
    throw new Error('Ese nombre está reservado, elige otro');
  }
  if (others.some(w => sameName(w.name, clean))) throw new Error('Ya existe un mesero con ese nombre');
  return clean;
}

/** Escucha la lista de meseros en tiempo real (la crea con el mesero inicial si no existe). */
export function onWaitersChange(callback: (waiters: Waiter[]) => void): () => void {
  return onConfigChange<Waiter>('waiters', items => {
    if (items === null) {
      callback(DEFAULT_WAITERS);
      seedConfigIfMissing('waiters', DEFAULT_WAITERS).catch(error =>
        console.error('No se pudo crear la lista de meseros:', error)
      );
      return;
    }
    callback(items);
  });
}

/** Lectura única, usada al iniciar sesión. */
export async function getWaiters(): Promise<Waiter[]> {
  return (await getConfigItems<Waiter>('waiters')) ?? DEFAULT_WAITERS;
}

export async function addWaiter(name: string): Promise<void> {
  await mutateConfig<Waiter>(
    'waiters',
    current => {
      const clean = validateName(name, current);
      return [...current, { id: `waiter_${Date.now()}`, name: clean }];
    },
    DEFAULT_WAITERS
  );
}

export async function renameWaiter(id: string, name: string): Promise<void> {
  await mutateConfig<Waiter>(
    'waiters',
    current => {
      const clean = validateName(name, current.filter(w => w.id !== id));
      return current.map(w => (w.id === id ? { ...w, name: clean } : w));
    },
    DEFAULT_WAITERS
  );
}

export async function removeWaiter(id: string): Promise<void> {
  await mutateConfig<Waiter>('waiters', current => current.filter(w => w.id !== id), DEFAULT_WAITERS);
}
