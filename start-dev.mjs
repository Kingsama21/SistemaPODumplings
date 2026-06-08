import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { printNetworkAccess } from './network-urls.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';

function run(label, command, args) {
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`\n[${label}] terminado (${signal})`);
    } else if (code !== 0) {
      console.error(`\n[${label}] salió con código ${code}`);
    }
    shutdown();
  });

  return child;
}

const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
const children = [
  run('API', 'node', ['server.js']),
  run('Frontend', pnpm, ['run', 'dev']),
];

let closing = false;

function shutdown() {
  if (closing) return;
  closing = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Iniciando API (puerto 3001) y frontend (puerto 5173)...');
console.log('Presiona Ctrl+C para detener ambos.\n');

setTimeout(() => {
  printNetworkAccess({ apiPort: 3001, webPort: 5173 });
}, 2500);