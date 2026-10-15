// Genera assets/brand/og-nvy.png (1200x630), la imagen que aparece al compartir
// el link en WhatsApp, LinkedIn, etc. Usa las mismas fuentes del sitio.
//
//   node _build/og.mjs
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './lib/cdp.mjs';
import { anchoEm } from './lib/anchos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 4198;
const servidor = spawn(process.execPath, [join(RAIZ, '_build', 'servir.mjs'), String(PUERTO)], { stdio: 'ignore' });
await sleep(600);

const tam = Math.floor((1200 - 2 * 64) / anchoEm('Nvy Studios'));
const pagina = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Inter Tight";src:url(/assets/fonts/inter-tight-latin.woff2) format("woff2");font-weight:100 900}
@font-face{font-family:"Inter";src:url(/assets/fonts/inter-latin.woff2) format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0A1F5C;color:#fff;font-family:Inter;-webkit-font-smoothing:antialiased;
  display:flex;flex-direction:column;justify-content:space-between;padding:56px 64px}
.top{display:flex;justify-content:space-between;font-size:22px;color:rgba(255,255,255,.7)}
h1{font-family:"Inter Tight";font-weight:500;letter-spacing:-.05em;line-height:.8;font-size:${tam}px;margin-left:-.035em;white-space:nowrap}
.pie{display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.28);padding-top:20px;font-size:24px;color:rgba(255,255,255,.82)}
</style></head><body>
<div class="top"><span>portafolio</span><span>Valdivia, Chile</span></div>
<div><h1>Nvy Studios</h1></div>
<div class="pie"><span>Diseño y desarrollo web a medida</span><span>nvystudios.cl</span></div>
</body></html>`;

const b = await launch({ profile: join(tmpdir(), 'nvy-og-chrome'), port: 9362 });
try {
  await b.viewport(1200, 630, { dpr: 1 });
  await b.goto(`http://localhost:${PUERTO}/robots.txt`, 200);
  await b.eval(`(async () => { document.open(); document.write(${JSON.stringify(pagina)}); document.close(); await document.fonts.ready; await new Promise(r => setTimeout(r, 300)); })()`);
  writeFileSync(join(RAIZ, 'assets', 'brand', 'og-nvy.png'), await b.shot());
  console.log('assets/brand/og-nvy.png listo');
} finally {
  await b.close();
  servidor.kill();
}
