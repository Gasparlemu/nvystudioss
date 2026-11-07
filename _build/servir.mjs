// Servidor local para revisar el sitio como en Vercel (URLs limpias, 404 propio).
//
//   node _build/servir.mjs [puerto]     -> http://localhost:4173
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.argv[2] || 4173);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};

const esArchivo = (r) => existsSync(r) && statSync(r).isFile();

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Igual que trailingSlash:false en Vercel: /trabajos/oncosur/ -> /trabajos/oncosur
  if (ruta.length > 1 && ruta.endsWith('/')) {
    res.writeHead(308, { Location: ruta.slice(0, -1) });
    return res.end();
  }
  const base = normalize(join(RAIZ, ruta));
  if (!base.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  const candidato = [base, join(base, 'index.html')].find(esArchivo);
  const archivo = candidato || join(RAIZ, '404.html');
  if (!esArchivo(archivo)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }
  const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (rango && candidato) {
    const total = statSync(archivo).size;
    const inicio = rango[1] ? Number(rango[1]) : total - Number(rango[2]);
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
    res.writeHead(206, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${inicio}-${fin}/${total}`, 'Content-Length': fin - inicio + 1 });
    return createReadStream(archivo, { start: inicio, end: fin }).pipe(res);
  }
  res.writeHead(candidato ? 200 : 404, {
    'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(archivo).pipe(res);
}).listen(PUERTO, () => console.log(`Sitio en http://localhost:${PUERTO}`));
