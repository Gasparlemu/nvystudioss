// Maqueta de opciones del inicio: toma el index.html generado y le suma portadas
// alternativas, estilos y un panel para cambiar entre ellas.
//   node _build/build.mjs && node maqueta-borrador/opciones/generar.mjs
//   -> http://localhost:4173/maqueta-borrador/opciones
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
let html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

const seccion = html.match(/<section class="pregunta"[\s\S]*?<\/section>/)[0];
const h1 = seccion.match(/<h1[\s\S]*?<\/h1>/)[0];
const pie = seccion.match(/<div class="pregunta__pie">[\s\S]*?<\/div>\s*<\/div>/)[0];

const titulo = (n) => h1.replace('id="pregunta-titulo"', `id="pregunta-titulo-${n}"`);
const hero = (n, dentro) => `<section class="pregunta hero hero--${n}" data-hero-v="${n}" aria-labelledby="pregunta-titulo-${n}">${dentro}</section>`;
const txt = (n) => `<div class="hero__txt">${titulo(n)}${pie}</div>`;

// Capturas con fotos reales (gente, peliculas, el local) sacadas para la portada.
const ELEGIDAS = { 'ainilebu-films': [0, 3, 4, 5, 6], 'zona-estetica': [0, 1, 2], oncosur: [0, 3], 'inka-trewa': [0, 1, 5], 'i-max': [2, 3, 5, 6], 'metales-nobles': [0, 5, 6], 'andrade-visions': [0, 3], 'gestion-sur': [0] };
// intercaladas para que no queden dos del mismo sitio juntas
const FOTOS = [];
for (let i = 0; i < 5; i++) for (const [s, ns] of Object.entries(ELEGIDAS)) if (ns[i] !== undefined) FOTOS.push(`/maqueta-borrador/opciones/fotos/${s}-${ns[i]}.webp`);
// Cada columna lleva sus fotos dos veces seguidas: la cinta sube media columna y
// vuelve al inicio sin que se note el salto. --i ordena la entrada de la opcion 7e.
const muro = (cols, filas, desde = 0) => `<div class="muro" aria-hidden="true">${Array.from({ length: cols }, (_, c) => {
  const fotos = Array.from({ length: filas }, (_, f) => FOTOS[(desde + c * filas + f * 3 + c) % FOTOS.length]);
  return `<div class="muro__col" style="--c:${c}">${[...fotos, ...fotos].map((src, f) => `<div class="shot" style="--i:${c + f}"><img src="${src}" alt="" decoding="async"></div>`).join('')}</div>`;
}).join('')}</div>`;

const MUROS = [['7b', '7b cinta que no para'], ['7c', '7c se endereza al bajar'], ['7d', '7d sigue al mouse'], ['7e', '7e se arma al entrar']];
const portadas = hero(7, `${muro(7, 6, 2)}${txt(7)}`);

html = html.replace(seccion, portadas);

