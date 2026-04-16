# 🔥 Configuración Firebase para Dumplings del Dragón

## 📋 Tabla de Contenidos

1. [Instalar Firebase](#instalar-firebase)
2. [Configurar Credenciales](#configurar-credenciales)
3. [Estructura de datos en Firestore](#estructura-de-datos)
4. [Usar Servicios](#usar-servicios)
5. [Usar Hooks](#usar-hooks)
6. [Ejemplos](#ejemplos)

---

## 1. Instalar Firebase

Firebase ya está instalado. Para verificar:

```bash
pnpm list firebase
```

---

## 2. Configurar Credenciales

### Paso 1: Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto: "Dumplings del Dragón"
3. Habilita Firestore Database
4. Ve a Configuración del proyecto → Aplicaciones → Web
5. Copia las credenciales

### Paso 2: Crear archivo `.env`

Dentro de `ISistema Comanda/`, crea `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dumplings-del-dragon.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dumplings-del-dragon
VITE_FIREBASE_STORAGE_BUCKET=dumplings-del-dragon.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef1234567890
```

### Paso 3: Reinicia el servidor

```bash
pnpm dev
```

---

## 3. Estructura de datos en Firestore

Firestore automáticamente crea las colecciones cuando agregas datos.

### Colecciones esperadas:

#### `productos`
```json
{
  "nombre": "Dumplings de Cerdo",
  "precio": 85,
  "categoria": "Dumplings",
  "imagen": "https://...",
  "createdAt": "2024-04-13T10:30:00Z",
  "updatedAt": "2024-04-13T10:30:00Z"
}
```

#### `categorias`
```json
{
  "nombre": "Dumplings",
  "createdAt": "2024-04-13T10:30:00Z"
}
```

#### `ordenes`
```json
{
  "tipo": "delivery",
  "numeroMesa": null,
  "cliente": {
    "nombre": "Juan Pérez",
    "telefono": "+123456789",
    "direccion": "Calle 10 #20"
  },
  "productos": [
    {
      "id": "prod-1",
      "nombre": "Dumplings de Cerdo",
      "precio": 85,
      "cantidad": 2
    }
  ],
  "total": 170,
  "estado": "preparacion",
  "createdAt": "2024-04-13T10:30:00Z",
  "updatedAt": "2024-04-13T10:35:00Z"
}
```

#### `caja`
```json
{
  "tipo": "ingreso",
  "monto": 170,
  "motivo": "Venta - ORD-001",
  "ordenId": "ord-abc123",
  "createdAt": "2024-04-13T10:30:00Z"
}
```

---

## 4. Usar Servicios directamente

### Servicios disponibles:

#### `productosService`
```tsx
import { productosService } from '@/services';

// Obtener todos los productos (una sola vez)
const productos = await productosService.getProductos();

// Escuchar cambios en tiempo real
const unsubscribe = productosService.onProductosChange((productos) => {
  console.log('Productos actualizados:', productos);
});

// Agregar producto
const id = await productosService.addProducto({
  nombre: 'Nuevo producto',
  precio: 100,
  categoria: 'Dumplings',
  imagen: 'https://...'
});

// Actualizar producto
await productosService.updateProducto(id, {
  precio: 120
});

// Eliminar producto
await productosService.deleteProducto(id);

// Obtener productos por categoría
const dumplings = await productosService.getProductosPorCategoria('Dumplings');
```

#### `categoriasService`
```tsx
import { categoriasService } from '@/services';

// Obtener todas
const categorias = await categoriasService.getCategorias();

// Escuchar cambios
const unsubscribe = categoriasService.onCategoriasChange((cats) => {
  console.log('Categorías:', cats);
});

// Agregar
const id = await categoriasService.addCategoria('Nueva Categoría');

// Eliminar
await categoriasService.deleteCategoria(id);
```

#### `ordenesService`
```tsx
import { ordenesService } from '@/services';

// Obtener todas
const ordenes = await ordenesService.getOrdenes();

// Obtener solo activas
const activas = await ordenesService.getOrdenesActivas();

// Escuchar activas en tiempo real (para cocina)
const unsubscribe = ordenesService.onOrdenesActivasChange((ordenes) => {
  console.log('Órdenes activas:', ordenes);
});

// Crear orden
const ordenId = await ordenesService.crearOrden(
  'delivery',
  [
    { id: 'prod-1', nombre: 'Dumplings', precio: 85, cantidad: 2 }
  ],
  170,
  undefined,
  {
    nombre: 'Juan',
    telefono: '+123456789',
    direccion: 'Calle 10'
  }
);

// Actualizar estado
await ordenesService.actualizarEstadoOrden(ordenId, 'en_preparacion');

// Órdenes completadas
const completadas = await ordenesService.getOrdenesCompletadas();

// Órdenes por fecha
const hoy = new Date();
const ordenesHoy = await ordenesService.getOrdenesPorFecha(hoy);
```

#### `cajaService`
```tsx
import { cajaService } from '@/services';

// Obtener movimientos
const movimientos = await cajaService.getMovimientos();

// Escuchar cambios en tiempo real
const unsubscribe = cajaService.onMovimientosChange((movimientos) => {
  console.log('Movimientos:', movimientos);
});

// Registrar ingreso (venta)
await cajaService.registrarIngreso(170, 'Venta ORD-001', 'orden-id');

// Registrar egreso
await cajaService.registrarEgreso(50, 'Compra de ingredientes');

// Calcular resumen
const resumen = await cajaService.calcularResumenCaja();
console.log(resumen); // { totalIngresos, totalEgresos, balance }

// Escuchar resumen en tiempo real
const unsubscribe = cajaService.onResumenCajaChange((resumen) => {
  console.log('Balance actual:', resumen.balance);
});
```

---

## 5. Usar Hooks (RECOMENDADO)

Los hooks automáticamente escuchan cambios en tiempo real.

### Hooks disponibles:

```tsx
import {
  useProductos,
  useCategorias,
  useOrdenesActivas,
  useResumenCaja,
  useMovimientos
} from '@/hooks/useFirestore';

// En tu componente
function MiComponente() {
  const { productos, loading, error } = useProductos();
  const { categorias } = useCategorias();
  const { ordenes } = useOrdenesActivas();
  const { resumen } = useResumenCaja();
  const { movimientos } = useMovimientos();

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>Productos: {productos.length}</h1>
    </div>
  );
}
```

---

## 6. Ejemplos

### Ejemplo 1: Listar productos

```tsx
import { useProductos } from '@/hooks/useFirestore';

export default function Menu() {
  const { productos, loading } = useProductos();

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {productos.map(product => (
        <div key={product.id}>
          <h3>{product.nombre}</h3>
          <p>${product.precio}</p>
        </div>
      ))}
    </div>
  );
}
```

### Ejemplo 2: Crear orden

```tsx
import { ordenesService, cajaService } from '@/services';
import { useState } from 'react';

export default function CrearOrden() {
  const [cargando, setCargando] = useState(false);

  const handleCrearOrden = async () => {
    try {
      setCargando(true);

      // Crear orden
      const ordenId = await ordenesService.crearOrden(
        'delivery',
        [{ id: '1', nombre: 'Dumplings', precio: 85, cantidad: 2 }],
        170,
        undefined,
        { nombre: 'Juan', telefono: '+123', direccion: 'Calle 10' }
      );

      // Registrar ingreso automáticamente
      await cajaService.registrarIngreso(170, `Venta - ORD-${ordenId.slice(-4)}`, ordenId);

      alert('Orden creada: ' + ordenId);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <button onClick={handleCrearOrden} disabled={cargando}>
      {cargando ? 'Creando...' : 'Crear Orden'}
    </button>
  );
}
```

### Ejemplo 3: Dashboard de caja

```tsx
import { useResumenCaja, useMovimientos } from '@/hooks/useFirestore';

export default function DashboardCaja() {
  const { resumen } = useResumenCaja();
  const { movimientos } = useMovimientos();

  return (
    <div>
      <h2>Control de Caja</h2>
      
      <div>
        <p>Total Ingresos: ${resumen.totalIngresos}</p>
        <p>Total Egresos: ${resumen.totalEgresos}</p>
        <p>Balance: ${resumen.balance}</p>
      </div>

      <h3>Movimientos</h3>
      {movimientos.map(mov => (
        <div key={mov.id}>
          <span>{mov.tipo}: ${mov.monto}</span>
          <p>{mov.motivo}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Notas importantes

- Las colecciones se crean automáticamente en Firestore
- Los datos se sincronizan en tiempo real
- Los hooks se desuscr iben automáticamente al desmontar
- Usa `try-catch` para manejo de errores
- Las fechas se guardan como Timestamps de Firestore

---

## 🚀 Próximos pasos

1. Configura las credenciales en `.env`
2. Reemplaza el contexto `AppContext` para usar Firebase en lugar de estado local
3. Prueba que los servicios funcionen correctamente
4. Integra los hooks en los componentes

---

¿Necesitas ayuda? Revisa los servicios en `src/services/` 🔥
