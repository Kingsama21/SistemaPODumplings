# 🔥 Configuración de Firebase completada para Dumplings del Dragón

## ✅ Lo que se ha hecho

### 1. **Instalación de Firebase**
- ✅ Firebase SDK instalado (`12.12.0`)
- ✅ Firestore disponible
- ✅ Configuración lista

### 2. **Estructura de Servicios Creada**

#### `src/services/`
```
├── firebase.ts           ← Configuración de Firebase
├── types.ts              ← Tipos TypeScript para Firestore
├── productos.service.ts  ← CRUD de productos
├── categorias.service.ts ← CRUD de categorías
├── ordenes.service.ts    ← Gestión de órdenes
├── caja.service.ts       ← Control de caja
└── index.ts             ← Exporta todo
```

### 3. **Funcionalidades por Servicio**

#### `productosService`
- `getProductos()` - Obtener todos (una vez)
- `onProductosChange()` - Escuchar en tiempo real
- `addProducto()` - Agregar
- `updateProducto()` - Actualizar
- `deleteProducto()` - Eliminar
- `getProductosPorCategoria()` - Filtrar

#### `categoriasService`
- `getCategorias()` - Obtener todas
- `onCategoriasChange()` - Escuchar cambios
- `addCategoria()` - Agregar
- `deleteCategoria()` - Eliminar

#### `ordenesService`
- `getOrdenes()` - Todas
- `getOrdenesActivas()` - Solo activas
- `onOrdenesActivasChange()` - Tiempo real (cocina)
- `getOrdenesCompletadas()` - Historial
- `crearOrden()` - Nueva orden
- `actualizarEstadoOrden()` - Cambiar estado
- `getOrdenesPorFecha()` - Filtrar por fecha

#### `cajaService`
- `getMovimientos()` - Obtener movimientos
- `onMovimientosChange()` - Tiempo real
- `registrarIngreso()` - Venta
- `registrarEgreso()` - Egreso
- `calcularResumenCaja()` - Totales
- `onResumenCajaChange()` - Resumen en tiempo real

### 4. **Hooks Personalizados**

`src/hooks/useFirestore.ts` contiene:
- `useProductos()` - Escucha productos
- `useCategorias()` - Escucha categorías
- `useOrdenesActivas()` - Escucha órdenes activas
- `useOrdenes()` - Obtiene todas las órdenes
- `useResumenCaja()` - Escucha resumen de caja
- `useMovimientos()` - Escucha movimientos

### 5. **AppContext Integrado**

El contexto `AppContext.tsx` ya está configurado para:
- Escuchar cambios en tiempo real de Firebase
- Mantener compatibilidad con la interfaz existente
- Sincronizar automáticamente los datos
- Fallback a localStorage si es necesario

### 6. **Documentación**

- `FIREBASE_SETUP.md` - Guía completa de instalación y uso
- `.env.example` - Template de variables de entorno

---

## 🚀 PRÓXIMOS PASOS (IMPORTANTES)

### 1. Configurar Firebase

1. **Crear proyecto** en [Firebase Console](https://console.firebase.google.com/)
2. **Habilitar Firestore**
3. **Copiar credenciales**
4. **Crear archivo `.env`** en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef1234567890
```

### 2. Reiniciar el servidor

```bash
pnpm dev
```

### 3. Probar en componentes

Los componentes AHORA AUTOMÁTICAMENTE usarán Firebase:

```tsx
import { useApp } from '@/app/context/AppContext';

export default function MiComponente() {
  const { products, categories, orders } = useApp();
  
  // Los datos se sincronizan en tiempo real desde Firebase ✅
}
```

---

## 📁 Estructura de Datos en Firestore

Las colecciones se crean automáticamente:

### `productos`
```json
{
  "nombre": "Dumplings de Cerdo",
  "precio": 85,
  "categoria": "Dumplings",
  "imagen": "https://...",
  "createdAt": "2024-04-13T...",
  "updatedAt": "2024-04-13T..."
}
```

### `categorias`
```json
{
  "nombre": "Dumplings",
  "createdAt": "2024-04-13T..."
}
```

### `ordenes`
```json
{
  "tipo": "delivery",
  "cliente": {
    "nombre": "Juan",
    "telefono": "+123",
    "direccion": "Calle 10"
  },
  "productos": [
    {"id": "...", "nombre": "...", "precio": 85, "cantidad": 2}
  ],
  "total": 170,
  "estado": "pendiente",
  "createdAt": "2024-04-13T...",
  "updatedAt": "2024-04-13T..."
}
```

### `caja`
```json
{
  "tipo": "ingreso",
  "monto": 170,
  "motivo": "Venta ORD-001",
  "ordenId": "...",
  "createdAt": "2024-04-13T..."
}
```

---

## 🎯 Ventajas de esta Implementación

✅ **Tiempo Real**
- Cocina ve órdenes instantáneamente
- Caja se actualiza en tiempo real
- Todos los datos sincronizados

✅ **Modular**
- Servicios separados y reutilizables
- Hooks para fácil integración
- Tipos TypeScript completos

✅ **Escalable**
- Fácil agregar nuevas colecciones
- Puede crecer sin problemas
- Preparado para migración a la nube

✅ **Compatible**
- Mantiene la API existente
- Sin romper cambios
- Convivirá con LocalStorage si es necesario

---

## ⚠️ Detalles Importantes

### ◾ Reglas de Firestore

Para que funcione, necesitas reglas de lectura/escritura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

O más permisivo (desarrollo):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### ◾ Función automática en órdenes

Cuando se crea una orden:
1. Se guarda en colección `ordenes`
2. Se registra un ingreso automáticamente en `caja`
3. El estado inicia en `pendiente`

### ◾ Sincronización en tiempo real

Los listeners se activan automáticamente:
- `useProductos()` → escucha cambios en productos
- `useOrdenesActivas()` → cocina ve órdenes en vivo
- `useResumenCaja()` → balance se actualiza automáticamente

---

## 🔗 Archivos Referencias

### Crear orden con Firebase:
```tsx
const { createOrder } = useApp();

await createOrder(
  items,
  'delivery',
  undefined,
  { customerName: 'Juan', phone: '+123', address: 'Calle 10' }
);
// Automáticamente:
// 1. Se crea en ordenes
// 2. Se registra ingreso en caja
// 3. Se actualiza resumen
```

### Agregar egreso:
```tsx
const { addExpense } = useApp();

await addExpense(50, 'Compra de ingredientes');
// El balance se actualiza automáticamente en componentes que usan useResumenCaja()
```

---

## 📞 Verificación

**¿Está funcionando?**

1. Abre la consola del navegador (F12)
2. No debe haber errores rojo
3. En Firebase Console, deberías ver documentos en las colecciones

**¿No funciona?**

1. Verifica que `.env` tenga valores correctos
2. Verifica que Firebase está habilitado
3. Verifica que las reglas de Firestore permiten lectura/escritura
4. Revisa la consola del navegador para mensajes de error

---

## 🎉 LISTO

**Firebase está completamente integrado en tu sistema POS.**

Los servicios están:
- ✅ Tipados con TypeScript
- ✅ Con soporte de tiempo real
- ✅ Integrados en AppContext
- ✅ Listos para usar

**Próximo paso: Configura tus credenciales de Firebase y ¡comienza a usar el sistema!** 🚀
