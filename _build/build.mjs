// Genera el sitio desde data/proyectos.json: home, una pagina por proyecto,
// paginas legales, 404 y sitemap. Sin dependencias, solo Node.
//
//   node _build/build.mjs
//
// Vercel lo corre en cada deploy (vercel.json), asi que sumar un proyecto es
// agregar su entrada en data/proyectos.json y sus capturas (_build/capturas.mjs).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anchoEm } from './lib/anchos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');
const escribir = (ruta, contenido) => {
  mkdirSync(dirname(join(RAIZ, ruta)), { recursive: true });
  writeFileSync(join(RAIZ, ruta), contenido);
};

const { sitio, proyectos: todos, testimonios } = JSON.parse(leer('data/proyectos.json'));
const BASE = sitio.url.replace(/\/$/, '');
const HOY = new Date().toISOString().slice(0, 10);
const ANIO = new Date().getFullYear();
const MARCA = '<!-- GENERADO por _build/build.mjs desde data/proyectos.json. No editar a mano: se pisa en el proximo build. -->';

const ESTADOS = { 'lanzado': 'lanzado', 'en-desarrollo': 'en desarrollo', 'demo': 'demo' };
const FILTROS = [['todos', 'todos'], ['lanzado', 'lanzados'], ['en-desarrollo', 'en desarrollo'], ['demo', 'demos']];
const BOTON_SITIO = { 'lanzado': 'ver sitio', 'en-desarrollo': 'ver avance', 'demo': 'ver demo' };

