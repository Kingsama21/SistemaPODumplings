export type UserRole = 'admin' | 'mesero';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

const STORAGE_KEY = 'currentUser';

// Usuarios predefinidos para el sistema local
// Acceso por NOMBRE, no por email
const DEMO_USERS = {
  'carlos': {
    email: 'carlos@example.com',
    role: 'mesero' as UserRole,
    password: '', // Sin contraseña
  },
  'alejandra': {
    email: 'alejandra@example.com',
    role: 'mesero' as UserRole,
    password: '', // Sin contraseña
  },
  'alexis': {
    email: 'alexis@example.com',
    role: 'mesero' as UserRole,
    password: '', // Sin contraseña
  },
  'admin': {
    email: 'admin@example.com',
    role: 'admin' as UserRole,
    password: 'Dumplings',
  },
};

/**
 * Login LOCAL - Sin Firebase
 * Acceso por NOMBRE (no por email)
 */
export async function loginUser(name: string, password: string): Promise<UserProfile> {
  try {
    // Buscar por nombre (case-insensitive)
    const nameKey = Object.keys(DEMO_USERS).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );

    if (!nameKey) {
      throw new Error('Usuario no encontrado');
    }

    const demoUser = DEMO_USERS[nameKey as keyof typeof DEMO_USERS];

    // Validar contraseña si es requerida
    if (demoUser.password && demoUser.password !== password) {
      throw new Error('Contraseña incorrecta');
    }

    // Crear perfil de usuario
    const userProfile: UserProfile = {
      id: `user_${Date.now()}`,
      email: demoUser.email,
      name: nameKey, // Usar el nombre como está configurado
      role: demoUser.role,
      createdAt: new Date(),
    };

    // Guardar en localStorage
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
    return JSON.parse(userStr) as UserProfile;
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
