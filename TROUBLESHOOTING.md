# 🔧 Solución de Problemas - Firebase + React + TypeScript

## Problema 1: Errores de tipos en `useFirestore.ts`

**Síntoma:** Los `useState` muestran errores tipo `Expected 0 type arguments, but got 1`

**Causa:** Conflicto de versiones de TypeScript o React

**Solución:**

Opción A: Actualiza el archivo `src/hooks/useFirestore.ts`:

```tsx
// Reemplaza esto:
const [productos, setProductos] = useState<Producto[]>([]);

// Por esto:
const [productos, setProductos] = useState([]);
const setProductos = (products: Producto[]) => {
  // ...
};

// O simplemente:
const [productos, setProductos] = useState<any>([]);
```

Opción B (Recomendado): Usa tipos inferidos

```tsx
function useProductos() {
  const [productos] = useState<Array<{
    id: string;
    nombre: string;
    precio: number;
    categoria: string;
    imagen?: string;
    createdAt: Date;
    updatedAt: Date;
  }>>([]);
  
  // ...
}
```

---

## Problema 2: Firebase no inicializa

**Síntoma:** Consola muestra `⚠️ Firebase no configurado`

**Causa:** Variables `.env` faltantes o incorrectas

**Solución:**

1. Crea archivo `.env` en la raíz:

```bash
cd "ISistema Comanda"
# Crea el archivo .env con las variables
```

2. Verifica que tienes todas las variables:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dumplings-del-dragon.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dumplings-del-dragon
VITE_FIREBASE_STORAGE_BUCKET=dumplings-del-dragon.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef1234567890
```

3. Reinicia el servidor:
```bash
pnpm dev
```

---

## Problema 3: Los datos no se sincronizan

**Síntoma:** Los componentes no muestran datos de Firebase

**Causa:** Reglas de Firestore restrictivas

**Solución:**

En Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // SOLO PARA DESARROLLO
    }
  }
}
```

Para producción, haz más restrictivo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /ordenes/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /caja/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /categorias/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Problema 4: "Module not found" en imports

**Síntoma:** `Cannot find module '@/services'`

**Causa:** El alias `@` no está configurado correctamente

**Solución:**

Verifica que `vite.config.ts` tiene:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

Si no está, agrégalo al objeto `defineConfig`.

---

## Problema 5: onSnapshot no actualiza componentes

**Síntoma:** Los datos no se actualizan en tiempo real

**Causa:** El listener no está correctamente desuscrito

**Solución:**

En los hooks, asegúrate que el cleanup está correcto:

```tsx
useEffect(() => {
  // Escuchar cambios
  const unsubscribe = productosService.onProductosChange(
    (data) => setProductos(data),
    (error) => console.error(error)
  );

  // IMPORTANTE: Desuscribirse
  return () => unsubscribe();
}, []);
```

---

## Problema 6: AppContext lanza error "useApp must be used within AppProvider"

**Síntoma:** Error al usar useApp() en componentes

**Causa:** El componente no está envuelto en AppProvider

**Solución:**

En `src/main.tsx` o `src/app/App.tsx`:

```tsx
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      {/* El resto de la aplicación */}
    </AppProvider>
  );
}
```

---

## Problema 7: Las órdenes no se crean

**Síntoma:** Al confirmar orden, no aparece nada

**Causa:** Probablemente error en Firebase o permisos

**Solución:**

1. Abre la consola del navegador (F12)
2. Mira los errores (rojo)
3. Probablemente algo como "Missing or insufficient permissions"
4. Actualiza las reglas de Firestore (ver Problema 3)

---

## Problema 8: El carrito no funciona

**Síntoma:** No puedo agregar productos al carrito

**Causa:** Los productos no están sincronizando

**Solución:**

1. Verifica que tienes productos en Firestore
2. Si no, crea algunos desde Admin:
   - Abre la aplicación
   - Ve a Admin → Productos
   - Agrega un producto

---

## Problema 9: "Cannot read property 'toDate' of undefined"

**Síntoma:** Error con fechas en el console

**Causa:** Algunos documentos de Firestore no tienen `createdAt`

**Solución:**

En los servicios, ya hay fallback:

```tsx
createdAt: doc.data().createdAt?.toDate() || new Date(),
```

Pero si aún falla, asegúrate de usar las últimas funciones de servicio.

---

## Problema 10: El servidor no inicia

**Síntoma:** `pnpm dev` falla

**Causa:** Versión de Node o dependencias problemáticas

**Solución:**

```bash
# Limpia todo
rm -r node_modules
rm pnpm-lock.yaml

# Reinstala
pnpm install --force

# Intenta de nuevo
pnpm dev
```

---

## 📋 Checklist de Debugging

Antes de reportar un problema:

- [ ] ¿Está `.env` créado con valores correctos?
- [ ] ¿Está el servidor corriendo? (`pnpm dev`)
- [ ] ¿Está habilitado Firestore en Firebase Console?
- [ ] ¿Las reglas de Firestore permiten lectura/escritura?
- [ ] ¿Hay errores en la consola del navegador (F12)?
- [ ] ¿Está AppProvider envolviendo toda la aplicación?
- [ ] ¿Hay documentos en Firestore? (revisa en Firebase Console)

---

## Para Usar sin Firebase

Si prefieres usar LocalStorage mientras configuras Firebase:

En `AppContext.tsx`, reemplaza:

```tsx
// Cambia esto:
export function AppProvider({ children }: { children: ReactNode }) {
  // ...usa Firebase

// Por esto:
export function AppProvider({ children }: { children: ReactNode }) {
  // ...usa LocalStorage (código anterior)
```

---

## 👨‍💻 Más Ayuda

Si aún no funciona:

1. Revisa los logs en Firebase Console
2. Verifica la consola del navegador (F12 → Console/Network)
3. Abre Firebase Console → Firestore → datos reales
4. Verifica que los datos aparecen en tiempo real

---

**¡Listo! Con esto deberías resolver la mayoría de problemas.** 🚀
