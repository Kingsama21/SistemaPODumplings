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
    passwordHash: '', // Sin contraseña
  },
  'alejandra': {
    email: 'alejandra@example.com',
    role: 'mesero' as UserRole,
    passwordHash: '', // Sin contraseña
  },
  'alexis': {
    email: 'alexis@example.com',
    role: 'mesero' as UserRole,
    passwordHash: '', // Sin contraseña
  },
  'admin': {
    email: 'admin@example.com',
    role: 'admin' as UserRole,
    // La contraseña ya no vive en texto plano: se compara su hash SHA-256.
    // Se puede cambiar definiendo VITE_ADMIN_PASSWORD_HASH en .env
    passwordHash:
      (import.meta.env.VITE_ADMIN_PASSWORD_HASH as string | undefined) ||
      '0ce9ba359d689b47e8a26b10905b79597c549266fa1f9ec576e8161cadb377c6',
  },
};

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function roleForName(name: string): UserRole | null {
  const key = Object.keys(DEMO_USERS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? DEMO_USERS[key as keyof typeof DEMO_USERS].role : null;
}

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
    if (demoUser.passwordHash && demoUser.passwordHash !== (await sha256Hex(password))) {
      throw new Error('Contraseña incorrecta');
    }

    // Crear perfil de usuario
    const userProfile: UserProfile = {
      id: `user_${nameKey}`,
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
    const stored = JSON.parse(userStr) as UserProfile;
    // El rol siempre se deriva del nombre: editar el rol en localStorage no sirve
    const role = roleForName(stored.name);
    if (!role) return null;
    return { ...stored, role };
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
