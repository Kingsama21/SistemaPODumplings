
# 🥟 iSistema Comanda - Dumplings

**Sistema de gestión de pedidos para restaurant de dumplings con servicio local y delivery**

- 📍 Página: https://www.figma.com/design/6jrheeYdfw7UmZcMQsa7uq/Interfaz-web-para-Dumplings
- 🔧 Tecnología: React 18 + TypeScript + Vite + Firebase + Tailwind CSS

---

## ✨ Características Principales

### 🪑 Sistema de Mesas (Local)
- **9 mesas fijas** en grid 3x3
- Visualización de órdenes por mesa con total en tiempo real
- Acumulación de productos sin necesidad de pagar inmediatamente
- Botón "Enviar a Cocina" para pasar órdenes a preparación
- Visualización de estado de ítems:
  - 🟡 **Pending**: Nuevo, sin enviar a cocina
  - 🔵 **En Cocina**: Enviado, en preparación
  - 🔴 **Cancelado**: Marcado como cancelado (no se cobra)

### 💳 Sistema de Pagos (Flexible)
- **Efectivo**: Ingresa monto recibido, sistema calcula cambio automático
- **Tarjeta**: Cobro automático sin necesidad de ingresar monto
- **Propina**: Campo opcional para agregar propina en ambos métodos
- Aplicable a mesas y entregas

### 🚚 Entregas Pendientes
- Opción "Enviar sin Pagar" para guardar órdenes de delivery sin cobrar inmediatamente
- Página `/entregas` para ver todas las entregas pendientes
- Cobro cuando el repartidor llega (efectivo o tarjeta)
- Automáticamente se genera ticket e imprime

### 🍜 Gestión de Órdenes
- Categorías de productos dinámicas
- Carrito de compras para nuevas órdenes
- Historial de todas las órdenes completadas
- Búsqueda y filtrado

### 💰 Control de Caja
- Registro automático de todos los ingresos
- Desglose por tipo de pago (efectivo/tarjeta)
- Historial completo de transacciones
- Cortes de caja

### 📋 Cocina
- Vista de órdenes pendientes por mesa
- Estado en tiempo real
- Marca como listo cuando termina

---

## 🚀 Instalación y Uso

### Requisitos
- Node.js 18+
- npm o pnpm
- Proyecto Firebase configurado

### Instalación

```bash
# 1. Clonar o descargar el proyecto
git clone [tu-repo]
cd ISistema\ Comanda

# 2. Instalar dependencias
npm install

# 3. Configurar Firebase (ver FIREBASE_SETUP.md)
# Crear archivo .env con credenciales

# 4. Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en: **http://localhost:5173/**

### Build para Producción

```bash
npm run build
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── App.tsx                 # Componente raíz
│   ├── routes.tsx              # Rutas de la app
│   ├── context/
│   │   └── AppContext.tsx      # Estado global (React Context)
│   ├── components/
│   │   ├── Logo.tsx
│   │   ├── figma/              # Componentes especiales
│   │   └── ui/                 # Componentes shadcn/ui
│   └── pages/
│       ├── Dashboard.tsx       # Menú principal
│       ├── Tables.tsx          # Sistema de mesas 🪑
│       ├── NewOrder.tsx        # Crear entregas 🚚
│       ├── Deliveries.tsx      # Entregas pendientes 📦
│       ├── Kitchen.tsx         # Vista cocina 👨‍🍳
│       ├── Cash.tsx            # Control de caja 💰
│       ├── Orders.tsx          # Historial de órdenes
│       ├── Admin.tsx           # Panel administrativo
│       ├── History.tsx         # Historial
│       └── Tickets.tsx         # Gestión de tickets
├── services/
│   ├── firebase.ts             # Conexión Firebase
│   ├── productos.service.ts    # CRUD productos
│   ├── categorias.service.ts   # CRUD categorías
│   ├── ordenes.service.ts      # CRUD órdenes
│   ├── caja.service.ts         # Registros de caja
│   ├── ticket-pdf.service.ts   # Generación de PDFs
│   └── [otros servicios]
├── styles/
│   ├── index.css
│   ├── tailwind.css
│   ├── theme.css               # Variables CSS del tema
│   └── fonts.css               # Tipografías
└── main.tsx
```

---

## 🎨 Tecnologías

| Área | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript |
| **Build** | Vite 6.3.5 |
| **Routing** | React Router v7 |
| **Estilos** | Tailwind CSS 4.1.12 |
| **UI Components** | shadcn/ui |
| **Base de Datos** | Firebase Firestore |
| **Iconos** | Lucide React |
| **Notificaciones** | Sonner |
| **PDFs** | jsPDF + autotable |
| **Tipografía** | DM Sans + Noto Serif JP |

---

## 🎯 Flujos Principales

### Flujo Local (Mesas)
1. Usuario selecciona mesa → agrega productos
2. Click "Enviar a Cocina" → orden va a preparación
3. Click "Cobrar Mesa" → selecciona efectivo/tarjeta
4. Sistema registra en caja e imprime ticket
5. Mesa se limpia automáticamente

### Flujo Delivery
1. Usuario rellena datos del cliente (nombre, teléfono, dirección)
2. Agrega productos al carrito
3. Selecciona opción:
   - **"Enviar sin Pagar"** → se guarda como entrega pendiente
   - **"Pagar Ahora"** → cobra y imprime inmediatamente
4. Repartidor llega → paga la orden en `/entregas` si está pendiente

### Flujo Caja
- Todos los ingresos se registran automáticamente
- Se genera un registro con: monto, descripción, tipo de pago, timestamp
- Propinas se registran por separado
- Posibilidad de hacer cortes de caja

---

## 🔧 Configuración

### Variables de Entorno (.env)

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Ver `FIREBASE_SETUP.md` para instrucciones detalladas.

---

## 📦 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Previsualizar build
npm run type-check   # Verificar tipos TypeScript
```

---

## 🐛 Solución de Problemas

Ver archivo `TROUBLESHOOTING.md` para problemas comunes.

---

## 📋 Rutas de la Aplicación

| Ruta | Descripción |
|------|-----------|
| `/` | Dashboard - Menú principal |
| `/mesas` | Sistema de 9 mesas |
| `/delivery` | Crear nueva orden de delivery |
| `/entregas` | Entregas pendientes de pago |
| `/cocina` | Vista de cocina |
| `/ordenes` | Historial de órdenes |
| `/tickets` | Gestión de tickets |
| `/caja` | Control de caja |
| `/historial` | Historial de movimientos |
| `/admin` | Panel administrativo |

---

## ✅ Estado de Desarrollo

- ✅ Sistema de 9 mesas fijas
- ✅ Pagos en efectivo y tarjeta
- ✅ Entregas pendientes
- ✅ Sistema de órdenes
- ✅ Control de caja
- ✅ Generación de tickets
- ✅ Integración Firebase
- ⏳ Reportes avanzados
- ⏳ Configuración de mesas dinámicas
- ⏳ Dashboard analytics

---

## 📄 Licencia

Proyecto desarrollado para Dumplings Restaurant.

---

**Versión**: 1.0.0  
**Última actualización**: Mayo 2026
  