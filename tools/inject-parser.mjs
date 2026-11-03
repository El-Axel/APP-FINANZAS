// Copia el analizador de gastos de netlify/lib/parse.mjs dentro de public/index.html.
// Uso (desde la carpeta del proyecto):  node tools/inject-parser.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libPath = join(root, 'netlify/lib/parse.mjs');
const htmlPath = join(root, 'public/index.html');

const lib = readFileSync(libPath, 'utf8');
const m = lib.match(/\/\/ PARSER:START[\s\S]*?\/\/ PARSER:END/);
if (!m) throw new Error('No encontré el bloque PARSER:START … PARSER:END en parse.mjs');
const block = m[0];

let html = readFileSync(htmlPath, 'utf8');
if (html.includes('/*__PARSER__*/')) {
  html = html.replace('/*__PARSER__*/', () => block);
} else if (/\/\/ PARSER:START[\s\S]*?\/\/ PARSER:END/.test(html)) {
  html = html.replace(/\/\/ PARSER:START[\s\S]*?\/\/ PARSER:END/, () => block);
} else {
  throw new Error('No encontré dónde poner el analizador en index.html');
}
writeFileSync(htmlPath, html);
console.log('Analizador actualizado en public/index.html');
