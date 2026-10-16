/* Fondo de la portada: azul animado con efecto de vidrio. Se mueve solo y
   reacciona al cursor. WebGL sin librerias.
   Hay varias versiones para elegir: con ?fondo en la direccion aparece un
   selector (ej. /?fondo=liquido). Sin eso se usa la primera.
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

  const COMUN = `
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
// Azul marino -> azul -> celeste -> casi blanco (los colores de la marca).
vec3 paleta(float v) {
  vec3 col = mix(vec3(0.027, 0.075, 0.220), vec3(0.039, 0.122, 0.361), smoothstep(0.0, 0.32, v));
  col = mix(col, vec3(0.114, 0.267, 0.678), smoothstep(0.30, 0.62, v));
  col = mix(col, vec3(0.561, 0.690, 0.965), smoothstep(0.68, 0.95, v) * 0.85);
  return mix(col, vec3(0.900, 0.935, 1.000), smoothstep(0.95, 1.1, v) * 0.5);
}
// Fondo base: mas oscuro abajo a la izquierda, donde va el texto.
vec3 base(vec2 uv) {
  return mix(vec3(0.016, 0.040, 0.125), vec3(0.045, 0.130, 0.400), smoothstep(-0.2, 1.2, uv.x * 0.45 + uv.y * 0.8));
}
vec3 terminar(vec3 col, vec2 uv, float t) {
  col *= mix(0.8, 1.0, smoothstep(1.2, 0.35, length((uv - vec2(0.55, 0.55)) * vec2(1.0, 1.15))));
  return col + (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.022;
}
`;

  const VERSIONES = [
    ['flujo', 'Flujo', `
// Azul que fluye detras de un vidrio acanalado, con estelas de luz.
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  float rib = fract(uv.x * uRibs);
  float curva = rib - 0.5;
  vec2 q0 = uv + vec2(curva * 0.03, curva * 0.008);
  vec2 dm = (q0 - uMouse) * vec2(aspect, 1.0);
  float cerca = exp(-dot(dm, dm) * 3.5);
  vec2 p = vec2(q0.x * aspect, q0.y) * 0.95;
  p -= dm * 0.35 * cerca;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.09)), fbm(p + vec2(5.2, 1.3) - t * 0.08));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.065), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.055));
  float f = fbm(p + 2.6 * r);
  float luz = 0.5 + 0.38 * smoothstep(-0.1, 1.1, uv.x * 0.6 + uv.y * 0.7 + 0.12 * sin(t * 0.23));
  vec3 col = paleta(smoothstep(0.3, 0.85, f) * luz + cerca * 0.16);
  float y1 = 0.66 + 0.06 * sin(q0.x * 2.4 + t * 0.5) + 0.025 * sin(q0.x * 7.0 - t * 0.8);
  float e1 = exp(-pow((uv.y - y1) * 26.0, 2.0)) * smoothstep(0.05, 0.55, q0.x) * (0.55 + 0.45 * sin(q0.x * 3.1 + t * 0.9));
  float y2 = 0.36 + 0.05 * sin(q0.x * 3.0 - t * 0.45);
  float e2 = exp(-pow((uv.y - y2) * 34.0, 2.0)) * smoothstep(0.35, 0.95, q0.x) * (0.5 + 0.5 * sin(q0.x * 4.0 - t * 0.65));
  col += vec3(0.72, 0.82, 1.0) * (e1 * 0.26 + e2 * 0.17);
  col += vec3(0.85, 0.9, 1.0) * smoothstep(0.88, 1.0, rib) * 0.045;
  col *= 1.0 - smoothstep(0.12, 0.0, rib) * 0.06;
  gl_FragColor = vec4(col + (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.022, 1.0);
}`],
    ['acanalado', 'Vidrio acanalado', `
// Luces que pasean detras de un vidrio acanalado: cada franja es una lente que
// muestra un tramo mas ancho y dado vuelta de lo que hay detras.
vec3 luces(vec2 p, float t) {
  float a = uRes.x / uRes.y;
  vec2 q = vec2(p.x * a, p.y);
  vec3 col = base(p);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(a * (0.55 + 0.42 * sin(t * (0.16 + fi * 0.027) + fi * 1.9)),
                  0.52 + 0.40 * sin(t * (0.12 + fi * 0.021) + fi * 2.7 + 1.1));
    float r = 0.17 + 0.09 * fract(fi * 0.618 + 0.3);
    vec2 d = q - c;
    vec3 tinte = mix(vec3(0.165, 0.333, 0.800), vec3(0.663, 0.765, 0.973), fract(fi * 0.618));
    col += tinte * exp(-dot(d, d) / (r * r)) * 0.62;
  }
  vec2 dm = q - vec2(uMouse.x * a, uMouse.y);
  col += vec3(0.70, 0.80, 1.0) * exp(-dot(dm, dm) / 0.02) * 0.55;
  return col;
}
void main() {
  float t = uTime;
  float n = vUv.x * uRibs * 1.6;
  float rib = fract(n);
  float x = (floor(n) + 0.5 - (rib - 0.5) * 2.2) / (uRibs * 1.6);
  vec3 col = mix(luces(vec2(x, vUv.y), t), luces(vUv, t), 0.22);
  col += vec3(0.55, 0.70, 1.0) * smoothstep(0.78, 1.0, rib) * 0.07;
  col *= 1.0 - (1.0 - smoothstep(0.0, 0.22, rib)) * 0.24;
  col = col / (1.0 + col * 0.45) * 1.3;
  gl_FragColor = vec4(terminar(col, vUv, t), 1.0);
}`],
    ['liquido', 'Vidrio líquido', `
// Gotas de vidrio que flotan y se funden entre si; el cursor arrastra una.
vec3 detras(vec2 q, float t, float a) {
  vec3 col = base(vec2(q.x / a, q.y));
  float b = sin((q.x * 0.7 + q.y * 1.3) * 4.0 - t * 0.5) * 0.5 + 0.5;
  col += vec3(0.20, 0.36, 0.85) * pow(b, 8.0) * 0.32;
  col += vec3(0.10, 0.20, 0.55) * fbm(q * 1.5 + t * 0.04) * 0.35;
  return col;
}
void main() {
  float a = uRes.x / uRes.y;
  float t = uTime;
  vec2 q = vec2(vUv.x * a, vUv.y);
  float F = 0.0;
  vec2 G = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = i == 5 ? vec2(uMouse.x * a, uMouse.y)
      : vec2(a * (0.52 + 0.40 * sin(t * (0.12 + fi * 0.025) + fi * 2.1)), 0.5 + 0.36 * sin(t * (0.095 + fi * 0.021) + fi * 1.3 + 0.7));
    float r = i == 5 ? 0.08 : 0.12 + 0.07 * fract(fi * 0.618 + 0.2);
    vec2 d = q - c;
    float dd = dot(d, d) + 0.0004;
    F += r * r / dd;
    G += -2.0 * r * r * d / (dd * dd);
  }
  float dentro = smoothstep(0.92, 1.08, F);
  vec2 nxy = -G / (F * F) * 0.09;
  float l = length(nxy);
  if (l > 0.95) nxy *= 0.95 / l;
  vec3 nrm = vec3(nxy, sqrt(1.0 - dot(nxy, nxy)));
  vec3 vidrio = detras(q - nxy * 0.2, t, a) * 1.3 + vec3(0.02, 0.04, 0.10);
  vidrio += vec3(0.55, 0.70, 1.0) * pow(1.0 - nrm.z, 2.5) * 0.6;
  vec3 h = normalize(normalize(vec3(-0.45, 0.55, 0.70)) + vec3(0.0, 0.0, 1.0));
  float luz = max(dot(nrm, h), 0.0);
  vidrio += vec3(0.85, 0.92, 1.0) * pow(luz, 24.0) * 0.32 + vec3(1.0) * pow(luz, 220.0) * 0.45;
  vidrio += vec3(0.70, 0.82, 1.0) * smoothstep(0.92, 1.0, F) * (1.0 - smoothstep(1.0, 1.35, F)) * 0.3;
  vec3 col = mix(detras(q, t, a), vidrio, dentro);
  col += vec3(0.35, 0.5, 0.95) * smoothstep(0.45, 0.95, F) * (1.0 - dentro) * 0.10;
  gl_FragColor = vec4(terminar(col, vUv, t), 1.0);
}`],
    ['causticas', 'Cáusticas', `
// Luz que atraviesa agua: una red de brillos que ondula sin parar.
void main() {
  float a = uRes.x / uRes.y;
  float t = uTime * 0.45 + 23.0;
  vec2 uv = vUv;
  vec2 q = vec2(uv.x * a, uv.y);
  vec2 dm = q - vec2(uMouse.x * a, uMouse.y);
  float cerca = exp(-dot(dm, dm) * 6.0);
  vec2 p = q * 4.2 + dm * cerca * 0.6 - 250.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c = 1.17 - pow(c / 5.0, 1.4);
  float red = pow(abs(c), 8.0);
  float mascara = 0.35 + 0.65 * smoothstep(0.0, 1.0, uv.x * 0.5 + uv.y * 0.6);
  vec3 col = base(uv);
  col += vec3(0.40, 0.58, 1.0) * red * 0.55 * mascara + vec3(0.8, 0.88, 1.0) * red * red * 0.25 * mascara;
  col += vec3(0.35, 0.5, 0.95) * cerca * 0.16 + vec3(0.8, 0.9, 1.0) * red * cerca * 0.3;
  float rayos = fbm(vec2(uv.x * 6.0 + uv.y * 1.5, t * 0.15));
  col += vec3(0.25, 0.4, 0.9) * pow(rayos, 3.0) * smoothstep(0.2, 1.0, uv.y) * 0.25;
  gl_FragColor = vec4(terminar(col, uv, t), 1.0);
}`],
    ['seda', 'Seda', `
// Tela satinada azul con pliegues que se mueven; el cursor la levanta.
float pliegue(vec2 p, float t) {
  float h = sin(p.x * 0.9 + p.y * 0.55 + t * 0.32) * 0.9;
  h += sin(p.x * -0.55 + p.y * 1.25 - t * 0.26 + 1.3) * 0.55;
  h += sin(p.x * 1.7 - p.y * 0.9 + t * 0.21 + 4.0) * 0.25;
  return h + sin(p.x * 3.1 + p.y * 2.3 - t * 0.35) * 0.05;
}
float alto(vec2 p, vec2 m, float t) { return pliegue(p, t) + 0.45 * exp(-dot(p - m, p - m) * 1.2); }
void main() {
  float a = uRes.x / uRes.y;
  float t = uTime;
  vec2 p = vec2(vUv.x * a, vUv.y) * 3.4;
  vec2 m = vec2(uMouse.x * a, uMouse.y) * 3.4;
  float e = 0.02;
  float hx = alto(p + vec2(e, 0.0), m, t) - alto(p - vec2(e, 0.0), m, t);
  float hy = alto(p + vec2(0.0, e), m, t) - alto(p - vec2(0.0, e), m, t);
  vec3 n = normalize(vec3(-hx / (2.0 * e) * 1.1, -hy / (2.0 * e) * 1.1, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.5, 0.75));
  float dif = max(dot(n, L), 0.0);
  float s = max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0);
  vec3 col = mix(vec3(0.012, 0.032, 0.105), vec3(0.100, 0.250, 0.700), pow(dif, 2.2));
  col += vec3(0.40, 0.56, 0.98) * pow(s, 10.0) * 0.55 + vec3(0.92, 0.95, 1.0) * pow(s, 60.0) * 0.45;
  col *= 0.75 + 0.35 * smoothstep(-0.2, 1.2, vUv.x * 0.5 + vUv.y * 0.6);
  gl_FragColor = vec4(terminar(col, vUv, t), 1.0);
}`],
  ];

  const compilar = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compilar(gl.VERTEX_SHADER, VERT);
  if (!vs) return;
  const programas = {};
  const crear = (nombre) => {
    const fs = compilar(gl.FRAGMENT_SHADER, COMUN + VERSIONES.find(([n]) => n === nombre)[2]);
    if (!fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    const u = (k) => gl.getUniformLocation(prog, k);
    return { prog, uRes: u('uRes'), uTime: u('uTime'), uMouse: u('uMouse'), uRibs: u('uRibs') };
  };

  // Un triangulo que cubre toda la pantalla.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Se dibuja a menor resolucion: es un degradado suave y asi rinde en cualquier equipo.
  const ESCALA = 0.6;
  let ancho = 1;
  let alto = 1;
  let franjas = 6;
  let pr = null;
  const subirTamano = () => {
    gl.uniform2f(pr.uRes, ancho, alto);
    gl.uniform1f(pr.uRibs, franjas);
  };
  const medir = () => {
    const r = canvas.getBoundingClientRect();
    const s = Math.min(window.devicePixelRatio || 1, 1.5) * ESCALA;
    ancho = Math.max(1, Math.round(r.width * s));
    alto = Math.max(1, Math.round(r.height * s));
    franjas = Math.max(6, Math.round(r.width / 84));
    canvas.width = ancho;
    canvas.height = alto;
    gl.viewport(0, 0, ancho, alto);
    if (pr) subirTamano();
  };
  const usar = (nombre) => {
    if (!(nombre in programas)) programas[nombre] = crear(nombre);
    if (!programas[nombre]) return false;
    pr = programas[nombre];
    gl.useProgram(pr.prog);
    subirTamano();
    return true;
  };

  // Version elegida: ?fondo=nombre o ?fondo=numero. Sin parametro, la primera.
  const pedido = new URLSearchParams(location.search).get('fondo');
  const porNumero = VERSIONES[Number(pedido) - 1];
  let elegida = porNumero ? porNumero[0] : (VERSIONES.find(([n]) => n === pedido) || VERSIONES[0])[0];

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
    gl.uniform1f(pr.uTime, t + 7.0);
    gl.uniform2f(pr.uMouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  medir();
  if (!usar(elegida) && !usar((elegida = VERSIONES[0][0]))) return;

  // Selector para comparar versiones (solo con ?fondo en la direccion).
  if (pedido !== null) {
    const barra = document.createElement('div');
    barra.setAttribute('style', 'position:absolute;top:96px;left:50%;transform:translateX(-50%);z-index:5;display:flex;flex-wrap:wrap;justify-content:center;gap:4px;padding:5px;border-radius:999px;background:rgba(5,15,46,.55);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-size:13px;max-width:calc(100% - 40px)');
    const pintar = () => [...barra.children].forEach((b) => {
      const activo = b.dataset.v === elegida;
      b.style.cssText = `padding:7px 14px;border-radius:999px;color:${activo ? '#0a1f5c' : '#fff'};background:${activo ? '#fff' : 'transparent'};font-weight:500`;
    });
    VERSIONES.forEach(([n, txt], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.v = n;
      b.textContent = `${i + 1}. ${txt}`;
      b.addEventListener('click', () => {
        if (!usar(n)) return;
        elegida = n;
        history.replaceState(null, '', `?fondo=${n}`);
        pintar();
        if (quieto) dibujar(t0 + 9000);
      });
      barra.appendChild(b);
    });
    pintar();
    canvas.parentElement.appendChild(barra);
  }

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
