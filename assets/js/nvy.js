/* NVY Studios — interacciones del portafolio. Sin dependencias salvo Lenis.
   En celular (.estatico) no hay animaciones de entrada: todo aparece quieto. */
(() => {
  'use strict';
  window.NVY = true;

  const d = document;
  const html = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puntero = matchMedia('(hover: hover) and (pointer: fine)');
  const estatico = html.classList.contains('estatico');
  const animar = !estatico && !reducido;
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

  /* ---------- header: siempre visible ---------- */
  // En la portada de la home la marca chica se esconde (ya esta gigante) y aparece al bajar.
  const cab = $('[data-cab]');
  const portada = $('.portada');
  let pendiente = false;
  const alScroll = () => {
    pendiente = false;
    const y = Math.max(0, scrollY);
    cab.classList.toggle('en-portada', portada ? y < portada.offsetHeight * 0.55 : false);
    cab.classList.toggle('is-solida', y > 24);
  };
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alScroll); } }, { passive: true });
  alScroll();

  /* ---------- menu: panel lateral derecho ---------- */
  const menu = $('[data-menu]');
  const boton = $('[data-menu-boton]');
  const botonTxt = $('[data-menu-txt]');
  const abierto = () => menu.classList.contains('is-abierto');
  const abrir = () => {
    menu.inert = false;
    menu.classList.add('is-abierto');
    html.classList.add('menu-abierto');
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
    botonTxt.textContent = 'menú';
    menu.inert = true;
    if (lenis) lenis.start(); else html.style.overflow = '';
    if (devolverFoco) boton.focus({ preventScroll: true });
  };
  boton.addEventListener('click', () => (abierto() ? cerrar() : abrir()));
  $('[data-menu-cerrar]', menu).addEventListener('click', () => cerrar());
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

  /* ---------- boton magnetico: se inclina hacia el mouse ---------- */
  if (animar && puntero.matches) {
    for (const b of $$('.boton')) {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.35).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    }
  }

  /* ---------- cinta de rubros: acelera con el scroll y vuelve a su ritmo ---------- */
  const pista = $('.cinta__pista');
  const animCinta = pista && pista.getAnimations ? pista.getAnimations()[0] : null;
  if (animCinta && lenis && animar) {
    let ritmo = 1;
    let objetivo = 1;
    lenis.on('scroll', (l) => { objetivo = Math.max(objetivo, 1 + Math.min(6, Math.abs(l.velocity) * 0.45)); });
    const latir = () => {
      objetivo += (1 - objetivo) * 0.04;
      const nuevo = ritmo + (objetivo - ritmo) * 0.12;
      if (Math.abs(nuevo - ritmo) > 0.005) { ritmo = nuevo; animCinta.playbackRate = ritmo; }
      requestAnimationFrame(latir);
    };
    requestAnimationFrame(latir);
  }

  /* ---------- parrafos que suben linea por linea ---------- */
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
  const parrafos = animar ? $$('[data-reveal="lineas"]') : [];
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

  /* ---------- arranque: despues de la cortina entre paginas (si la hay) ---------- */
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
    if (animar) listasFuentes.then(() => $$('[data-reveal]').forEach((el) => io.observe(el)));
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
      if (!vt || !animar) return arrancar();
      vt.ready.then(() => setTimeout(arrancar, 520), arrancar);
    });
  });

  // Al volver con el boton atras (bfcache) la pagina puede quedar con el menu abierto.
  addEventListener('pageshow', (e) => { if (e.persisted && abierto()) cerrar(false); });

  /* ---------- trabajos: filtros, vista, filas que entran y captura al centro ---------- */
  const obras = $('[data-obras]');
  if (!obras) return;
  const seccion = obras.closest('.trabajos');
  const items = $$('.obra', obras);
  const anuncio = $('[data-anuncio]');
  let ocultarPrevia = () => {};

  // Las filas aparecen una tras otra: primero se dibuja la linea y despues sube el texto.
  if (animar) {
    const ioFilas = new IntersectionObserver((ents) => {
      if (!ents.some((e) => e.isIntersecting)) return;
      ioFilas.disconnect();
      let k = 0;
      for (const li of items) {
        if (li.hidden) { li.classList.add('is-visible'); continue; }
        setTimeout(() => li.classList.add('is-visible'), 120 + k++ * 85);
      }
    }, { threshold: 0.04 });
    ioFilas.observe(obras);
  } else {
    items.forEach((li) => li.classList.add('is-visible'));
  }

  const cambiar = (aplicar) => {
    ocultarPrevia();
    aplicar();
    let k = 0;
    for (const li of items) {
      li.classList.remove('is-entra', 'is-abierta');
      li.classList.add('is-visible');
      if (li.hidden || !animar || obras.dataset.vista !== 'lista') continue;
      li.style.setProperty('--k', k++);
      void li.offsetWidth;
      li.classList.add('is-entra');
    }
    if (lenis) lenis.resize();
  };

  // Las capturas se descargan apenas la pagina queda libre: asi la grilla, la fila
  // abierta en el celular y la captura del centro aparecen al tiro.
  const alQuedarLibre = (fn) => {
    const libre = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
    if (d.readyState === 'complete') libre();
    else addEventListener('load', libre, { once: true });
  };
  alQuedarLibre(() => $$('img[loading="lazy"]', obras).forEach((img) => { img.loading = 'eager'; }));

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

  // Escritorio + lista: la captura aparece siempre al centro de la pantalla. Al
  // pasar a otra fila cambia al tiro, con un desenfoque cortisimo.
  const previa = $('[data-previa]');
  if (!previa || reducido || !puntero.matches) return;
  const marco = d.createElement('div');
  marco.className = 'vista-previa__in';
  previa.appendChild(marco);
  const fotos = new Map();
  const foto = (base) => {
    if (!fotos.has(base)) {
      const p = d.createElement('picture');
      // La captura mide como maximo 480 px: la de 800 alcanza para retina.
      p.innerHTML = `<source type="image/avif" srcset="${base}-800.avif">`
        + `<img src="${base}-800.webp" alt="" decoding="async">`;
      marco.appendChild(p);
      fotos.set(base, p);
      $('img', p).decode().catch(() => {});
    }
    return fotos.get(base);
  };
  let actual = null;
  let activa = false;
  let cx = 0;
  let cy = 0;
  const mostrar = (li) => {
    const p = foto(li.dataset.preview);
    if (!activa) {
      // Al volver a aparecer solo se abre el marco, con la foto ya puesta.
      fotos.forEach((f) => f.classList.toggle('is-actual', f === p));
      actual = p;
      activa = true;
      previa.classList.add('is-activa');
      return;
    }
    if (p === actual) return;
    actual.classList.remove('is-actual');
    p.classList.add('is-actual');
    actual = p;
    marco.animate([{ filter: 'blur(10px)' }, { filter: 'blur(0)' }], { duration: 170, easing: 'ease-out' });
  };
  ocultarPrevia = () => { activa = false; previa.classList.remove('is-activa'); };
  const filaBajo = (px, py) => {
    const el = d.elementFromPoint(px, py);
    const li = el && el.closest ? el.closest('.obra') : null;
    return li && obras.contains(li) ? li : null;
  };
  const revisar = () => {
    const li = filaBajo(cx, cy);
    if (li && li.dataset.preview && obras.dataset.vista === 'lista') mostrar(li);
    else ocultarPrevia();
  };

  alQuedarLibre(() => items.forEach((li) => li.dataset.preview && foto(li.dataset.preview)));
  obras.addEventListener('pointermove', (e) => { cx = e.clientX; cy = e.clientY; revisar(); }, { passive: true });
  obras.addEventListener('pointerleave', ocultarPrevia);
  // Si la pagina se mueve con el mouse quieto, la fila bajo el cursor cambia.
  addEventListener('scroll', () => { if (activa) revisar(); }, { passive: true });
})();
