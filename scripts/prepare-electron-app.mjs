import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'electron-app');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function main() {
  const distDir = path.join(root, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('No existe dist/. Ejecuta primero: pnpm build');
    process.exit(1);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  copyRecursive(path.join(root, 'dist'), path.join(outDir, 'dist'));
  copyRecursive(path.join(root, 'electron'), path.join(outDir, 'electron'));
  fs.copyFileSync(path.join(root, 'server.js'), path.join(outDir, 'server.js'));
  fs.copyFileSync(path.join(root, 'network-urls.mjs'), path.join(outDir, 'network-urls.mjs'));
  if (fs.existsSync(path.join(root, 'data.json'))) {
    fs.copyFileSync(path.join(root, 'data.json'), path.join(outDir, 'data.json'));
  }

  // Asegurar preload en el paquete
  const preloadSrc = path.join(root, 'electron', 'preload.cjs');
  if (fs.existsSync(preloadSrc)) {
    fs.mkdirSync(path.join(outDir, 'electron'), { recursive: true });
    fs.copyFileSync(preloadSrc, path.join(outDir, 'electron', 'preload.cjs'));
  }

  const iconSrc = path.join(root, 'build', 'icon.ico');
  if (fs.existsSync(iconSrc)) {
    fs.mkdirSync(path.join(outDir, 'build'), { recursive: true });
    fs.copyFileSync(iconSrc, path.join(outDir, 'build', 'icon.ico'));
  }

  const pkg = {
    name: 'isistema-comanda',
    version: '1.1.0',
    description: 'Sistema de comanda Dumplings del Dragón',
    author: 'Dumplings del Dragón',
    private: true,
    type: 'module',
    main: 'electron/main.mjs',
    dependencies: {
      cors: '^2.8.6',
      express: '^5.2.1',
    },
    build: {
      appId: 'com.dumplings.isistema-comanda',
      productName: 'ISistema Comanda',
      copyright: 'Copyright © Dumplings del Dragón',
      electronVersion: '37.10.3',
      directories: {
        output: path.join(root, 'release'),
        buildResources: 'build',
      },
      asar: true,
      npmRebuild: false,
      nodeGypRebuild: false,
      icon: 'build/icon.ico',
      files: [
        'dist/**/*',
        'electron/**/*',
        'server.js',
        'network-urls.mjs',
        'package.json',
        'build/icon.ico',
        'node_modules/**/*',
      ],
      extraResources: [
        {
          from: 'data.json',
          to: 'data.json',
        },
        {
          from: 'build/icon.ico',
          to: 'build/icon.ico',
        },
      ],
      win: {
        icon: 'build/icon.ico',
        target: [
          {
            target: 'nsis',
            arch: ['x64'],
          },
        ],
        artifactName: '${productName}-Setup-${version}.${ext}',
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'ISistema Comanda',
        installerIcon: 'build/icon.ico',
        uninstallerIcon: 'build/icon.ico',
        installerHeaderIcon: 'build/icon.ico',
      },
    },
  };

  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log('Instalando dependencias mínimas del servidor (express, cors)...');
  const install = spawnSync('npm', ['install', '--omit=dev', '--no-fund', '--no-audit'], {
    cwd: outDir,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (install.status !== 0) {
    process.exit(install.status || 1);
  }

  console.log('electron-app listo en:', outDir);
}

main();
