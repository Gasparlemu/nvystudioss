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
  // En Safari el scroll queda nativo: el trackpad del Mac ya lo suaviza, y Lenis lo movia
  // desde JavaScript, asi que cualquier cuadro pesado se notaba como tiron.
  const safari = /^((?!chrome|chromium|crios|fxios|edg|android).)*safari/i.test(navigator.userAgent);
  let lenis = null;
  if (!reducido && !safari && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const irA = (destino) => {
    // Respeta el scroll-margin-top de la seccion, igual que el salto nativo al cargar con #ancla.
    const top = typeof destino === 'number' ? destino : destino.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(destino).scrollMarginTop) || 0);
    if (lenis) lenis.scrollTo(top, { duration: 1.4 });
    else window.scrollTo({ top, behavior: reducido ? 'auto' : 'smooth' });
  };

  /* ---------- header: siempre visible ---------- */
  // En la portada de la home la marca chica se esconde (ya esta gigante) y aparece al bajar.
  const cab = $('[data-cab]');
  const portada = $('.portada');
  const claras = $$('[data-tema="claro"]');
  let pendiente = false;
  const alScroll = () => {
    pendiente = false;
    // Primero se lee todo y despues se escribe: asi el navegador no recalcula estilos a mitad de cuadro.
    const y = Math.max(0, scrollY);
    const enPortada = portada ? y < portada.offsetHeight * 0.55 : false;
    // Sobre una seccion clara (data-tema="claro") el logo y el menu pasan a negro.
    const esClaro = claras.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 36 && r.bottom > 36; });
    cab.classList.toggle('en-portada', enPortada);
    cab.classList.toggle('is-solida', y > 24);
    cab.classList.toggle('es-claro', esClaro);
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
    let avanceAntes = '';
    const encender = () => {
      pendienteTexto = false;
      const r = textoScroll.getBoundingClientRect();
      const inicio = innerHeight * 0.85;
      const fin = innerHeight * 0.4;
      const p = Math.min(1, Math.max(0, (inicio - r.top) / (inicio - fin + r.height)));
      // Fuera de su tramo el valor no cambia: no se toca el estilo de cada palabra.
      const avance = (p * (total + 1)).toFixed(2);
      if (avance !== avanceAntes) { avanceAntes = avance; textoScroll.style.setProperty('--avance', avance); }
    };
    textoScroll.classList.add('is-activo');
    addEventListener('scroll', () => { if (!pendienteTexto) { pendienteTexto = true; requestAnimationFrame(encender); } }, { passive: true });
    addEventListener('resize', encender);
    encender();
  }

  /* ---------- muro de capturas de la portada: quieto cuando no se ve ---------- */
  // Son 7 columnas en 3D moviendose sin parar: fuera de pantalla solo gastarian bateria y cuadros.
  const muro = $('[data-muro]');
  if (muro) new IntersectionObserver(([e]) => muro.classList.toggle('is-quieto', !e.isIntersecting)).observe(muro.parentElement);

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
  // Los titulos con data-tarde esperan a estar mas adentro de la pantalla (la marca gigante
  // del portafolio): asi las letras se ven subir en vez de animarse pegadas al borde.
  const ioTarde = new IntersectionObserver((entradas) => {
    for (const e of entradas) { if (!e.isIntersecting) continue; e.target.classList.add('is-visible'); ioTarde.unobserve(e.target); }
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0.2 });

  let arrancado = false;
  const arrancar = () => {
    if (arrancado) return;
    arrancado = true;
    html.classList.add('is-listo');
    if (animar) listasFuentes.then(() => $$('[data-reveal]').forEach((el) => (el.hasAttribute('data-tarde') ? ioTarde : io).observe(el)));
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

  // Las capturas se descargan apenas la pagina queda libre: asi la grilla, la fila
  // abierta en el celular y la captura del centro aparecen al tiro.
  const alQuedarLibre = (fn) => {
    const libre = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300));
    if (d.readyState === 'complete') libre();
    else addEventListener('load', libre, { once: true });
  };

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

  /* ---------- inicio: al llegar al portafolio la pantalla pasa a negro ---------- */
  // El header cambia de color cuando la zona negra cruza la mitad de la pantalla.
  const zonaNegra = $('[data-zona-negra]');
  if (zonaNegra) {
    const tema = $('meta[name="theme-color"]');
    new IntersectionObserver(([e]) => {
      d.body.classList.toggle('es-noche', e.isIntersecting);
      if (tema) tema.content = e.isIntersecting ? '#0B0B0C' : '#FFFFFF';
    }, { rootMargin: '-50% 0px -50% 0px' }).observe(zonaNegra);

    // El fondo negro sigue al scroll. Solo cambia la opacidad de su capa, sin repintar la página.
    const entrada = $('.portafolio');
    const cola = $('.zn-cola');
    const capa = d.createElement('div');
    capa.className = 'noche';
    capa.setAttribute('aria-hidden', 'true');
    d.body.prepend(capa);
    const entre01 = (n) => Math.min(1, Math.max(0, n));
    let pendienteNoche = false;
    let opacidadAntes = '';
    const pintarNoche = () => {
      pendienteNoche = false;
      const alto = innerHeight;
      const e = entrada.getBoundingClientRect();
      const c = cola.getBoundingClientRect();
      const sube = entre01((alto - e.top) / e.height);                    // mientras la marca entra por abajo
      const avance = (alto - c.top) / (alto + c.height);
      const baja = entre01((avance - 0.15) / 0.45);                       // cuando el final de la zona sube
      const opacidad = (sube * (1 - baja)).toFixed(3);
      if (opacidad !== opacidadAntes) { opacidadAntes = opacidad; capa.style.opacity = opacidad; }
    };
    const pedirNoche = () => { if (!pendienteNoche) { pendienteNoche = true; requestAnimationFrame(pintarNoche); } };
    addEventListener('scroll', pedirNoche, { passive: true });
    addEventListener('resize', pedirNoche);
    addEventListener('pageshow', pedirNoche);
    new ResizeObserver(pedirNoche).observe(d.body);
    pintarNoche();
  }

  /* ---------- telon verde hacia las cartas digitales ----------
     Las cartas son otra app: la transicion nativa entre paginas fallaba a veces, asi que el telon va a mano.
     Aqui sube al hacer clic; la landing de cartas lo recoge al cargar (marca "nvy-telon"). */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || reducido || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^\/cartas(\/|$)/.test(url.pathname)) return;
    e.preventDefault();
    const telon = d.createElement('div');
    telon.className = 'telon-cartas';
    d.body.append(telon);
    try { sessionStorage.setItem('nvy-telon', '1'); } catch (x) { /* sin telon a la llegada */ }
    setTimeout(() => { location.href = url.href; }, 250);
  });
  // Al volver con "atras", la pagina sale de la cache con el telon puesto: se saca.
  addEventListener('pageshow', (e) => { if (e.persisted) $$('.telon-cartas').forEach((t) => t.remove()); });

  /* ---------- videos: en su pagina corre sin sonido a la vista; el boton lo parte con sonido ---------- */
  // Nada se descarga hasta que el video se va a ver, y se pausa apenas sale de la pantalla.
  const ahorroDatos = navigator.connection?.saveData;
  for (const marco of $$('[data-video]')) {
    const video = $('video', marco);
    const sonido = $('[data-video-sonido]', marco);
    const solo = marco.dataset.video === 'auto' && !reducido && !ahorroDatos;
    let elegido = false;
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) video.pause();
      else if (solo && !elegido) video.play().catch(() => {});
    }, { threshold: 0.4 }).observe(marco);
    sonido.addEventListener('click', () => {
      elegido = true;
      video.muted = false;
      video.loop = false;
      video.controls = true;
      video.currentTime = 0;
      video.play().catch(() => {});
      sonido.hidden = true;
    });
  }

  /* ---------- demos: la vista previa sigue al nombre bajo el cursor ---------- */
  const demos = $$('.demo');
  const dshots = $$('.dshot');
  const verDemo = (i) => { demos.forEach((x, n) => x.classList.toggle('is-activo', n === i)); dshots.forEach((x, n) => x.classList.toggle('is-activo', n === i)); };
  demos.forEach((x, i) => {
    x.addEventListener('mouseenter', () => verDemo(i));
    x.addEventListener('focusin', () => verDemo(i));
    x.addEventListener('click', () => verDemo(i));
  });

  /* ---------- inicio: problemas que se abren dentro de la grilla ---------- */
  // Cada tarjeta lleva su panel justo despues en el HTML. Cerrado, el panel queda al
  // final de la grilla (order 999, alto 0); al abrirlo se ubica despues de la ultima
  // tarjeta de su fila y ocupa todo el ancho. Una abierta a la vez.
  const probs = $('[data-probs]');
  if (probs) {
    const tarjetas = $$('.prob', probs);
    const botonDe = (t) => $('.prob__abre', t);
    const panelDe = (t) => d.getElementById(botonDe(t).getAttribute('aria-controls'));
    const ubicar = (t) => {
      const fila = tarjetas.filter((x) => !x.hidden && x.offsetTop === t.offsetTop);
      panelDe(t).style.order = Math.max(...fila.map((x) => Number(x.style.getPropertyValue('--o')))) + 1;
    };
    const marcarProb = (t, on) => {
      t.classList.toggle('is-abierta', on);
      botonDe(t).setAttribute('aria-expanded', String(on));
      panelDe(t).classList.toggle('is-abierto', on);
    };
    // Al cambiar de tarjeta, la anterior se cierra al tiro (sin animar) para que la
    // grilla no baile con dos paneles moviendose a la vez.
    const cerrarProb = (t, animado = true) => {
      const p = panelDe(t);
      if (!animado) p.classList.add('sin-anim');
      marcarProb(t, false);
      if (!animado) { p.style.order = ''; void p.offsetWidth; p.classList.remove('sin-anim'); return; }
      setTimeout(() => { if (!t.classList.contains('is-abierta')) p.style.order = ''; if (lenis) lenis.resize(); }, 600);
    };
    const abrirProb = (t) => {
      tarjetas.forEach((x) => { if (x !== t && x.classList.contains('is-abierta')) cerrarProb(x, false); });
      ubicar(t);
      void panelDe(t).offsetWidth;
      marcarProb(t, true);
      // Al terminar de abrir: si la tarjeta quedo arriba de la pantalla o el panel
      // cortado abajo, la pagina se mueve lo justo.
      setTimeout(() => {
        if (lenis) lenis.resize();
        const r = t.getBoundingClientRect();
        const abajo = panelDe(t).getBoundingClientRect().bottom - innerHeight + 24;
        const mover = r.top < 88 ? r.top - 96 : Math.min(Math.max(0, abajo), r.top - 96);
        if (Math.abs(mover) < 8) return;
        if (lenis) lenis.scrollTo(scrollY + mover, { duration: 0.9 });
        else scrollBy({ top: mover, behavior: reducido ? 'auto' : 'smooth' });
      }, 600);
    };
    tarjetas.forEach((t) => botonDe(t).addEventListener('click', () => (t.classList.contains('is-abierta') ? cerrarProb(t) : abrirProb(t))));
    // Si cambia el numero de columnas, el panel abierto vuelve a quedar bajo su fila.
    addEventListener('resize', () => { const t = tarjetas.find((x) => x.classList.contains('is-abierta')); if (t) ubicar(t); });

    for (const b of $$('[data-filtro-prob]')) {
      b.addEventListener('click', () => {
        if (b.getAttribute('aria-pressed') === 'true') return;
        $$('[data-filtro-prob]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const filtro = b.dataset.filtroProb;
        for (const t of tarjetas) {
          if (t.classList.contains('is-abierta')) cerrarProb(t, false);
          t.hidden = !(filtro === 'todos' || t.dataset.tipo === filtro);
          panelDe(t).hidden = t.hidden;
        }
        if (lenis) lenis.resize();
      });
    }
    alQuedarLibre(() => $$('img[loading="lazy"]', probs).forEach((img) => { img.loading = 'eager'; }));
  }

  /* ---------- preguntas: en escritorio la respuesta sale en la tarjeta azul ---------- */
  // Con pantalla ancha la pregunta no se despliega: su respuesta pasa a la tarjeta de la
  // derecha. En pantallas mas chicas cada pregunta se abre en su lugar, como siempre.
  const visor = $('.faq__visor');
  if (visor) {
    const preguntas = $$('.faq__item');
    const ancho = matchMedia('(min-width: 1101px)');
    const ver = (item) => {
      preguntas.forEach((x) => x.classList.toggle('is-sel', x === item));
      visor.classList.remove('is-entra'); void visor.offsetWidth; visor.classList.add('is-entra');
      $('.faq__visor-q', visor).textContent = $('summary', item).textContent.trim();
      $('.faq__visor-r', visor).textContent = $('.faq__r', item).textContent.trim();
    };
    preguntas.forEach((item) => $('summary', item).addEventListener('click', (e) => {
      if (!ancho.matches) return;
      e.preventDefault();
      ver(item);
    }));
    ver(preguntas[0]);
  }

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

  const cargarCapturas = () => $$('img[loading="lazy"]', seccion).forEach((img) => { img.loading = 'eager'; });
  // En el inicio la lista queda lejos: se descargan recien cuando la persona se acerca.
  if (zonaNegra) new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); cargarCapturas(); } }, { rootMargin: '100% 0px' }).observe(seccion);
  else alQuedarLibre(cargarCapturas);

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
})();
