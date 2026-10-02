import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'src', 'imports', 'descargar.png');
const outDir = path.join(root, 'build');
const outIco = path.join(outDir, 'icon.ico');

const buf = await pngToIco(src);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outIco, buf);
fs.copyFileSync(src, path.join(outDir, 'icon.png'));
console.log('Ícono generado:', outIco);
