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

// ---------- piezas comunes ----------
const CSS_V = version('assets/css/nvy.css');
const JS_V = version('assets/js/nvy.js');

function cabecera() {
  return `<header class="cab" data-cab>
  <a class="cab__logo" href="/" aria-label="Nvy Studios, inicio">Nvy Studios</a>
  <button class="cab__menu" type="button" aria-expanded="false" aria-controls="menu" data-menu-boton><span data-menu-txt>menu</span></button>
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
${links.map(([href, txt], i) => `      <li class="menu__item" style="--i:${i}"><a class="menu__link" href="${href}" data-menu-link><span class="menu__num">${num(i)}</span><span class="menu__txt"><span>${txt}</span></span></a></li>`).join('\n')}
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
  <a class="pie__arriba" href="#top" data-arriba>back to top ${icono('arriba')}</a>
</footer>`;
}

function layout({ titulo, descripcion, ruta, cuerpo, ld, og = {}, verificacion = false, indexar = true, aviso = '', claseBody = '' }) {
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
<script>(function(h){h.className='js'+('onpagereveal' in window?'':' sin-vt');addEventListener('pagereveal',function(e){window.__nvyVT=e.viewTransition||null});setTimeout(function(){if(!window.NVY)h.className='no-js'},4000)})(document.documentElement)</script>
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
function paginaHome() {
  const obras = proyectos.map((p, i) => {
    const v = vistas(p.slug);
    const portada = v.e[0];
    return `      <li class="obra" data-estado="${p.estado}"${portada ? ` data-preview="${portada.base}"` : ''}>
        <a class="obra__link" href="/trabajos/${p.slug}">
          <span class="obra__num">${num(i)}</span>
          <span class="obra__nombre"><span>${esc(p.nombre)}</span></span>
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
        <span class="cita__num">${num(i)}</span>
        <blockquote class="cita__txt" data-reveal="lineas"><p>“${esc(t.texto)}”</p></blockquote>
        <p class="cita__autor"><strong>${esc(t.nombre)}</strong><span>${esc(t.cargo)}</span></p>
      </li>`).join('\n');

  const cuerpo = `<main id="contenido">
  <section class="portada" aria-labelledby="portada-titulo">
    <h1 class="portada__h1" id="portada-titulo">
      <span class="portada__marca" style="--em:${anchoEm('Nvy Studios').toFixed(3)};--em-max:${anchoEm('Studios').toFixed(3)}"><span class="portada__l"><span class="degradado">Nvy</span></span> <span class="portada__l"><span class="degradado">Studios</span></span></span>
      <span class="portada__bajada"><span>${esc(sitio.bajada)}</span></span>
    </h1>
    <a class="portada__bajar" href="#trabajos" data-ancla><span>trabajos</span> ${icono('abajo')}</a>
  </section>

  <section class="trabajos" id="trabajos" aria-labelledby="trabajos-titulo">
    <div class="trabajos__cab">
      <h2 class="trabajos__titulo" id="trabajos-titulo" data-reveal="mascara"><span>Trabajos</span><sup class="trabajos__n" aria-hidden="true">[<span data-contador>${proyectos.length}</span>]</sup></h2>
      <div class="trabajos__ctrl">
${filtros}        <div class="vistas" role="group" aria-label="Cambiar vista">
          <button class="ctrl" type="button" data-vista="lista" aria-pressed="true">lista</button><span aria-hidden="true">|</span><button class="ctrl" type="button" data-vista="grilla" aria-pressed="false">grilla</button>
        </div>
      </div>
    </div>
    <p class="solo-lector" aria-live="polite" data-anuncio></p>
    <div class="obras__cols" aria-hidden="true"><span>n.º</span><span>proyecto</span><span>rubro</span><span>año</span><span>estado</span></div>
    <ol class="obras" data-obras data-vista="lista">
${obras}
    </ol>
    <div class="vista-previa" aria-hidden="true" data-previa></div>
  </section>

  <div class="cinta" aria-hidden="true"><div class="cinta__pista">${cinta}${cinta}</div></div>

  <section class="sobre" id="sobre-mi" aria-labelledby="sobre-titulo">
    <div class="rotulo"><h2 id="sobre-titulo">sobre mí</h2><span>(02)</span></div>
    <div class="sobre__texto">
      <p class="sobre__lead" data-reveal="lineas">${esc(sitio.sobreMi)}</p>
${sitio.linkedin || sitio.instagram ? `      <p class="sobre__redes">${[['instagram', sitio.instagram], ['linkedin', sitio.linkedin]].filter(([, u]) => u).map(([n, u]) => `<a href="${esc(u)}" ${externo}>${n} ${icono('diagonal')}</a>`).join('')}</p>\n` : ''}    </div>
  </section>

  <section class="testimonios" aria-labelledby="testimonios-titulo">
    <div class="rotulo"><h2 id="testimonios-titulo">testimonios</h2><span>(03)</span></div>
    <ol class="citas">
${citas}
    </ol>
  </section>

  <section class="contacto" id="contacto" aria-labelledby="contacto-titulo">
    <div class="rotulo"><span>contacto</span><span>(04)</span></div>
    <h2 class="contacto__titulo" id="contacto-titulo" data-reveal="mascara" style="--em:${anchoEm('¿Conversamos?').toFixed(3)}"><span class="degradado">¿Conversamos?</span></h2>
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
  if (v.e[0]) piezas.push(`    <figure class="gal gal--ancha" data-reveal="foto">${picture(v.e[0], { sizes: '(min-width: 1400px) 1320px, 94vw', alt: `Portada del sitio de ${nombre} en escritorio`, carga: 'eager' })}<figcaption>escritorio</figcaption></figure>`);
  if (v.m.length) piezas.push(`    <figure class="gal gal--moviles" data-reveal="foto"><div class="gal__moviles" style="--n:${v.m.length}">${v.m.map((m, k) => picture(m, { sizes: '(min-width: 900px) 24vw, 42vw', alt: `Vista ${k + 1} del sitio de ${nombre} en celular` })).join('')}</div><figcaption>celular</figcaption></figure>`);
  if (v.e.length > 1) piezas.push(`    <div class="gal gal--dos">${v.e.slice(1).map((e, k) => `<figure data-reveal="foto">${picture(e, { sizes: '(min-width: 900px) 46vw, 94vw', alt: `Sección ${k + 2} del sitio de ${nombre} en escritorio` })}</figure>`).join('')}</div>`);
  if (!piezas.length) piezas.push(`    <figure class="gal gal--ancha">${sinCaptura(p)}</figure>`);

  const cuerpo = `<main id="contenido" class="proyecto">
  <header class="proyecto__cab">
    <a class="volver" href="/#trabajos">${icono('izquierda')} trabajos</a>
    <p class="proyecto__idx">${num(i)} / ${num(proyectos.length - 1)}</p>
    <h1 class="proyecto__titulo" data-reveal="mascara" style="--em:${anchoEm(p.nombre).toFixed(3)};--em-max:${Math.max(...p.nombre.split(' ').map((w) => anchoEm(w))).toFixed(3)}"><span>${esc(p.nombre)}</span></h1>
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
    <a class="siguiente__link" href="/trabajos/${sig.slug}">
      <span class="siguiente__lbl">siguiente proyecto ${icono('derecha')}</span>
      <span class="siguiente__nombre" style="--em:${anchoEm(sig.nombre).toFixed(3)};--em-max:${Math.max(...sig.nombre.split(' ').map((w) => anchoEm(w))).toFixed(3)}"><span>${esc(sig.nombre)}</span></span>
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
