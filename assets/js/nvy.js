/* NVY Studios — interacciones del portafolio. Sin dependencias salvo Lenis. */
(() => {
  'use strict';
  window.NVY = true;

  const d = document;
  const html = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puntero = matchMedia('(hover: hover) and (pointer: fine)');
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- scroll suave ---------- */
  let lenis = null;
  if (!reducido && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const irA = (destino) => {
    if (lenis) lenis.scrollTo(destino, { duration: 1.4 });
    else window.scrollTo({ top: typeof destino === 'number' ? destino : destino.getBoundingClientRect().top + scrollY, behavior: reducido ? 'auto' : 'smooth' });
  };

  /* ---------- reloj de Valdivia ---------- */
  const reloj = $('[data-reloj]');
  if (reloj && window.Intl) {
    const hora = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    let zona = null;
    try { zona = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', timeZoneName: 'shortOffset' }); } catch (e) { /* navegador viejo: solo la hora */ }
    reloj.title = 'Hora en Valdivia';
    const pintar = () => {
      const ahora = new Date();
      const gmt = zona ? (zona.formatToParts(ahora).find((p) => p.type === 'timeZoneName') || {}).value : '';
      reloj.textContent = gmt ? `${hora.format(ahora)} (${gmt})` : hora.format(ahora);
      reloj.dateTime = ahora.toISOString();
      setTimeout(pintar, 60000 - (Date.now() % 60000) + 30);
    };
    pintar();
  }

  /* ---------- header: se esconde al bajar y vuelve al subir ---------- */
  const cab = $('[data-cab]');
  let ultimoY = scrollY;
  let pendiente = false;
  const alScroll = () => {
    pendiente = false;
    const y = Math.max(0, scrollY);
    if (!html.classList.contains('menu-abierto')) {
      cab.classList.toggle('is-solida', y > 24);
      if (y > ultimoY + 4 && y > 240) cab.classList.add('is-oculta');
      else if (y < ultimoY - 4 || y < 240) cab.classList.remove('is-oculta');
    }
    ultimoY = y;
  };
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alScroll); } }, { passive: true });
  alScroll();

  /* ---------- menu a pantalla completa ---------- */
  const menu = $('[data-menu]');
  const boton = $('[data-menu-boton]');
  const botonTxt = $('[data-menu-txt]');
  const abierto = () => menu.classList.contains('is-abierto');
  const abrir = () => {
    menu.inert = false;
    menu.classList.add('is-abierto');
    html.classList.add('menu-abierto');
    cab.classList.remove('is-oculta');
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    botonTxt.textContent = 'cerrar';
    if (lenis) lenis.stop(); else html.style.overflow = 'hidden';
    setTimeout(() => { const primero = $('.menu__link', menu); if (primero) primero.focus({ preventScroll: true }); }, 60);
  };
  const cerrar = (devolverFoco = true) => {
    menu.classList.remove('is-abierto');
    html.classList.remove('menu-abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.removeAttribute('aria-label');
    botonTxt.textContent = 'menu';
    menu.inert = true;
    if (lenis) lenis.start(); else html.style.overflow = '';
    if (devolverFoco) boton.focus({ preventScroll: true });
  };
  boton.addEventListener('click', () => (abierto() ? cerrar() : abrir()));
  d.addEventListener('keydown', (e) => {
    if (!abierto()) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    // Foco atrapado entre el boton del header y los links del menu.
    const focos = [boton, ...$$('a[href]', menu)];
    const i = focos.indexOf(d.activeElement);
    e.preventDefault();
    focos[(i + (e.shiftKey ? -1 : 1) + focos.length) % focos.length].focus();
  });

  /* ---------- anclas de la misma pagina con scroll suave ---------- */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const destino = url.hash === '#top' ? 0 : $(url.hash);
    if (destino === null) return;
    e.preventDefault();
    if (abierto()) {
      cerrar(false);
      setTimeout(() => irA(destino), reducido ? 0 : 420);
    } else {
      irA(destino);
    }
  });

  /* ---------- textos que suben linea por linea ---------- */
  const partir = (el) => {
    const bloque = $('p', el) || el;
    if (!el.dataset.texto) el.dataset.texto = bloque.textContent.trim();
    const palabras = el.dataset.texto.split(/\s+/);
    bloque.innerHTML = palabras.map((p) => `<span class="pal">${esc(p)}</span>`).join(' ');
    const lineas = [];
    let arriba = null;
    for (const s of $$('.pal', bloque)) {
      if (s.offsetTop !== arriba) { lineas.push([]); arriba = s.offsetTop; }
      lineas[lineas.length - 1].push(s.textContent);
    }
    bloque.innerHTML = lineas.map((l, i) => `<span class="linea" style="--l:${i}"><span>${esc(l.join(' '))}</span></span>`).join('');
    el.classList.add('is-partido');
  };
  const parrafos = $$('[data-reveal="lineas"]');
  const listasFuentes = d.fonts ? d.fonts.ready : Promise.resolve();
  listasFuentes.then(() => parrafos.forEach(partir));
  let anchoAntes = innerWidth;
  let tResize;
  addEventListener('resize', () => {
    clearTimeout(tResize);
    tResize = setTimeout(() => {
      if (innerWidth === anchoAntes) return;
      anchoAntes = innerWidth;
      parrafos.forEach(partir);
    }, 180);
  });

  /* ---------- arranque: despues de la cortina (si la hay) ---------- */
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  let arrancado = false;
  const arrancar = () => {
    if (arrancado) return;
    arrancado = true;
    html.classList.add('is-listo');
    listasFuentes.then(() => $$('[data-reveal]').forEach((el) => io.observe(el)));
  };
  const transicion = () => new Promise((res) => {
    if (!('onpagereveal' in window)) return res(null);
    if (window.__nvyVT !== undefined) return res(window.__nvyVT);
    addEventListener('pagereveal', (e) => res(e.viewTransition || null), { once: true });
    setTimeout(() => res(null), 1500);
  });
  const cuandoActiva = (fn) => {
    if (d.prerendering) d.addEventListener('prerenderingchange', fn, { once: true });
    else fn();
  };
  cuandoActiva(() => {
    transicion().then((vt) => {
      if (!vt || reducido) return arrancar();
      vt.ready.then(() => setTimeout(arrancar, 520), arrancar);
    });
  });

  // Al volver con el boton atras (bfcache) la pagina puede quedar con el menu abierto.
  addEventListener('pageshow', (e) => { if (e.persisted && abierto()) cerrar(false); });

  /* ---------- trabajos: filtros, vista, captura flotante y filas tactiles ---------- */
  const obras = $('[data-obras]');
  if (!obras) return;
  const seccion = obras.closest('.trabajos');
  const items = $$('.obra', obras);
  const contador = $('[data-contador]');
  const anuncio = $('[data-anuncio]');
  let ocultarPrevia = () => {};

  const cambiar = (aplicar) => {
    ocultarPrevia();
    obras.classList.add('is-cambiando');
    setTimeout(() => {
      aplicar();
      let k = 0;
      for (const li of items) {
        li.classList.remove('is-entra', 'is-abierta');
        if (li.hidden) continue;
        li.style.setProperty('--k', k++);
        void li.offsetWidth;
        li.classList.add('is-entra');
      }
      obras.classList.remove('is-cambiando');
      if (lenis) lenis.resize();
    }, reducido ? 0 : 230);
  };

  for (const b of $$('[data-filtro]')) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      $$('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const filtro = b.dataset.filtro;
      cambiar(() => {
        let n = 0;
        for (const li of items) {
          li.hidden = !(filtro === 'todos' || li.dataset.estado === filtro);
          if (!li.hidden) n++;
        }
        contador.textContent = n;
        contador.classList.remove('is-cambia');
        void contador.offsetWidth;
        contador.classList.add('is-cambia');
        anuncio.textContent = `${n} ${n === 1 ? 'proyecto' : 'proyectos'}`;
      });
    });
  }

  for (const b of $$('button[data-vista]')) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      $$('button[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cambiar(() => {
        obras.dataset.vista = b.dataset.vista;
        seccion.dataset.vista = b.dataset.vista;
        anuncio.textContent = `vista ${b.dataset.vista}`;
      });
    });
  }

  // Tactil + lista: el primer toque abre la captura dentro de la fila, el segundo entra.
  const linkDe = (li) => $('.obra__link', li);
  const tactil = () => !puntero.matches;
  if (tactil()) items.forEach((li) => linkDe(li).setAttribute('aria-expanded', 'false'));
  obras.addEventListener('click', (e) => {
    const link = e.target.closest('.obra__link');
    if (!link || !tactil() || obras.dataset.vista !== 'lista') return;
    const li = link.closest('.obra');
    if (li.classList.contains('is-abierta')) return;
    e.preventDefault();
    for (const otro of items) {
      if (otro !== li && otro.classList.contains('is-abierta')) {
        otro.classList.remove('is-abierta');
        linkDe(otro).setAttribute('aria-expanded', 'false');
      }
    }
    li.classList.add('is-abierta');
    link.setAttribute('aria-expanded', 'true');
    if (lenis) setTimeout(() => lenis.resize(), 650);
  });

  // Escritorio + lista: la captura flota y sigue al mouse con retraso suave.
  const previa = $('[data-previa]');
  if (!previa || reducido) return;
  const caja = d.createElement('div');
  caja.className = 'vista-previa__in';
  previa.appendChild(caja);
  const fotos = new Map();
  const foto = (base) => {
    if (!fotos.has(base)) {
      const p = d.createElement('picture');
      // La captura flotante mide como maximo 400 px: la de 800 alcanza para retina.
      p.innerHTML = `<source type="image/avif" srcset="${base}-800.avif">`
        + `<img src="${base}-800.webp" alt="" decoding="async">`;
      caja.appendChild(p);
      fotos.set(base, p);
    }
    return fotos.get(base);
  };
  let x = 0; let y = 0; let tx = 0; let ty = 0; let cx = 0; let cy = 0;
  let activa = false;
  let raf = 0;
  const mover = () => {
    x += (tx - x) * 0.13;
    y += (ty - y) * 0.13;
    previa.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    raf = (activa || Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) ? requestAnimationFrame(mover) : 0;
  };
  const mostrar = (base) => {
    const p = foto(base);
    fotos.forEach((f) => f.classList.toggle('is-actual', f === p));
    if (!activa) {
      activa = true;
      x = tx; y = ty;
      previa.classList.add('is-activa');
      if (!raf) raf = requestAnimationFrame(mover);
    }
  };
  ocultarPrevia = () => { activa = false; previa.classList.remove('is-activa'); };
  const filaBajo = (px, py) => {
    const el = d.elementFromPoint(px, py);
    const li = el && el.closest ? el.closest('.obra') : null;
    return li && obras.contains(li) ? li : null;
  };
  const apuntar = (px, py) => {
    cx = px; cy = py;
    tx = Math.min(px, innerWidth - caja.offsetWidth - 48);
    ty = py;
  };

  obras.addEventListener('pointerenter', () => {
    if (puntero.matches) items.forEach((li) => li.dataset.preview && foto(li.dataset.preview));
  }, { once: true });
  obras.addEventListener('pointermove', (e) => {
    if (!puntero.matches || obras.dataset.vista !== 'lista') return;
    apuntar(e.clientX, e.clientY);
    const li = filaBajo(e.clientX, e.clientY);
    if (li && li.dataset.preview) mostrar(li.dataset.preview);
    else ocultarPrevia();
  }, { passive: true });
  obras.addEventListener('pointerleave', ocultarPrevia);
  // Si la pagina se mueve con el mouse quieto, la fila bajo el cursor cambia.
  addEventListener('scroll', () => {
    if (!activa) return;
    const li = filaBajo(cx, cy);
    if (li && li.dataset.preview) mostrar(li.dataset.preview);
    else ocultarPrevia();
  }, { passive: true });
})();
