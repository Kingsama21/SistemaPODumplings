import { getWaiters } from './waiters.service';

export type UserRole = 'admin' | 'mesero';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

const STORAGE_KEY = 'currentUser';

// El cajero/administrador es fijo; los meseros se administran desde Administración → Meseros
const ADMIN_NAME = 'admin';
// La contraseña no vive en texto plano: se compara su hash SHA-256.
// Se puede cambiar definiendo VITE_ADMIN_PASSWORD_HASH en .env
const ADMIN_PASSWORD_HASH =
  (import.meta.env.VITE_ADMIN_PASSWORD_HASH as string | undefined) ||
  '0ce9ba359d689b47e8a26b10905b79597c549266fa1f9ec576e8161cadb377c6';

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function roleForName(name: string): UserRole {
  return name.toLowerCase() === ADMIN_NAME ? 'admin' : 'mesero';
}

/**
 * Login LOCAL - Sin Firebase
 * Acceso por NOMBRE (no por email)
 */
export async function loginUser(name: string, password: string): Promise<UserProfile> {
  try {
    const typed = name.trim();
    let displayName: string;

    if (typed.toLowerCase() === ADMIN_NAME) {
      if (ADMIN_PASSWORD_HASH !== (await sha256Hex(password))) {
        throw new Error('Contraseña incorrecta');
      }
      displayName = ADMIN_NAME;
    } else {
      // Los meseros se validan contra la lista guardada en Administración → Meseros
      const waiters = await getWaiters();
      const waiter = waiters.find(w => w.name.toLowerCase() === typed.toLowerCase());
      if (!waiter) {
        throw new Error('Ese mesero no está registrado');
      }
      displayName = waiter.name;
    }

    const role = roleForName(displayName);
    const userProfile: UserProfile = {
      id: `user_${displayName.toLowerCase().replace(/s+/g, '_')}`,
      email: `${displayName.toLowerCase().replace(/s+/g, '.')}@example.com`,
      name: displayName,
      role,
      createdAt: new Date(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
    return userProfile;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Logout del usuario
 */
export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
}

/**
 * Obtiene el usuario actual del localStorage
 */
export function getCurrentUser(): UserProfile | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEY);
    if (!userStr) return null;
    const stored = JSON.parse(userStr) as UserProfile;
    // El rol siempre se deriva del nombre: editar el rol en localStorage no sirve
    return { ...stored, role: roleForName(stored.name) };
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
}

/**
 * Escucha cambios de autenticación
 */
export function onAuthChange(
  callback: (user: UserProfile | null) => void
): () => void {
  // Llamar inmediatamente con el usuario actual
  const currentUser = getCurrentUser();
  callback(currentUser);

  // Escuchar cambios en storage (para sincronizar entre pestañas)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      if (e.newValue) {
        try {
          const user = JSON.parse(e.newValue) as UserProfile;
          callback(user);
        } catch (error) {
          console.error('Error parseando usuario:', error);
        }
      } else {
        callback(null);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Retornar función de desuscripción
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Obtiene el perfil del usuario actual
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  return getCurrentUser();
}
