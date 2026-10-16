// Genera el favicon y los iconos de la marca desde un solo dibujo en SVG:
// una "N" blanca sobre un cuadro de vidrio azul (del azul de la marca al marino).
//
//   node _build/iconos.mjs
//
// Requiere sharp: `npm i --no-save sharp` en la raiz (node_modules queda fuera de git).
// La N esta dibujada sobre una grilla de 16 px (unidades de 4 en el viewBox de 64),
// asi los trazos verticales caen en pixeles enteros y se ve nitida en la pestaña.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require(process.env.NVY_SHARP || 'sharp'); } catch {
  console.error('Falta sharp. Corre `npm i --no-save sharp` en la raiz del repo.');
  process.exit(1);
}
const MARCA = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'brand');

const N = 'M16 12h8v40h-8zM40 12h8v40h-8zM16 12h9.5L48 52h-9.5z';
// redondo: favicon y apps; cuadrado: iOS y Android ya le ponen sus propias esquinas.
const icono = ({ redondo = true, escalaN = 1 } = {}) => {
  const rx = redondo ? 14 : 0;
  const n = escalaN === 1 ? `<path fill="url(#n)" d="${N}"/>`
    : `<path fill="url(#n)" transform="translate(32 32) scale(${escalaN}) translate(-32 -32)" d="${N}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a55cc"/><stop offset=".55" stop-color="#11307f"/><stop offset="1" stop-color="#0a1f5c"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset=".28" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".16"/><stop offset=".56" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#c9d9fb"/></linearGradient>
</defs>
<rect width="64" height="64" rx="${rx}" fill="url(#f)"/>
<rect width="64" height="64" rx="${rx}" fill="url(#b)"/>
${redondo ? `<rect x=".75" y=".75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="#a9c3f8" stroke-opacity=".35" stroke-width="1.5"/>\n` : ''}${n}
</svg>
`;
};

const png = (svg, lado) => sharp(Buffer.from(svg), { density: Math.max(72, (72 * lado) / 64) * 4 })
  .resize(lado, lado).png({ compressionLevel: 9 }).toBuffer();

const redondo = icono();
writeFileSync(join(MARCA, 'favicon.svg'), redondo);
const salidas = [
  ['favicon-16.png', redondo, 16], ['favicon-32.png', redondo, 32], ['favicon-48.png', redondo, 48],
  ['icon-192.png', redondo, 192], ['icon-512.png', redondo, 512], ['logo-mark.png', redondo, 512],
  ['apple-touch-icon.png', icono({ redondo: false }), 180],
  // maskable: Android recorta en circulo; la N queda dentro de la zona segura (80 %).
  ['icon-512-maskable.png', icono({ redondo: false, escalaN: 0.78 }), 512],
];
const hechos = {};
for (const [nombre, svg, lado] of salidas) {
  hechos[nombre] = await png(svg, lado);
  writeFileSync(join(MARCA, nombre), hechos[nombre]);
}

// favicon.ico con los PNG de 16, 32 y 48 adentro (formato ICO con imagenes PNG).
const capas = [[16, hechos['favicon-16.png']], [32, hechos['favicon-32.png']], [48, hechos['favicon-48.png']]];
const cab = Buffer.alloc(6 + 16 * capas.length);
cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(capas.length, 4);
let pos = cab.length;
capas.forEach(([lado, buf], i) => {
  const o = 6 + i * 16;
  cab.writeUInt8(lado, o); cab.writeUInt8(lado, o + 1); cab.writeUInt8(0, o + 2); cab.writeUInt8(0, o + 3);
  cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6);
  cab.writeUInt32LE(buf.length, o + 8); cab.writeUInt32LE(pos, o + 12);
  pos += buf.length;
});
writeFileSync(join(MARCA, 'favicon.ico'), Buffer.concat([cab, ...capas.map(([, b]) => b)]));
console.log('Listo: favicon.svg, favicon.ico, PNG de 16 a 512 y logo-mark.');
