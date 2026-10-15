// Captura un sitio en escritorio y celular y deja las imagenes listas para el portafolio.
//
//   node _build/capturas.mjs <slug> <url> [opciones]
//
//   --vistas 3          vistas por dispositivo (por defecto 3)
//   --espera 3500       ms de espera despues de cargar (preloaders, videos)
//   --pos-e 0,1.2,2.4   posiciones de escritorio en altos de pantalla (por defecto: automatico)
//   --pos-m 0,1.3,2.8   idem para celular
//   --solo e|m          solo escritorio (e) o solo celular (m)
//   --dpr 1.25          resolucion de escritorio (por defecto 1.5)
//   --hoja <carpeta>    guarda una hoja de contacto (JPG liviano) para revisar las vistas
//
// Requiere sharp: `npm i --no-save sharp` en la raiz (node_modules queda fuera de git).
// Salida: assets/img/trabajos/<slug>/e1-800.avif ... m1-780.webp y og.jpg
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { launch, sleep } from './lib/cdp.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require(process.env.NVY_SHARP || 'sharp'); } catch {
  console.error('Falta sharp. Corre `npm i --no-save sharp` en la raiz del repo.');
  process.exit(1);
}

const [slug, url, ...resto] = process.argv.slice(2);
if (!slug || !url) {
  console.error('Uso: node _build/capturas.mjs <slug> <url> [--vistas 3] [--espera 3500] [--pos-e 0,1.2,2.4] [--pos-m 0,1.3,2.8] [--solo e|m] [--hoja <carpeta>]');
  process.exit(1);
}
const opt = {};
for (let i = 0; i < resto.length; i += 2) opt[resto[i].replace(/^--/, '')] = resto[i + 1];
const VISTAS = Number(opt.vistas || 3);
const ESPERA = Number(opt.espera || 3500);
const SALIDA = join(RAIZ, 'assets', 'img', 'trabajos', slug);

// Escritorio a x1.5 (2160x1350): a x2 Chrome headless se cuelga en sitios con
// muchos efectos. Si aun asi se cuelga, bajar con --dpr 1.25 o --dpr 1.
// AVIF llega al ancho maximo de la captura; WebP (respaldo para Safari viejo)
// se queda en 1600 px para no duplicar peso en el repo.
const DPR_E = Number(opt.dpr || 1.5);
const MAX_E = Math.round(1440 * DPR_E);
const DISPOSITIVOS = {
  e: { w: 1440, h: 900, dpr: DPR_E, mobile: false, avif: [...new Set([800, Math.min(1600, MAX_E), MAX_E])], webp: [800, Math.min(1600, MAX_E)], pos: opt['pos-e'] },
  m: { w: 390, h: 844, dpr: 2, mobile: true, avif: [390, 780], webp: [390, 780], pos: opt['pos-m'] },
};

// Elige posiciones que caigan al inicio de secciones reales, separadas al menos ~una pantalla.
const AUTO_POS = (n) => `(() => {
  const vh = innerHeight, H = document.documentElement.scrollHeight;
  const tops = [...document.querySelectorAll('section, header + div, main > div, footer')]
    .map(el => Math.round(el.getBoundingClientRect().top + scrollY))
    .filter(t => t > vh * 0.6 && t < H - vh * 0.6)
    .sort((a, b) => a - b);
  const out = [0];
  for (const t of tops) {
    if (out.length >= ${n}) break;
    if (t - out[out.length - 1] >= vh * 0.9) out.push(t);
  }
  while (out.length < ${n} && out[out.length - 1] + vh * 1.1 < H - vh * 0.5) out.push(out[out.length - 1] + Math.round(vh * 1.1));
  return out;
})()`;

async function codificar(buf, nombre, d) {
  for (const w of d.avif) await sharp(buf).resize({ width: w }).avif({ quality: 52, effort: 4 }).toFile(join(SALIDA, `${nombre}-${w}.avif`));
  for (const w of d.webp) await sharp(buf).resize({ width: w }).webp({ quality: 76, effort: 5 }).toFile(join(SALIDA, `${nombre}-${w}.webp`));
}