// ---------- validacion: mejor fallar aca que publicar una pagina rota ----------
const slugs = new Set();
for (const p of todos) {
  for (const k of ['slug', 'nombre', 'rubro', 'anio', 'estado', 'url', 'resumen']) {
    if (!p[k]) throw new Error(`Proyecto "${p.slug || p.nombre || '?'}": falta el campo "${k}"`);
  }
  if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`Slug invalido "${p.slug}": solo minusculas, numeros y guiones`);
  if (slugs.has(p.slug)) throw new Error(`Slug repetido: "${p.slug}"`);
  if (!ESTADOS[p.estado]) throw new Error(`"${p.slug}": el estado "${p.estado}" no existe (usa lanzado, en-desarrollo o demo)`);
  if (p.estado === 'en-desarrollo' && p.avance && !(p.avance.porcentaje >= 0 && p.avance.porcentaje <= 100)) {
    throw new Error(`"${p.slug}": avance.porcentaje tiene que ir de 0 a 100`);
  }
  for (const k of ['colores', 'colores2']) {
    if (p[k] && !(Array.isArray(p[k]) && p[k].length === 4 && p[k].every((x) => /^#[0-9a-f]{6}$/i.test(x)))) {
      throw new Error(`"${p.slug}": ${k} tiene que ser una lista de 4 colores hex (oscuro, principal, claro, brillo)`);
    }
  }
  if (p.colores2 && !(p.corte > 0)) throw new Error(`"${p.slug}": con colores2 falta "corte" (letras del primer tramo)`);
  slugs.add(p.slug);
}

// Solo se publican los estados de sitio.estadosVisibles (por ahora, solo "lanzado").
// Los demas quedan en el JSON para sumarlos cambiando su estado o esa lista.
const VISIBLES = sitio.estadosVisibles || Object.keys(ESTADOS);
const proyectos = todos.filter((p) => VISIBLES.includes(p.estado));
const publicados = new Set(proyectos.map((p) => p.slug));
const testimoniosVisibles = testimonios.filter((t) => !t.proyecto || publicados.has(t.proyecto));

// ---------- utilidades ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (i) => String(i + 1).padStart(2, '0');
const dominio = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const wa = (texto = sitio.whatsappTexto) => `https://wa.me/${sitio.whatsapp}?text=${encodeURIComponent(texto)}`;
const version = (ruta) => createHash('md5').update(readFileSync(join(RAIZ, ruta))).digest('hex').slice(0, 8);
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const externo = 'target="_blank" rel="noopener noreferrer"';

const TRAZOS = {
  derecha: '<path d="M3.5 12h16m-6.5-6.5 6.5 6.5-6.5 6.5"/>',
  diagonal: '<path d="M6.5 17.5 17.5 6.5m-9.5 0h9.5V16"/>',
  arriba: '<path d="M12 20.5v-16m-6.5 6.5L12 4.5l6.5 6.5"/>',
  abajo: '<path d="M12 3.5v16m6.5-6.5L12 19.5 5.5 13"/>',
  izquierda: '<path d="M20.5 12h-16m6.5 6.5L4.5 12 11 5.5"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.2" cy="6.8" r=".5" fill="currentColor"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16m0-8.2v.1m3.6 8.1v-5.5m0 2.6c0-1.6 1-2.7 2.3-2.7s2.2 1 2.2 2.7V16"/>',
  whatsapp: '<path d="M4.6 19.4l1.1-3.5a8 8 0 1 1 3 2.9z"/><path d="M9.3 8.9c.1 2.4 2.3 4.7 4.9 5l.9-1.2-1.6-.9-.8.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.8-.9-1.6z"/>',
};
const icono = (nombre) => `<svg class="ico ico--${nombre}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${TRAZOS[nombre]}</svg>`;

// Logos de redes en relleno (Simple Icons, licencia CC0): se ven nitidos en tamano chico.
const REDES = {
  instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
};
const logoRed = (nombre) => `<svg class="ico ico--${nombre}" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${REDES[nombre]}"/></svg>`;

// Lee las capturas que existan para un proyecto: e1..eN (escritorio) y m1..mN (celular).
function vistas(slug) {
  const dir = join(RAIZ, 'assets', 'img', 'trabajos', slug);
  const out = { e: [], m: [], og: false };
  if (!existsSync(dir)) return out;
  const archivos = readdirSync(dir);
  const anchos = (prefijo, ext) => archivos
    .filter((f) => f.startsWith(prefijo) && f.endsWith(ext))
    .map((f) => Number(f.slice(prefijo.length, -ext.length)))
    .filter(Boolean)
    .sort((a, b) => a - b);
  for (const tipo of ['e', 'm']) {
    for (let n = 1; n < 10; n++) {
      const avif = anchos(`${tipo}${n}-`, '.avif');
      const webp = anchos(`${tipo}${n}-`, '.webp');
      if (!avif.length && !webp.length) break;
      out[tipo].push({ base: `/assets/img/trabajos/${slug}/${tipo}${n}`, avif, webp, movil: tipo === 'm' });
    }
  }
  out.og = archivos.includes('og.jpg');
  return out;
}

function picture(v, { sizes, alt, carga = 'lazy' }) {
  const [w, h] = v.movil ? [780, 1688] : [1600, 1000];
  const set = (lista, ext) => lista.map((a) => `${v.base}-${a}.${ext} ${a}w`).join(', ');
  const respaldo = v.webp.length ? `${v.base}-${v.webp.at(-1)}.webp` : `${v.base}-${v.avif.at(-1)}.avif`;
  return '<picture>'
    + (v.avif.length ? `<source type="image/avif" srcset="${set(v.avif, 'avif')}" sizes="${sizes}">` : '')
    + (v.webp.length ? `<source type="image/webp" srcset="${set(v.webp, 'webp')}" sizes="${sizes}">` : '')
    + `<img src="${respaldo}" width="${w}" height="${h}" alt="${esc(alt)}" loading="${carga}" decoding="async">`
    + '</picture>';
}
const sinCaptura = (p) => `<div class="sin-captura" aria-hidden="true"><span>${esc(p.nombre)}</span></div>`;

// Parte un titulo en letras para que entren una por una. Cada palabra es su propia
// mascara y lleva su ancho (--w); cada letra lleva su posicion dentro de la palabra
// (--x, en em). Con eso el degradado se ve continuo en toda la palabra aunque cada
// letra sea su propia caja. El titulo que lo usa lleva aria-label con el texto entero.
// Con "corte", las letras desde esa posicion (sin contar espacios) usan el segundo color
// de la marca (nombres de dos tonos, como en el logo de Oncosur).
function letras(texto, { degradado = false, claro = false, desde = 0, corte = Infinity } = {}) {
  let n = desde;
  let k = 0;
  return texto.split(' ').map((palabra) => {
    let x = 0;
    const ls = [...palabra].map((ch) => {
      const s = `<span class="letra${k++ >= corte ? ' letra--b' : ''}" style="--n:${n++};--x:${x.toFixed(3)}">${esc(ch)}</span>`;
      x += anchoEm(ch);
      return s;
    }).join('');
    const clase = degradado ? ' palabra--degradado' : claro ? ' palabra--degradado palabra--claro' : '';
    return `<span class="palabra${clase}" style="--w:${anchoEm(palabra).toFixed(3)}" aria-hidden="true">${ls}</span>`;
  }).join(' ');
}

// Colores de marca de cada proyecto (sacados de su logo o su sitio) para pintar su nombre.
// Van como variables CSS: --m1..4 la paleta principal y --n1..4 la del segundo tramo.
const estiloMarca = (p) => [
  ...(p.colores || []).map((x, i) => `--m${i + 1}:${x}`),
  ...(p.colores2 || []).map((x, i) => `--n${i + 1}:${x}`),
].join(';');
// El mismo corte para textos que no se parten en letras (la lista de trabajos).
function tramos(texto, corte) {
  if (!corte) return `<span class="tramo">${esc(texto)}</span>`;
  let k = 0;
  let i = 0;
  for (; i < texto.length; i++) {
    if (texto[i] === ' ') continue;
    if (k === corte) break;
    k++;
  }
  return `<span class="tramo">${esc(texto.slice(0, i))}</span><span class="tramo tramo--b">${esc(texto.slice(i))}</span>`;
}

// ---------- piezas comunes ----------
const CSS_V = version('assets/css/nvy.css');
const JS_V = version('assets/js/nvy.js');

function cabecera(clase = '') {
  return `<header class="cab${clase ? ` ${clase}` : ''}" data-cab>
  <a class="cab__logo" href="/" aria-label="Nvy Studios, inicio">Nvy Studios</a>
  <nav class="cab__nav" aria-label="Secciones">
    <a href="/#trabajos">Trabajos</a><a href="/#sobre-mi">Sobre mí</a><a href="/#contacto">Contacto</a>
    <a class="cab__cta" href="${wa()}" ${externo}>Conversemos</a>
  </nav>
  <button class="cab__menu" type="button" aria-expanded="false" aria-controls="menu" data-menu-boton><span data-menu-txt>menú</span></button>
</header>`;
}

function menu() {
  const links = [['/#trabajos', 'trabajos'], ['/#sobre-mi', 'sobre mí'], ['/#contacto', 'contacto']];
  const redes = [['instagram', sitio.instagram], ['linkedin', sitio.linkedin]].filter(([, u]) => u);
  return `<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menú" data-menu inert>
  <button class="menu__velo" type="button" tabindex="-1" aria-label="Cerrar menú" data-menu-cerrar></button>
  <div class="menu__panel">
  <nav class="menu__nav" aria-label="Principal">
    <ol class="menu__lista">
${links.map(([href, txt], i) => `      <li class="menu__item" style="--i:${i}"><a class="menu__link" href="${href}" data-menu-link><span class="menu__txt"><span>${txt}</span></span></a></li>`).join('\n')}
    </ol>
  </nav>
  <div class="menu__pie">
${redes.length ? `    <div class="menu__col"><span class="menu__lbl">redes</span>${redes.map(([n, u]) => `<a href="${esc(u)}" ${externo}>${n} ${icono('diagonal')}</a>`).join('')}</div>\n` : ''}    <div class="menu__col"><span class="menu__lbl">escribir</span><a href="mailto:${sitio.correo}">${sitio.correo}</a><a href="${wa()}" ${externo}>whatsapp ${icono('diagonal')}</a></div>
    <div class="menu__col"><span class="menu__lbl">estudio</span><span>${esc(sitio.ciudad)}</span></div>
  </div>
  </div>
</div>`;
}

function pie() {
  return `<footer class="pie">
  <p class="pie__copy">© ${ANIO} Nvy Studios</p>
  <nav class="pie__legal" aria-label="Legal"><a href="/privacidad.html">privacidad</a><a href="/terminos.html">términos</a></nav>
  <a class="pie__arriba" href="#top" data-arriba>volver arriba ${icono('arriba')}</a>
</footer>`;
}

function layout({ titulo, descripcion, ruta, cuerpo, ld, og = {}, verificacion = false, indexar = true, aviso = '', claseBody = '', claseCab = '', scripts = [] }) {
  const canonical = BASE + ruta;
  const ogImagen = og.imagen || `${BASE}/assets/brand/og-nvy.png`;
  const ogTitulo = esc(og.titulo || titulo);
  const ogDesc = esc(og.descripcion || descripcion);
  return `<!doctype html>
${MARCA}${aviso ? `\n${aviso}` : ''}
<html lang="es-CL" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${indexar ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<meta name="theme-color" content="#0A1F5C">
<meta name="author" content="Gaspar Quijada">
${verificacion ? `<!-- Verificacion de propiedad en Google Search Console.
     No quitar: si desaparece, Google revoca la verificacion del dominio. -->
<meta name="google-site-verification" content="qMeHLmhfhbZDGK7SI2YYOOThsJwS5k1eij4IBdaVsSo">
` : ''}<link rel="icon" href="/assets/brand/favicon.ico" sizes="any">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/assets/brand/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="${og.tipo || 'website'}">
<meta property="og:site_name" content="NVY Studios">
<meta property="og:locale" content="es_CL">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${ogTitulo}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:image" content="${ogImagen}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(og.alt || titulo)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitulo}">
<meta name="twitter:description" content="${ogDesc}">
<meta name="twitter:image" content="${ogImagen}">
<link rel="preload" href="/assets/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/nvy.css?v=${CSS_V}">
<script>(function(h){h.className='js'+('onpagereveal' in window?'':' sin-vt');try{var mm=function(q){return matchMedia(q).matches};if(mm('(max-width:720px), (hover:none)'))h.className+=' estatico'}catch(e){}addEventListener('pagereveal',function(e){window.__nvyVT=e.viewTransition||null});setTimeout(function(){if(!window.NVY)h.className='no-js'},4000)})(document.documentElement)</script>
<script defer src="/assets/vendor/lenis.min.js"></script>
<script defer src="/assets/js/nvy.js?v=${JS_V}"></script>
${scripts.map((s) => `<script defer src="/assets/js/${s}?v=${version(`assets/js/${s}`)}"></script>\n`).join('')}<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/*.html"}}]},"eagerness":"moderate"}]}</script>
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>\n` : ''}</head>
<body id="top"${claseBody ? ` class="${claseBody}"` : ''}>
<a class="saltar" href="#contenido">saltar al contenido</a>
${cabecera(claseCab)}
${menu()}
${cuerpo}
${pie()}
</body>
</html>
`;
}

// ---------- datos estructurados ----------
const NEGOCIO = {
  '@type': 'ProfessionalService',
  '@id': `${BASE}/#business`,
  name: 'NVY Studios',
  description: sitio.descripcion,
  url: `${BASE}/`,
  logo: `${BASE}/assets/brand/logo-mark.png`,
  image: `${BASE}/assets/brand/og-nvy.png`,
  telephone: sitio.telefono,
  email: sitio.correo,
  currenciesAccepted: 'CLP',
  paymentAccepted: 'Transferencia bancaria',
  knowsLanguage: 'es-CL',
  founder: { '@type': 'Person', name: 'Gaspar Quijada', ...(sitio.linkedin ? { sameAs: [sitio.linkedin] } : {}) },
  ...(sitio.instagram ? { sameAs: [sitio.instagram] } : {}),
  address: { '@type': 'PostalAddress', addressLocality: 'Valdivia', addressRegion: 'Región de Los Ríos', addressCountry: 'CL' },
  areaServed: [
    { '@type': 'City', name: 'Valdivia' },
    { '@type': 'AdministrativeArea', name: 'Región de Los Ríos' },
    { '@type': 'Country', name: 'Chile' },
  ],
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: sitio.telefono, email: sitio.correo, availableLanguage: 'Spanish' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de NVY Studios',
    itemListElement: [
      ['Landing Page', 'Página única de alta conversión, diseñada y programada desde cero, con integración de WhatsApp y SEO técnico básico. Entrega en 5 días hábiles. Precio a cotizar según el proyecto.'],
      ['Web Profesional', 'Sitio de hasta 5 secciones con animaciones, formulario de contacto, integración de WhatsApp y SEO on-page completo. Entrega en 7 días hábiles. Precio a cotizar según el proyecto.'],
      ['Experiencia Premium', 'Plataforma de hasta 10 páginas con SEO técnico avanzado, sistema de reservas, blog opcional y estrategia de visibilidad local. Entrega en 10 a 14 días hábiles. Precio a cotizar según el proyecto.'],
      ['Crecimiento y Recurrencia', 'SEO local, base de datos de clientes y automatización de fidelización, para negocios que ya tienen su web lista. Precio a cotizar según el proyecto.'],
    ].map(([name, description]) => ({ '@type': 'Offer', availability: 'https://schema.org/InStock', itemOffered: { '@type': 'Service', name, description } })),
  },
};