// Problemas: cada tarjeta lleva la ultima imagen de su panel (para las opciones con foto)
const DEMOS = ['niebla-cafeteria', 'fit-valdivia', 'clinica-salud', 'trattoria-fiume', 'smash', 'cafe-lluvia', 'alerce'];
// en las de carta va la portada de cada carta y no la ultima vista del panel
const carta = (s, v = 'm1') => `/assets/img/trabajos/${s}/${v}-780.webp`;
const CAMBIOS = { 5: '/assets/img/trabajos/i-max/m1-780.webp', 6: '/assets/img/trabajos/inka-trewa/e1-1600.webp', 7: carta('trattoria-fiume'), 8: carta('smash'), 9: carta('cafe-lluvia'), 10: carta('alerce') };
{
  const ini = html.indexOf('<section class="problemas"');
  const fin = html.indexOf('</section>', ini);
  const partes = html.slice(ini, fin).split('<article class="prob"');
  const nuevas = partes.map((p, i) => {
    if (!i) return p;
    const srcs = [...p.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    if (!srcs.length) return p;
    const src = CAMBIOS[i] || srcs[srcs.length - 1];
    const movil = /[/-]m\d[-.]/.test(src) ? ' prob__foto--movil' : '';
    const demo = DEMOS.some((d) => src.includes(`/${d}/`)) ? '<span class="prob__demo">demo</span>' : '';
    return p.replace('</article>', `  <span class="prob__foto${movil}" aria-hidden="true"><img src="${src}" alt="" loading="lazy" decoding="async">${demo}</span>\n      </article>`);
  });
  html = html.slice(0, ini) + nuevas.join('<article class="prob"') + html.slice(fin);
}

// Proceso: una guia de como se usa
html = html.replace(/(<h2 class="titulo-seccion" id="proceso-titulo"[\s\S]*?<\/h2>)/, `$1
    <p class="proceso__guia"><span class="g-mouse">Pasa el mouse por cada paso.</span><span class="g-toque">Toca cada paso para verlo.</span></p>`);

// Tarjeta azul junto a las preguntas (solo en la opcion 2 de preguntas)
const wa = html.match(/href="(https:\/\/wa\.me\/[^"]*conversar[^"]*)"/)[1];
// Preguntas: visor de respuesta (opcion 5) y cabecera y pie de chat (opcion 6)
html = html.replace(/(<\/details>)(\s*<\/div>\s*<\/section>\s*<section class="contacto")/, `$1
      <a class="chat__escribe" href="${wa}" target="_blank" rel="noopener noreferrer"><span>Escribe tu pregunta por WhatsApp</span><span class="chat__enviar" aria-hidden="true">↑</span></a>$2`);
html = html.replace(/(<div class="faq__lista">)/, `$1
      <div class="chat__cab"><span class="chat__avatar"><img src="/assets/brand/logo-nvy.png" alt=""></span><span><b>NVY Studios</b><small>preguntas frecuentes</small></span></div>`);
html = html.replace(/(<\/div>\s*<\/section>\s*<section class="contacto")/, `</div>
    <div class="faq__visor" aria-live="polite"><p class="faq__visor-q"></p><p class="faq__visor-r"></p><a class="boton" href="${wa}" target="_blank" rel="noopener noreferrer">preguntar otra cosa</a></div>
  </section>

  <section class="contacto"`);
html = html.replace('<div class="faq__lista">', `<aside class="faq__aside">
      <p class="faq__aside-t">¿Te quedó otra duda?</p>
      <p class="faq__aside-p">Escríbeme por WhatsApp y te respondo.</p>
      <a class="boton" href="${wa}" target="_blank" rel="noopener noreferrer">escribir por whatsapp</a>
    </aside>
    <div class="faq__lista">`);

const panel = `<div class="op" data-op>
  <button class="op__abre" type="button" data-op-abre>opciones</button>
  <div class="op__cuerpo" data-lenis-prevent>
    ${[
      ['hero', 'Portada (muro)', MUROS],
      ['tit', 'Título al centro (versiones de la 9)', [['centro', '9 como la viste'], ['centro-a', '9a serif editorial, sombra suave'], ['centro-b', '9b gruesa azul, sombra azul marino'], ['centro-c', '9c serif redonda, tinte parejo'], ['centro-d', '9d angosta, franja a lo ancho'], ['centro-e', '9e mezcla con cursiva, sombra en las letras']]],
      ['tit', 'Título de la portada (otras)', [['mixto', '8 actual: azul sobre sombra oscura'], ['arriba', '10 arriba, blanco'], ['bloque', '11 en un bloque azul'], ['etiquetas', '12 palabras en recortes blancos'], ['sombra-azul', '13 blanco con sombra azul'], ['contorno', '14 letras huecas'], ['gigante', '15 gigante, blanco a celeste'], ['marino-brillo', '16 marino con luz en las letras'], ['derecha', '17 a la derecha'], ['neon', '18 blanco con brillo azul'], ['recorre', '19 destello que recorre'], ['clave', '20 blanco con "en persona?" azul']]],
      ['prob', 'Problemas (mosaico)', [['7b', '7b foto asomando'], ['7c', '7c foto de fondo']]],
      ['proc', 'Proceso', [['3', '3 panel azul (elegida)']]],
      ['faq', 'Preguntas', [['5', '5 pregunta y respuesta (elegida)']]],
    ].map(([k, t, ops]) => `<div class="op__g"><span>${t}</span><div>${ops.map(([v, o]) => `<button type="button" data-k="${k}" data-v="${v}">${o}</button>`).join('')}</div></div>`).join('\n    ')}
  </div>
</div>`;

html = html
  .replace('<meta name="robots" content="index, follow, max-image-preview:large">', '<meta name="robots" content="noindex">')
  .replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,700&family=Fraunces:opsz,wght@9..144,600&family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@1,500&display=swap">\n<link rel="stylesheet" href="/maqueta-borrador/opciones/opciones.css">\n<script src="/maqueta-borrador/opciones/opciones.js"></script>\n</head>')
  .replace('</body>', `${panel}\n</body>`);

writeFileSync(join(AQUI, 'index.html'), html);
console.log('maqueta lista: http://localhost:4173/maqueta-borrador/opciones');
