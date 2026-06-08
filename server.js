import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use((err, req, res, next) => {
  console.error('Middleware error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Cargar datos del archivo JSON
function loadTables() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error al leer data.json:', error);
  }

  // Retornar 10 mesas vacías si no hay archivo
  return Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    orders: [],
    total: 0,
    createdAt: new Date(),
    createdByMesero: '',
    createdByMeseroId: '',
    actions: [],
  }));
}

// Guardar datos al archivo JSON
function saveTables(tables) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tables, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al guardar data.json:', error);
  }
}

// GET /api/tables - Obtener todas las mesas
app.get('/api/tables', (req, res) => {
  try {
    const tables = loadTables();
    res.json(tables);
  } catch (err) {
    console.error('Error en GET /api/tables:', err);
    res.status(500).json({ error: 'Error loading tables' });
  }
});

// POST /api/tables - Guardar todas las mesas
app.post('/api/tables', (req, res) => {
  try {
    const tables = req.body;
    
    if (!Array.isArray(tables)) {
      return res.status(400).json({ error: 'Expected an array of tables' });
    }

    saveTables(tables);
    res.json({ success: true, message: 'Tables saved successfully' });
  } catch (error) {
    console.error('Error guardando mesas:', error);
    res.status(500).json({ error: 'Error saving tables' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  try {
    res.json({ status: 'Server is running', timestamp: new Date() });
  } catch (err) {
    console.error('Error en GET /api/health:', err);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Iniciar servidor
let server = null;

const startServer = () => {
  try {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🍜 Servidor API ejecutándose en http://0.0.0.0:${PORT}`);
      console.log(`📊 Accesible desde: http://192.168.100.4:${PORT}`);
      console.log(`📡 GET  http://192.168.100.4:${PORT}/api/tables`);
      console.log(`💾 POST http://192.168.100.4:${PORT}/api/tables`);
      console.log('✅ Servidor listo y escuchando...');
    });

    server.on('error', (err) => {
      console.error('❌ Error en servidor:', err.message);
      console.error(err.stack);
    });

    server.on('clientError', (err, socket) => {
      console.error('❌ Error cliente:', err.message);
    });

    server.on('connection', (socket) => {
      console.log('✅ Nueva conexión establecida');
    });
  } catch (err) {
    console.error('❌ Error al iniciar servidor:', err);
    console.error(err.stack);
    process.exit(1);
  }
};

// Handlers globales de error
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error.message);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada:', reason);
  console.error(promise);
});

process.on('warning', (warning) => {
  console.warn('⚠️  Advertencia:', warning.message);
});

// Iniciar
startServer();

// Mantener proceso vivo
setInterval(() => {
  if (server && server.listening) {
    process.stdout.write('.');
  }
}, 30000);

// Manejo de señales - no salir
process.on('SIGTERM', () => {
  console.log('\n📢 SIGTERM recibido - servidor continúa activo');
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT recibido');
  if (server) {
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  }
});