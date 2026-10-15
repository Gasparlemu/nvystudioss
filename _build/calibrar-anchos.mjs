// Mide en Chrome el ancho de cada caracter de Inter Tight (peso 500, tracking -0.05em)
// y escribe _build/lib/anchos.mjs. Con eso build.mjs calcula el tamano exacto para
// que los titulos gigantes llenen el ancho de la pantalla sin desbordar.
// Solo hay que correrlo de nuevo si cambia la fuente o el tracking de los titulos.
//
//   node _build/calibrar-anchos.mjs
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './lib/cdp.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 4199;
const servidor = spawn(process.execPath, [join(RAIZ, '_build', 'servir.mjs'), String(PUERTO)], { stdio: 'ignore' });
await sleep(600);

const chars = [];
for (let c = 0x20; c <= 0x7e; c++) chars.push(String.fromCharCode(c));
chars.push(...'áéíóúÁÉÍÓÚñÑüÜ¿¡·—–“”«»'.split(''));

const b = await launch({ profile: join(tmpdir(), 'nvy-calibrar-chrome'), port: 9361 });
try {
  await b.goto(`http://localhost:${PUERTO}/robots.txt`, 300);
  const anchos = await b.eval(`(async () => {
    const f = new FontFace('Medir', 'url(/assets/fonts/inter-tight-latin.woff2)', { weight: '100 900' });
    await f.load(); document.fonts.add(f);
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;font-family:Medir;font-weight:500;font-size:200px;letter-spacing:-0.05em';
    document.body.appendChild(s);
    const out = {};
    for (const c of ${JSON.stringify(chars)}) { s.textContent = c; out[c] = Math.round(s.getBoundingClientRect().width / 200 * 1000) / 1000; }
    return out;
  })()`);
  writeFileSync(join(RAIZ, '_build', 'lib', 'anchos.mjs'), `// Generado por _build/calibrar-anchos.mjs: ancho en em de cada caracter de
// Inter Tight peso 500 con letter-spacing -0.05em (el estilo de los titulos gigantes).
const ANCHOS = ${JSON.stringify(anchos)};

export function anchoEm(texto) {
  let total = 0;
  for (const c of texto) total += ANCHOS[c] ?? 0.6;
  return total;
}
`);
  console.log('anchos.mjs listo:', Object.keys(anchos).length, 'caracteres. "Nvy Studios" =', [...'Nvy Studios'].reduce((a, c) => a + anchos[c], 0).toFixed(3), 'em');
} finally {
  await b.close();
  servidor.kill();
}