// ---------- home ----------
function paginaHome() {
  const obras = proyectos.map((p, i) => {
    const v = vistas(p.slug);
    const portada = v.e[0];
    return `      <li class="obra" data-estado="${p.estado}"${portada ? ` data-preview="${portada.base}"` : ''}>
        <a class="obra__link" href="/trabajos/${p.slug}">
          <span class="obra__nombre${p.colores ? ' marca' : ''}"${p.colores ? ` style="${estiloMarca(p)}"` : ''}><span>${tramos(p.nombre, p.corte)}</span></span>
          <span class="obra__rubro">${esc(p.rubro)}</span>
          <span class="obra__anio">${p.anio}</span>
          <span class="obra__estado">${ESTADOS[p.estado]}</span>
          <span class="obra__flecha">${icono('derecha')}</span>
        </a>
        <div class="obra__media"><div class="obra__media-in">
          <div class="obra__foto">${portada ? picture(portada, { sizes: '(min-width: 900px) 48vw, 92vw', alt: `Portada del sitio de ${p.cliente || p.nombre}` }) : sinCaptura(p)}</div>
          <a class="obra__ver" href="/trabajos/${p.slug}" tabindex="-1">ver proyecto ${icono('derecha')}</a>
        </div></div>
      </li>`;
  }).join('\n');

  // Los filtros solo aparecen si hay mas de un estado publicado.
  const estados = new Set(proyectos.map((p) => p.estado));
  const filtros = estados.size < 2 ? '' : `        <div class="filtros" role="group" aria-label="Filtrar por estado">
${FILTROS.filter(([valor]) => valor === 'todos' || estados.has(valor)).map(([valor, txt]) => `          <button class="ctrl" type="button" data-filtro="${valor}" aria-pressed="${valor === 'todos'}">${txt}</button>`).join('\n')}
        </div>
`;

  const cinta = sitio.rubros.map((r) => `<span>${esc(r)}</span><i></i>`).join('');
  const citas = testimoniosVisibles.map((t, i) => `      <li class="cita">
        <blockquote class="cita__txt" data-reveal="lineas"><p>“${esc(t.texto)}”</p></blockquote>
        <p class="cita__autor"><strong>${esc(t.nombre)}</strong><span>${esc(t.cargo)}</span></p>
      </li>`).join('\n');

  const linea1 = 'Webs a medida para';
  const linea2 = 'marcas que se atreven.';
  // Abajo a la derecha: el nombre de cada proyecto, que cambia letra por letra.
  // Las barritas marcan el tiempo de cada uno y sirven para saltar a otro.
  const deletrear = (texto) => [...texto].map((ch, i) => (ch === ' '
    ? '<span class="dl dl--esp"> </span>'
    : `<span class="dl" style="--i:${i}">${esc(ch)}</span>`)).join('');
  const destacados = proyectos.map((p, i) => `          <a class="destacado${i === 0 ? ' is-actual' : ''}" href="/trabajos/${p.slug}" aria-label="${esc(p.nombre)}"${i === 0 ? '' : ' tabindex="-1" aria-hidden="true"'}><span class="destacado__nombre">${deletrear(p.nombre)}</span>${icono('diagonal')}</a>`).join('\n');
  const barras = proyectos.map((p, i) => `<button class="destacados__barra${i === 0 ? ' is-actual' : ''}" type="button" aria-label="Mostrar ${esc(p.nombre)}"><i></i></button>`).join('');
  const redesHero = [['Instagram', 'instagram', sitio.instagram], ['LinkedIn', 'linkedin', sitio.linkedin], ['WhatsApp', 'whatsapp', wa()]]
    .filter(([, , u]) => u)
    .map(([n, ic, u]) => `<a href="${esc(u)}" ${externo} aria-label="${n}">${logoRed(ic)}</a>`).join('');

  const cuerpo = `<main id="contenido">
  <section class="portada" aria-labelledby="portada-titulo">
    <div class="portada__marco">
      <canvas class="portada__fondo" aria-hidden="true" data-fondo></canvas>
      <h1 class="portada__titulo" id="portada-titulo" aria-label="${esc(linea1)} ${esc(linea2)}">
        <span class="portada__linea">${letras(linea1, { claro: true })}</span>
        <span class="portada__linea">${letras(linea2, { claro: true, desde: linea1.replace(/ /g, '').length })}</span>
      </h1>
      <div class="portada__datos">
        <p>${esc(sitio.ciudad)}</p>
        <a href="tel:${sitio.telefono}">+56 9 4097 6219</a>
        <div class="portada__redes">${redesHero}</div>
      </div>
      <div class="portada__pie">
        <p class="portada__desc">${esc(sitio.heroTexto)}</p>
        <a class="portada__cta" href="#trabajos">Explora nuestro trabajo ${icono('diagonal')}</a>
      </div>
      <div class="portada__proyectos" data-destacados>
        <p class="destacados__rotulo">Proyectos recientes</p>
        <div class="destacados__nombres">
${destacados}
        </div>
        <div class="destacados__barras" role="group" aria-label="Elegir proyecto">${barras}</div>
      </div>
    </div>
  </section>

  <section class="trabajos" id="trabajos" aria-labelledby="trabajos-titulo">
    <div class="trabajos__cab">
      <h2 class="titulo-seccion" id="trabajos-titulo" aria-label="Trabajos" data-reveal="letras">${letras('Trabajos')}</h2>
      <div class="trabajos__ctrl">
${filtros}        <div class="vistas" role="group" aria-label="Cambiar vista">
          <button class="ctrl" type="button" data-vista="lista" aria-pressed="true">lista</button><span aria-hidden="true">|</span><button class="ctrl" type="button" data-vista="grilla" aria-pressed="false">grilla</button>
        </div>
      </div>
    </div>
    <p class="solo-lector" aria-live="polite" data-anuncio></p>
    <div class="obras__cols" aria-hidden="true"><span>proyecto</span><span>rubro</span><span>año</span><span>estado</span></div>
    <ol class="obras" data-obras data-vista="lista">
${obras}
    </ol>
    <div class="vista-previa" aria-hidden="true" data-previa></div>
  </section>

  <div class="cinta" aria-hidden="true"><div class="cinta__pista">${cinta}${cinta}</div></div>

  <section class="sobre" id="sobre-mi" aria-labelledby="sobre-titulo">
    <h2 class="titulo-seccion" id="sobre-titulo" aria-label="Sobre mí" data-reveal="letras">${letras('Sobre mí')}</h2>
    <div class="sobre__texto">
      <p class="sobre__lead" data-reveal="lineas">${esc(sitio.sobreMi)}</p>
${sitio.linkedin || sitio.instagram ? `      <p class="sobre__redes">${[['instagram', sitio.instagram], ['linkedin', sitio.linkedin]].filter(([, u]) => u).map(([n, u]) => `<a href="${esc(u)}" ${externo}>${n} ${icono('diagonal')}</a>`).join('')}</p>\n` : ''}    </div>
  </section>

  <section class="testimonios" aria-labelledby="testimonios-titulo">
    <h2 class="titulo-seccion" id="testimonios-titulo" aria-label="Testimonios" data-reveal="letras">${letras('Testimonios')}</h2>
    <ol class="citas">
${citas}
    </ol>
  </section>

  <section class="contacto" id="contacto" aria-labelledby="contacto-titulo">
    <div class="rotulo" data-reveal="linea"><span>contacto</span></div>
    <h2 class="contacto__titulo" id="contacto-titulo" aria-label="¿Conversamos?" data-reveal="letras" style="--em:${anchoEm('¿Conversamos?').toFixed(3)}">${letras('¿Conversamos?', { degradado: true })}</h2>
    <div class="contacto__fila">
      <a class="boton" href="${wa()}" ${externo}>escribir por whatsapp ${icono('diagonal')}</a>
      <a class="contacto__dato" href="mailto:${sitio.correo}">${sitio.correo}</a>
      <span class="contacto__dato">${esc(sitio.ciudad)}</span>
    </div>
  </section>
</main>`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      NEGOCIO,
      { '@type': 'WebSite', '@id': `${BASE}/#website`, url: `${BASE}/`, name: 'NVY Studios', inLanguage: 'es-CL', publisher: { '@id': `${BASE}/#business` } },
      {
        '@type': 'ItemList', '@id': `${BASE}/#trabajos`, name: 'Trabajos de NVY Studios', numberOfItems: proyectos.length,
        itemListElement: proyectos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.nombre, url: `${BASE}/trabajos/${p.slug}` })),
      },
    ],
  };

  return layout({
    titulo: sitio.titulo,
    descripcion: sitio.descripcion,
    ruta: '/',
    og: { titulo: sitio.titulo, descripcion: sitio.ogDescripcion, alt: 'NVY Studios — diseño y desarrollo web, Valdivia, Chile' },
    verificacion: true,
    ld,
    cuerpo,
    claseBody: 'pag-home',
    claseCab: 'sobre-portada',
    scripts: ['fondo.js'],
  });
}

