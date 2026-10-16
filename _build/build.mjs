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
  if (p.linea && !(Array.isArray(p.linea) && p.linea.length === 2 && p.linea.every((x) => /^#[0-9a-f]{6}$/i.test(x)))) {
    throw new Error(`"${p.slug}": linea tiene que ser una lista de 2 colores hex (izquierda, derecha)`);
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
// "ajustes" ({ posicion: em }) corre una letra, y las que le siguen, para afinar un par.
function letras(texto, { degradado = false, desde = 0, corte = Infinity, ajustes = {} } = {}) {
  let n = desde;
  let k = 0;
  return texto.split(' ').map((palabra) => {
    let x = 0;
    const ls = [...palabra].map((ch) => {
      const i = k++;
      const extra = ajustes[i] || 0;
      x += extra;
      const estilo = `--n:${n++}${degradado ? `;--x:${x.toFixed(4)}` : ''}${extra ? `;margin-left:calc(${degradado ? '-.04em + ' : ''}${extra}em)` : ''}`;
      const s = `<span class="letra${i >= corte ? ' letra--b' : ''}" style="${estilo}">${esc(ch)}</span>`;
      x += anchoEm(ch);
      return s;
    }).join('');
    const clase = degradado ? ' palabra--degradado' : '';
    return `<span class="palabra${clase}"${degradado ? ` style="--w:${x.toFixed(4)}"` : ''} aria-hidden="true">${ls}</span>`;
  }).join(' ');
}


// Colores de marca de cada proyecto (sacados de su logo o su sitio) para pintar su nombre.
// Van como variables CSS: --m1..4 la paleta principal y --n1..4 la del segundo tramo.
const estiloMarca = (p) => [
  ...(p.colores || []).map((x, i) => `--m${i + 1}:${x}`),
  ...(p.colores2 || []).map((x, i) => `--n${i + 1}:${x}`),
].join(';');
// Dos colores planos de la marca para la linea de su reseña: "linea" en el JSON si esta,
// o el principal y el del segundo tramo (el claro, si la marca tiene uno solo). Sobre
// negro, un tono muy oscuro se cambia por el siguiente mas claro para que la linea se vea.
const luminancia = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const tonoVisible = (paleta, i) => (luminancia(paleta[i]) < 0.08 ? paleta[i + 1] : paleta[i]);
const coloresLinea = (p) => (!p ? null : p.linea || (p.colores
  ? [tonoVisible(p.colores, 1), p.colores2 ? tonoVisible(p.colores2, 1) : p.colores[2]]
  : null));
// Telon de la transicion al entrar a un proyecto: los colores de su nombre, de claro
// arriba a oscuro abajo. Si la marca tiene dos tonos (como Oncosur), mitad y mitad.
const tramoTelon = (pal) => `linear-gradient(176deg, ${pal[2]}, ${pal[1]} 55%, ${pal[0]})`;
const telon = (p) => (!p.colores ? '' : p.colores2
  ? `${tramoTelon(p.colores)} left / 50% 100% no-repeat, ${tramoTelon(p.colores2)} right / 50% 100% no-repeat`
  : tramoTelon(p.colores));
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

function cabecera() {
  return `<header class="cab" data-cab>
  <a class="cab__logo" href="/" aria-label="Nvy Studios, inicio">Nvy Studios</a>
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

function layout({ titulo, descripcion, ruta, cuerpo, ld, og = {}, verificacion = false, indexar = true, aviso = '', claseBody = '', cortina = '' }) {
  const canonical = BASE + ruta;
  const ogImagen = og.imagen || `${BASE}/assets/brand/og-nvy.png`;
  const ogTitulo = esc(og.titulo || titulo);
  const ogDesc = esc(og.descripcion || descripcion);
  return `<!doctype html>
${MARCA}${aviso ? `\n${aviso}` : ''}
<html lang="es-CL" class="no-js"${cortina ? ` style="--cortina:${cortina}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${indexar ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<meta name="theme-color" content="#0B0B0C">
<meta name="author" content="Gaspar Quijada">
${verificacion ? `<!-- Verificacion de propiedad en Google Search Console.
     No quitar: si desaparece, Google revoca la verificacion del dominio. -->
<meta name="google-site-verification" content="qMeHLmhfhbZDGK7SI2YYOOThsJwS5k1eij4IBdaVsSo">
` : ''}<link rel="icon" href="/assets/brand/favicon.ico?v=${version('assets/brand/favicon.ico')}" sizes="32x32">
<link rel="icon" href="/assets/brand/favicon.svg?v=${version('assets/brand/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png?v=${version('assets/brand/apple-touch-icon.png')}">
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
<script type="speculationrules">{"prerender":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/*.html"}}]},"eagerness":"moderate"}]}</script>
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>\n` : ''}</head>
<body id="top"${claseBody ? ` class="${claseBody}"` : ''}>
<a class="saltar" href="#contenido">saltar al contenido</a>
${cabecera()}
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
// La "S" y la "t" de Studios se tocan justo en el borde. Con el espaciado de la portada
// la t se montaba 0.0035 em sobre la S (medido sobre el dibujo real de la fuente a 1000 px).
const JUNTA_ST = 0.0035;

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
  const citas = testimoniosVisibles.map((t) => {
    const linea = coloresLinea(proyectos.find((p) => p.slug === t.proyecto));
    return `      <li class="cita${linea ? ' cita--marca' : ''}"${linea ? ` style="--l1:${linea[0]};--l2:${linea[1]}"` : ''}>
        <blockquote class="cita__txt" data-reveal="texto"><p>“${esc(t.texto)}”</p></blockquote>
        <p class="cita__autor"><strong>${esc(t.nombre)}</strong><span>${esc(t.cargo)}</span></p>
      </li>`;
  }).join('\n');

  const cuerpo = `<main id="contenido">
  <section class="portada" aria-labelledby="portada-titulo">
    <h1 class="portada__h1" id="portada-titulo" aria-label="Nvy Studios. ${esc(sitio.bajada)}">
      <span class="portada__marca" style="--em:${(anchoEm('Nvy Studios') + JUNTA_ST).toFixed(4)};--em-max:${(anchoEm('Studios') + JUNTA_ST).toFixed(4)}">${letras('Nvy Studios', { degradado: true, ajustes: { 4: JUNTA_ST } })}</span>
      <span class="portada__bajada">${sitio.bajada.split(' · ').map((t) => `<span>${esc(t)}</span>`).join('')}</span>
    </h1>
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
      <p class="sobre__lead" data-reveal="texto">${esc(sitio.sobreMi)}</p>
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
    <p class="proyecto__resumen" data-reveal="texto">${esc(p.resumen)}</p>
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
    cortina: telon(p),
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
