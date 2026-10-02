import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { printNetworkAccess } from './network-urls.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function defaultTables() {
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

/**
 * Crea la app Express (API + opcionalmente el frontend estático).
 */
export function createApp({ dataFile, staticDir } = {}) {
  const resolvedDataFile = dataFile || path.join(__dirname, 'data.json');
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use((err, req, res, next) => {
    console.error('Middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  function loadTables() {
    try {
      if (fs.existsSync(resolvedDataFile)) {
        const data = fs.readFileSync(resolvedDataFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error al leer data.json:', error);
    }
    return defaultTables();
  }

  function saveTables(tables) {
    try {
      const dir = path.dirname(resolvedDataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolvedDataFile, JSON.stringify(tables, null, 2), 'utf8');
    } catch (error) {
      console.error('Error al guardar data.json:', error);
    }
  }

  app.get('/api/tables', (req, res) => {
    try {
      res.json(loadTables());
    } catch (err) {
      console.error('Error en GET /api/tables:', err);
      res.status(500).json({ error: 'Error loading tables' });
    }
  });

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

  app.get('/api/health', (req, res) => {
    try {
      res.json({ status: 'Server is running', timestamp: new Date() });
    } catch (err) {
      console.error('Error en GET /api/health:', err);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}

/**
 * Arranca el servidor HTTP.
 * @returns {Promise<import('http').Server>}
 */
export function startServer({
  port = Number(process.env.PORT) || 3001,
  host = '0.0.0.0',
  dataFile,
  staticDir,
  printNetwork = true,
} = {}) {
  const app = createApp({ dataFile, staticDir });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`🍜 Servidor ejecutándose en http://${host}:${port}`);
      if (staticDir) {
        console.log(`🖥️  Frontend: http://127.0.0.1:${port}`);
      }
      if (printNetwork) {
        printNetworkAccess({ apiPort: port, webPort: port });
      }
      console.log('✅ Servidor listo y escuchando...');
      resolve(server);
    });

    server.on('error', (err) => {
      console.error('❌ Error en servidor:', err.message);
      reject(err);
    });

    server.on('clientError', (err) => {
      console.error('❌ Error cliente:', err.message);
    });
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const PORT = Number(process.env.PORT) || 3001;
  let server = null;

  startServer({ port: PORT })
    .then((s) => {
      server = s;
    })
    .catch((err) => {
      console.error('❌ Error al iniciar servidor:', err);
      process.exit(1);
    });

  process.on('uncaughtException', (error) => {
    console.error('❌ Excepción no capturada:', error.message);
    console.error(error.stack);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Promesa rechazada:', reason);
  });

  process.on('SIGINT', () => {
    console.log('\n⏹️  SIGINT recibido');
    if (server) {
      server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}