async function hojaDeContacto(capturas, ruta) {
  const e = capturas.filter((c) => c.tipo === 'e');
  const m = capturas.filter((c) => c.tipo === 'm');
  const piezas = [];
  for (const [i, c] of e.entries()) piezas.push({ input: await sharp(c.buf).resize({ width: 480 }).toBuffer(), left: 10 + i * 490, top: 10 });
  for (const [i, c] of m.entries()) piezas.push({ input: await sharp(c.buf).resize({ width: 150 }).toBuffer(), left: 10 + i * 160, top: 320 });
  mkdirSync(dirname(ruta), { recursive: true });
  await sharp({ create: { width: 1480, height: 660, channels: 3, background: '#d9d9d9' } }).composite(piezas).jpeg({ quality: 72 }).toFile(ruta);
}

// Cada vista se toma en una carga nueva de la pagina. Algunos sitios dejan al
// compositor de Chrome headless trabado si se captura despues de hacer scroll
// (o al volver arriba), asi que no se reutiliza la pagina entre vistas. Si una
// captura no responde en 20 s, se reinicia Chrome entero y se reintenta.
let b = null;
async function sesion(d) {
  if (b) await b.close();
  // Con GPU: sin ella, Chrome dibuja por software y los desenfoques grandes a x2 se eternizan.
  b = await launch({ profile: join(tmpdir(), 'nvy-capturas-chrome'), port: 9341, args: ['--enable-gpu', '--use-angle=d3d11'] });
  await b.viewport(d.w, d.h, { mobile: d.mobile, dpr: d.dpr });
}
const conLimite = (p, ms) => Promise.race([p.catch(() => null), sleep(ms).then(() => null)]);

async function vista(d, y) {
  for (let intento = 1; intento <= 3; intento++) {
    if (intento > 1) { console.log(`  reinicio de Chrome (intento ${intento})`); await sesion(d); }
    const cargo = await conLimite(b.goto(url, ESPERA).then(() => true), 70000);
    if (!cargo) continue;
    if (y > 0) {
      await conLimite(b.eval(`window.scrollTo({ top: ${y}, behavior: 'instant' })`), 10000);
      await sleep(1800);
    }
    const buf = await conLimite(b.shot(), 20000);
    if (buf) return buf;
  }
  throw new Error(`${slug}: no se pudo capturar la vista en y=${y}`);
}

const capturas = [];
try {
  mkdirSync(SALIDA, { recursive: true });
  for (const [tipo, d] of Object.entries(DISPOSITIVOS)) {
    if (opt.solo && opt.solo !== tipo) continue;
    // Borra solo las vistas previas de este dispositivo (e1-800.avif, m2-390.webp, etc.)
    for (const f of readdirSync(SALIDA)) if (new RegExp(`^${tipo}\\d+-\\d+\\.(avif|webp)$`).test(f)) rmSync(join(SALIDA, f));
    await sesion(d);

    // La portada va primero, recien cargada y sin tocar el scroll.
    const portada = await vista(d, 0);
    const pos = d.pos
      ? d.pos.split(',').map((x) => Math.round(Number(x) * d.h))
      : (await conLimite(b.eval(AUTO_POS(VISTAS)), 10000)) || [0, Math.round(d.h * 1.2), Math.round(d.h * 2.4)];
    console.log(`${slug} ${tipo}: posiciones`, pos.slice(0, VISTAS).join(', '));
    for (const [i, y] of pos.slice(0, VISTAS).entries()) {
      const buf = i === 0 ? portada : await vista(d, y);
      capturas.push({ tipo, buf });
      await codificar(buf, `${tipo}${i + 1}`, d);
    }
  }

  // Imagen para compartir (Open Graph): la portada de escritorio, 1200x630.
  const og = capturas.find((c) => c.tipo === 'e');
  if (og) {
    await sharp(og.buf).resize({ width: 1200 }).extract({ left: 0, top: 0, width: 1200, height: 630 })
      .jpeg({ quality: 82, mozjpeg: true }).toFile(join(SALIDA, 'og.jpg'));
  }
  if (opt.hoja) await hojaDeContacto(capturas, join(opt.hoja, `${slug}.jpg`));
  console.log(`${slug}: listo (${capturas.length} vistas)`);
} finally {
  if (b) await b.close();
}
