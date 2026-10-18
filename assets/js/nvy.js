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
  const claras = $$('[data-tema="claro"]');
  let pendiente = false;
  const alScroll = () => {
    pendiente = false;
    const y = Math.max(0, scrollY);
    cab.classList.toggle('en-portada', portada ? y < portada.offsetHeight * 0.55 : false);
    cab.classList.toggle('is-solida', y > 24);
    // Sobre una seccion clara (data-tema="claro") el logo y el menu pasan a negro.
    cab.classList.toggle('es-claro', claras.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 36 && r.bottom > 36; }));
  };
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alScroll); } }, { passive: true });
  alScroll();

  /* ---------- menu: panel lateral derecho ---------- */
  const menu = $('[data-menu]');
  const boton = $('[data-menu-boton]');
  const botonTxt = $('[data-menu-txt]');
  const abierto = () => menu.classList.contains('is-abierto');
  // El foco solo salta al menu si se abrio con el teclado: con el dedo o el mouse,
  // Safari en iPhone le dibujaria un recuadro a "trabajos".
  const abrir = (conTeclado = false) => {
    menu.inert = false;
    menu.classList.add('is-abierto');
    html.classList.add('menu-abierto');
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    botonTxt.textContent = 'cerrar';
    if (lenis) lenis.stop(); else html.style.overflow = 'hidden';
    if (conTeclado) setTimeout(() => { const primero = $('.menu__link', menu); if (primero) primero.focus({ preventScroll: true }); }, 60);
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
  // Un click hecho con el teclado (Enter o espacio) llega con detail 0.
  boton.addEventListener('click', (e) => (abierto() ? cerrar(e.detail === 0) : abrir(e.detail === 0)));
  $('[data-menu-cerrar]', menu).addEventListener('click', () => cerrar(false));
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

  /* ---------- sobre mi: el texto se enciende al bajar ---------- */
  // --avance va de 0 a la cantidad de palabras mientras el parrafo cruza la pantalla:
  // empieza cuando asoma por abajo y termina cuando su final llega al 40 % de la altura.
  // Es un solo valor por cuadro, asi que no compite con el scroll.
  const textoScroll = $('[data-scroll-texto]');
  if (textoScroll && !reducido) {
    const total = textoScroll.children.length;
    let pendienteTexto = false;
    const encender = () => {
      pendienteTexto = false;
      const r = textoScroll.getBoundingClientRect();
      const inicio = innerHeight * 0.85;
      const fin = innerHeight * 0.4;
      const p = Math.min(1, Math.max(0, (inicio - r.top) / (inicio - fin + r.height)));
      textoScroll.style.setProperty('--avance', (p * (total + 1)).toFixed(2));
    };
    textoScroll.classList.add('is-activo');
    addEventListener('scroll', () => { if (!pendienteTexto) { pendienteTexto = true; requestAnimationFrame(encender); } }, { passive: true });
    addEventListener('resize', encender);
    encender();
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

  // Las animaciones de entrada esperan a las fuentes, para que las letras no cambien de forma.
  const listasFuentes = d.fonts ? d.fonts.ready : Promise.resolve();

  /* ---------- arranque: despues de la cortina entre paginas (si la hay) ---------- */
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
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
    aplicar();
    let k = 0;
    for (const li of items) {
      li.classList.remove('is-entra');
      if (li.classList.contains('is-abierta')) marcar(li, false);
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
  alQuedarLibre(() => $$('img[loading="lazy"]', seccion).forEach((img) => { img.loading = 'eager'; }));

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
      verPrevia(items.findIndex((li) => !li.hidden));
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

  // Escritorio con mouse: la vista previa fija de la derecha sigue a la fila bajo el cursor
  // (o con foco), y un clic entra al proyecto. Sin mouse, las filas se despliegan (abajo).
  const soloPrevia = matchMedia('(hover: hover) and (min-width: 901px)');
  const previas = $$('.pv', seccion);
  const verPrevia = (i) => { if (i >= 0) previas.forEach((p, k) => p.classList.toggle('is-activo', k === i)); };
  for (const ev of ['mouseover', 'focusin']) {
    obras.addEventListener(ev, (e) => { const li = e.target.closest('.obra'); if (li) verPrevia(items.indexOf(li)); });
  }

  // Lista: un clic o toque en la fila la despliega con una vista corta del proyecto y
  // otro clic la cierra (una abierta a la vez). Se entra con "ver proyecto" o la captura.
  // Ctrl/cmd + clic sigue abriendo el proyecto en otra pestaña.
  const linkDe = (li) => $('.obra__link', li);
  const marcar = (li, abierta) => {
    li.classList.toggle('is-abierta', abierta);
    linkDe(li).setAttribute('aria-expanded', String(abierta));
    $$('.obra__media a', li).forEach((a) => { a.tabIndex = abierta ? 0 : -1; });
  };
  items.forEach((li) => linkDe(li).setAttribute('aria-expanded', 'false'));
  obras.addEventListener('click', (e) => {
    const link = e.target.closest('.obra__link');
    if (!link || soloPrevia.matches || obras.dataset.vista !== 'lista' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const li = link.closest('.obra');
    const abrir = !li.classList.contains('is-abierta');
    items.forEach((otro) => { if (otro !== li && otro.classList.contains('is-abierta')) marcar(otro, false); });
    marcar(li, abrir);
    // Al terminar el despliegue: Lenis recalcula el alto y, si la fila quedo cortada
    // abajo, la pagina baja lo justo para mostrarla entera.
    setTimeout(() => {
      if (lenis) lenis.resize();
      if (!abrir) return;
      const sobra = li.getBoundingClientRect().bottom - innerHeight + 24;
      if (sobra > 0) {
        if (lenis) lenis.scrollTo(scrollY + sobra, { duration: 0.8 });
        else scrollBy({ top: sobra, behavior: reducido ? 'auto' : 'smooth' });
      }
    }, 520);
  });

  /* ---------- proceso: paneles que se expanden ---------- */
  const paneles = $$('.paso');
  const activar = (p) => paneles.forEach((o) => {
    const on = o === p;
    o.classList.toggle('is-activo', on);
    $('.paso__abre', o).setAttribute('aria-expanded', String(on));
  });
  paneles.forEach((p) => {
    $('.paso__abre', p).addEventListener('click', () => activar(p));
    p.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) activar(p); });
  });

  /* ---------- demos: la vista previa sigue al nombre bajo el cursor ---------- */
  const demos = $$('.demo');
  const dshots = $$('.dshot');
  const verDemo = (i) => { demos.forEach((x, n) => x.classList.toggle('is-activo', n === i)); dshots.forEach((x, n) => x.classList.toggle('is-activo', n === i)); };
  demos.forEach((x, i) => {
    x.addEventListener('mouseenter', () => verDemo(i));
    x.addEventListener('focusin', () => verDemo(i));
    x.addEventListener('click', () => verDemo(i));
  });
})();
