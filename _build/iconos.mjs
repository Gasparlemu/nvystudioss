// Genera el favicon y los iconos de la marca desde un solo dibujo en SVG:
// el logo NVY · STUDIOS (assets/brand/logo-nvy.png, blanco) sobre un cuadro negro.
//
//   node _build/iconos.mjs
//
// Requiere sharp: `npm i --no-save sharp` en la raiz (node_modules queda fuera de git).
// El logo va incrustado en el SVG, asi favicon.svg no depende de otro archivo.
import { readFileSync, writeFileSync } from 'node:fs';
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

const LOGO = `data:image/png;base64,${readFileSync(join(MARCA, 'logo-nvy.png')).toString('base64')}`;
// El logo mide 540 x 195: a escala 1 ocupa 54 de los 64 de ancho, centrado.
// redondo: favicon y apps; cuadrado: iOS y Android ya le ponen sus propias esquinas.
const icono = ({ redondo = true, escala = 1 } = {}) => {
  const w = 54 * escala, h = w * 195 / 540;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="${redondo ? 14 : 0}" fill="#000"/>
<image href="${LOGO}" x="${(64 - w) / 2}" y="${(64 - h) / 2}" width="${w}" height="${h}"/>
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
  // maskable: Android recorta en circulo; el logo queda dentro de la zona segura (80 %).
  ['icon-512-maskable.png', icono({ redondo: false, escala: 0.74 }), 512],
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