// ---------- pagina de proyecto ----------
function paginaProyecto(p, i) {
  const v = vistas(p.slug);
  const sig = proyectos[(i + 1) % proyectos.length];
  const nombre = p.cliente || p.nombre;
  const ficha = [
    ['rubro', p.rubro],
    ['año', p.anio],
    ['estado', ESTADOS[p.estado]],
    p.estado === 'demo' ? ['tipo', 'maqueta conceptual'] : p.plan ? ['plan', p.plan] : null,
  ].filter(Boolean);

  const avance = p.estado === 'en-desarrollo' && p.avance ? `
        <div class="avance" style="--pct:${p.avance.porcentaje}">
          <p class="avance__txt"><span>${esc(p.avance.fase)}</span><span>${p.avance.porcentaje}%</span></p>
          <div class="avance__barra" role="progressbar" aria-label="Avance del proyecto" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.avance.porcentaje}"><span></span></div>
        </div>` : '';

  const piezas = [];
  if (v.e[0]) piezas.push(`    <figure class="gal gal--ancha">${picture(v.e[0], { sizes: '(min-width: 1400px) 1320px, 94vw', alt: `Portada del sitio de ${nombre} en escritorio`, carga: 'eager' })}<figcaption>escritorio</figcaption></figure>`);
  if (v.m.length) piezas.push(`    <figure class="gal gal--moviles"><div class="gal__moviles" style="--n:${v.m.length}">${v.m.map((m, k) => picture(m, { sizes: '(min-width: 900px) 24vw, 42vw', alt: `Vista ${k + 1} del sitio de ${nombre} en celular` })).join('')}</div><figcaption>celular</figcaption></figure>`);
  if (v.e.length > 1) piezas.push(`    <div class="gal gal--dos">${v.e.slice(1).map((e, k) => `<figure>${picture(e, { sizes: '(min-width: 900px) 46vw, 94vw', alt: `Sección ${k + 2} del sitio de ${nombre} en escritorio` })}</figure>`).join('')}</div>`);
  if (!piezas.length) piezas.push(`    <figure class="gal gal--ancha">${sinCaptura(p)}</figure>`);

  const cuerpo = `<main id="contenido" class="proyecto">
  <header class="proyecto__cab">
    <a class="volver" href="/#trabajos">${icono('izquierda')} trabajos</a>
    <h1 class="proyecto__titulo${p.colores ? ' marca' : ''}" aria-label="${esc(p.nombre)}" data-reveal="letras" style="--em:${anchoEm(p.nombre).toFixed(3)};--em-max:${Math.max(...p.nombre.split(' ').map((w) => anchoEm(w))).toFixed(3)}${p.colores ? `;${estiloMarca(p)}` : ''}">${letras(p.nombre, { degradado: true, corte: p.corte })}</h1>
    <dl class="ficha">
${ficha.map(([dt, dd]) => `      <div class="ficha__item"><dt>${dt}</dt><dd>${esc(dd)}</dd></div>`).join('\n')}
    </dl>
  </header>

  <section class="proyecto__intro" aria-label="Sobre el proyecto">
    <p class="proyecto__resumen" data-reveal="lineas">${esc(p.resumen)}</p>
    <div class="proyecto__acciones">${avance}
      <a class="boton" href="${esc(p.url)}" ${externo}>${BOTON_SITIO[p.estado]} ${icono('diagonal')}</a>
      <span class="proyecto__dominio">${esc(dominio(p.url))}</span>
    </div>
  </section>

  <section class="galeria" aria-label="Capturas del sitio">
${piezas.join('\n')}
  </section>

  <nav class="siguiente" aria-label="Siguiente proyecto">
    <a class="siguiente__link" href="/trabajos/${sig.slug}" aria-label="Siguiente proyecto: ${esc(sig.nombre)}">
      <span class="siguiente__lbl">siguiente proyecto ${icono('derecha')}</span>
      <span class="siguiente__nombre${sig.colores ? ' marca' : ''}" data-reveal="letras" style="--em:${anchoEm(sig.nombre).toFixed(3)};--em-max:${Math.max(...sig.nombre.split(' ').map((w) => anchoEm(w))).toFixed(3)}${sig.colores ? `;${estiloMarca(sig)}` : ''}">${letras(sig.nombre, { degradado: true, corte: sig.corte })}</span>
      <span class="siguiente__rubro">${esc(sig.rubro)}</span>
    </a>
  </nav>
</main>`;

  const url = `${BASE}/trabajos/${p.slug}`;
  const imagen = v.og ? `${BASE}/assets/img/trabajos/${p.slug}/og.jpg` : `${BASE}/assets/brand/og-nvy.png`;
  const tipo = p.estado === 'demo' ? 'Maqueta web' : 'Sitio web';
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': `${url}#trabajo`,
        name: `${tipo}: ${nombre}`,
        url,
        description: p.descripcion || p.resumen,
        image: imagen,
        dateCreated: String(p.anio),
        inLanguage: 'es-CL',
        genre: 'Diseño y desarrollo web',
        about: p.rubro,
        creator: { '@id': `${BASE}/#business` },
        ...(p.estado !== 'demo' ? { sameAs: [p.url] } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: p.nombre, item: url },
        ],
      },
    ],
  };

  const titulo = p.estado === 'demo'
    ? `${p.nombre} — Maqueta web para ${p.rubro} · NVY Studios`
    : `${p.nombre} — Diseño web para ${p.rubro} · NVY Studios`;

  return layout({
    titulo,
    descripcion: p.descripcion || p.resumen,
    ruta: `/trabajos/${p.slug}`,
    og: { tipo: 'article', imagen, alt: `Portada del sitio de ${nombre}` },
    ld,
    cuerpo,
    claseBody: 'pag-proyecto',
  });
}

