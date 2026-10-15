/* Fondo de la portada: degradado azul vivo detras de un vidrio acanalado, con
   estelas de luz. Se mueve solo y reacciona al cursor. WebGL sin librerias.
   En celular, con movimiento reducido o sin WebGL queda una imagen quieta
   (o el degradado CSS de respaldo). */
(() => {
  'use strict';
  const canvas = document.querySelector('[data-fondo]');
  if (!canvas) return;
  const html = document.documentElement;
  const quieto = html.classList.contains('estatico') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return;

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uRibs;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  // Vidrio acanalado: cada franja desvia lo que hay detras.
  float n = uv.x * uRibs;
  float rib = fract(n);
  float curva = rib - 0.5;
  vec2 q0 = uv + vec2(curva * 0.03, curva * 0.008);

  // Cursor: abulta el campo y lo ilumina.
  vec2 dm = (q0 - uMouse) * vec2(aspect, 1.0);
  float cerca = exp(-dot(dm, dm) * 3.5);

  vec2 p = vec2(q0.x * aspect, q0.y) * 0.95;
  p -= dm * 0.35 * cerca;

  // Flujo con deformacion de dominio.
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.045));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.035), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.03));
  float f = fbm(p + 2.6 * r);

  // Mas luz arriba a la derecha y en el cursor; mas oscuro abajo a la izquierda (texto).
  float luz = 0.5 + 0.38 * smoothstep(-0.1, 1.1, uv.x * 0.6 + uv.y * 0.7);
  float v = smoothstep(0.3, 0.85, f) * luz + cerca * 0.16;

  vec3 c0 = vec3(0.027, 0.075, 0.220);
  vec3 c1 = vec3(0.039, 0.122, 0.361);
  vec3 c2 = vec3(0.114, 0.267, 0.678);
  vec3 c3 = vec3(0.561, 0.690, 0.965);
  vec3 c4 = vec3(0.900, 0.935, 1.000);
  vec3 col = mix(c0, c1, smoothstep(0.0, 0.32, v));
  col = mix(col, c2, smoothstep(0.30, 0.62, v));
  col = mix(col, c3, smoothstep(0.68, 0.95, v) * 0.85);
  col = mix(col, c4, smoothstep(0.95, 1.1, v) * 0.5);

  // Estelas de luz que cruzan la imagen.
  float y1 = 0.66 + 0.05 * sin(q0.x * 2.4 + t * 0.32) + 0.025 * sin(q0.x * 7.0 - t * 0.5);
  float e1 = exp(-pow((uv.y - y1) * 26.0, 2.0)) * smoothstep(0.05, 0.55, q0.x) * (0.55 + 0.45 * sin(q0.x * 3.1 + t * 0.55));
  float y2 = 0.36 + 0.04 * sin(q0.x * 3.0 - t * 0.27);
  float e2 = exp(-pow((uv.y - y2) * 34.0, 2.0)) * smoothstep(0.35, 0.95, q0.x) * (0.5 + 0.5 * sin(q0.x * 4.0 - t * 0.4));
  col += vec3(0.72, 0.82, 1.0) * (e1 * 0.24 + e2 * 0.15);

  // Brillo del vidrio: un filo claro y una sombra suave por franja.
  col += vec3(0.85, 0.9, 1.0) * smoothstep(0.88, 1.0, rib) * 0.045;
  col *= 1.0 - smoothstep(0.12, 0.0, rib) * 0.06;

  // Grano fino para que el degradado no se escalone.
  col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}`;

  const compilar = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compilar(gl.VERTEX_SHADER, VERT);
  const fs = compilar(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // Un triangulo que cubre toda la pantalla.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uRibs = gl.getUniformLocation(prog, 'uRibs');

  // Se dibuja a menor resolucion: es un degradado suave y asi rinde en cualquier equipo.
  const ESCALA = 0.6;
  let ancho = 1;
  let alto = 1;
  const medir = () => {
    const r = canvas.getBoundingClientRect();
    const s = Math.min(window.devicePixelRatio || 1, 1.5) * ESCALA;
    ancho = Math.max(1, Math.round(r.width * s));
    alto = Math.max(1, Math.round(r.height * s));
    canvas.width = ancho;
    canvas.height = alto;
    gl.viewport(0, 0, ancho, alto);
    gl.uniform2f(uRes, ancho, alto);
    gl.uniform1f(uRibs, Math.max(6, Math.round(r.width / 84)));
  };

  // Cursor suavizado. Sin mouse, el punto de luz pasea solo.
  let mx = 0.68; let my = 0.6; let tx = mx; let ty = my;
  let ultimoMovimiento = -1e9;
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = 1 - (e.clientY - r.top) / r.height;
    ultimoMovimiento = performance.now();
  }, { passive: true });

  const t0 = performance.now();
  const dibujar = (ahora) => {
    const t = ((ahora - t0) / 1000) % 1000;
    if (ahora - ultimoMovimiento > 2500) {
      tx = 0.62 + 0.22 * Math.sin(t * 0.21);
      ty = 0.55 + 0.18 * Math.cos(t * 0.17);
    }
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;
    gl.uniform1f(uTime, t + 7.0);
    gl.uniform2f(uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  medir();
  if (quieto) {
    dibujar(t0 + 9000);
    canvas.classList.add('is-listo');
    addEventListener('resize', () => { medir(); dibujar(t0 + 9000); });
    return;
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  let tResize;
  addEventListener('resize', () => { clearTimeout(tResize); tResize = setTimeout(medir, 150); });
  const bucle = (ahora) => {
    if (visible && !document.hidden) dibujar(ahora);
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame((ahora) => { dibujar(ahora); canvas.classList.add('is-listo'); requestAnimationFrame(bucle); });
})();