// ---------- paginas legales ----------
const LEGALES = [
  {
    archivo: 'privacidad',
    titulo: 'Política de Privacidad — NVY Studios',
    descripcion: 'Cómo NVY Studios trata los datos personales de quienes contactan el estudio, conforme a la Ley 19.628 y la Ley 21.719 de Chile.',
    ogDescripcion: 'Cómo trato los datos personales de quienes contactan el estudio.',
    h1: 'Política de Privacidad',
    actualizado: '25 de julio de 2026',
    lastmod: '2026-07-25',
  },
  {
    archivo: 'terminos',
    titulo: 'Términos y Condiciones — NVY Studios',
    descripcion: 'Condiciones bajo las que NVY Studios presta servicios de diseño y desarrollo web: pagos, plazos, cambios, propiedad intelectual y mantención.',
    ogDescripcion: 'Condiciones de servicio: pagos, plazos, cambios, propiedad intelectual y mantención.',
    h1: 'Términos y Condiciones',
    actualizado: '25 de julio de 2026',
    lastmod: '2026-07-25',
  },
];

function paginaLegal(l) {
  const fuente = leer(`_build/legales/${l.archivo}.html`).replace(/\r\n/g, '\n');
  const aviso = (fuente.match(/^<!--[\s\S]*?-->/) || [''])[0];
  const contenido = fuente.slice(aviso.length).trim().split('\n').map((x) => `      ${x}`).join('\n');
  const cuerpo = `<main id="contenido" class="legal">
  <header class="legal__cab">
    <a class="volver" href="/">${icono('izquierda')} inicio</a>
    <p class="legal__lbl">legal</p>
    <h1 class="legal__titulo" data-reveal="mascara"><span>${esc(l.h1)}</span></h1>
    <p class="legal__fecha">Última actualización: ${esc(l.actualizado)}</p>
  </header>
  <div class="legal__cuerpo">
${contenido}
  </div>
</main>`;
  return layout({
    titulo: l.titulo,
    descripcion: l.descripcion,
    ruta: `/${l.archivo}.html`,
    og: { tipo: 'article', descripcion: l.ogDescripcion },
    aviso,
    cuerpo,
    claseBody: 'pag-legal',
  });
}

function pagina404() {
  const cuerpo = `<main id="contenido" class="no-existe">
  <p class="no-existe__lbl">error 404</p>
  <h1 class="no-existe__titulo" data-reveal="mascara"><span>Esta página no existe.</span></h1>
  <p class="no-existe__txt">Puede que el link esté mal escrito o que la página se haya movido.</p>
  <a class="boton" href="/#trabajos">ver trabajos ${icono('derecha')}</a>
</main>`;
  return layout({ titulo: 'Página no encontrada — NVY Studios', descripcion: 'Esta página no existe.', ruta: '/404', indexar: false, cuerpo, claseBody: 'pag-404' });
}

// ---------- sitemap ----------
function sitemap() {
  const urls = [
    [`${BASE}/`, HOY, '1.0'],
    ...proyectos.map((p) => [`${BASE}/trabajos/${p.slug}`, HOY, '0.8']),
    ...LEGALES.map((l) => [`${BASE}/${l.archivo}.html`, l.lastmod, '0.3']),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, lastmod, prioridad]) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${prioridad}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

// ---------- escritura ----------
escribir('index.html', paginaHome());
proyectos.forEach((p, i) => escribir(`trabajos/${p.slug}/index.html`, paginaProyecto(p, i)));
for (const l of LEGALES) escribir(`${l.archivo}.html`, paginaLegal(l));
escribir('404.html', pagina404());
escribir('sitemap.xml', sitemap());

// Borra paginas de proyectos que ya no se publican (solo las que genero este script).
const dirTrabajos = join(RAIZ, 'trabajos');
for (const d of readdirSync(dirTrabajos)) {
  const index = join(dirTrabajos, d, 'index.html');
  if (!publicados.has(d) && existsSync(index) && readFileSync(index, 'utf8').includes(MARCA)) {
    rmSync(join(dirTrabajos, d), { recursive: true, force: true });
    console.log(`  borrada pagina vieja: /trabajos/${d}`);
  }
}

const sinCapturas = proyectos.filter((p) => !vistas(p.slug).e.length).map((p) => p.slug);
console.log(`Listo: home, ${proyectos.length} proyectos, ${LEGALES.length} legales, 404 y sitemap.`);
if (sinCapturas.length) console.log(`  Sin capturas todavia: ${sinCapturas.join(', ')} (corre _build/capturas.mjs)`);
