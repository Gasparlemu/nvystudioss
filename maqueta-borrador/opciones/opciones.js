// Lee las opciones de la URL (?hero=5&prob=2...) y las aplica al <html> antes de pintar.
(function () {
  const h = document.documentElement;
  const BASE = { hero: '7c', tit: 'mixto', prob: '7b', proc: '3', faq: '5' };
  const q = new URLSearchParams(location.search);
  let guardado = {};
  try { guardado = JSON.parse(localStorage.getItem('nvy-opciones-5') || '{}'); } catch (e) {}
  const estado = {};
  Object.keys(BASE).forEach((k) => { estado[k] = q.get(k) ?? guardado[k] ?? BASE[k]; h.dataset[k] = estado[k]; });

  const guardar = () => {
    history.replaceState(null, '', location.pathname + '?' + new URLSearchParams(estado));
    try { localStorage.setItem('nvy-opciones-5', JSON.stringify(estado)); } catch (e) {}
  };
  const conMouse = () => matchMedia('(hover: hover)').matches && !h.classList.contains('estatico');

  document.addEventListener('DOMContentLoaded', () => {
    const op = document.querySelector('[data-op]');
    const marcar = () => op.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-pressed', String(estado[b.dataset.k] === b.dataset.v)));
    const items = [...document.querySelectorAll('.faq__item')];

    // --- preguntas 6 (chat): todas abiertas y fijas ---
    const chat = () => items.forEach((d) => { d.open = h.dataset.faq === '6'; });
    // --- preguntas 5: la respuesta se muestra en el visor de la derecha ---
    const visor = document.querySelector('.faq__visor');
    const ver = (d) => {
      items.forEach((x) => x.classList.toggle('is-sel', x === d));
      visor.classList.remove('is-entra'); void visor.offsetWidth; visor.classList.add('is-entra');
      visor.querySelector('.faq__visor-q').textContent = d.querySelector('summary').textContent.trim();
      visor.querySelector('.faq__visor-r').textContent = d.querySelector('.faq__r').textContent.trim();
    };
    const lado = () => h.dataset.faq === '5' && matchMedia('(min-width: 1101px)').matches;
    items.forEach((d) => d.querySelector('summary').addEventListener('click', (e) => {
      if (h.dataset.faq === '6' || lado()) e.preventDefault();
      if (lado()) ver(d);
    }));
    ver(items[0]);

    // --- titulo de la portada letra por letra, como "Nvy Studios" en /trabajos ---
    // Cada letra pinta su tramo del degradado de la palabra: --w es el ancho de la
    // palabra y --x la posicion de la letra, en em (lo mismo que hace letras() en build.mjs).
    const h1 = document.querySelector('.hero--7 h1');
    let n = 0;
    h1.querySelectorAll('.palabra').forEach((p) => {
      const t = p.textContent;
      p.innerHTML = [...t].map((c) => `<span class="letra" style="--n:${n++}">${c}</span>`).join('');
      n++;
    });
    const medir = () => {
      const fs = parseFloat(getComputedStyle(h1).fontSize);
      h1.querySelectorAll('.palabra').forEach((p) => {
        const ls = [...p.children];
        const x0 = ls[0].offsetLeft;
        ls.forEach((l) => l.style.setProperty('--x', ((l.offsetLeft - x0) / fs).toFixed(4)));
        const u = ls[ls.length - 1];
        p.style.setProperty('--w', ((u.offsetLeft + u.offsetWidth - x0) / fs - 0.14).toFixed(4));
      });
    };
    document.fonts.ready.then(medir);

    // --- portada 7c: el muro se endereza al bajar; 7d: sigue al mouse ---
    const hero = document.querySelector('.hero--7');
    const muro = hero.querySelector('.muro');
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pide = 0;
    const alBajar = () => {
      pide = 0;
      if (h.dataset.hero !== '7c') return;
      const s = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.8)));
      muro.style.setProperty('--s', s.toFixed(3));
    };
    addEventListener('scroll', () => { if (!pide && !quieto) pide = requestAnimationFrame(alBajar); }, { passive: true });
    // el muro llega a la posicion del mouse de a poco, no de golpe
    let mx = 0, my = 0, vx = 0, vy = 0, andando = 0;
    const seguir = () => {
      vx += (mx - vx) * 0.06; vy += (my - vy) * 0.06;
      muro.style.setProperty('--mx', vx.toFixed(3)); muro.style.setProperty('--my', vy.toFixed(3));
      andando = Math.abs(mx - vx) + Math.abs(my - vy) > 0.002 ? requestAnimationFrame(seguir) : 0;
    };
    addEventListener('pointermove', (e) => {
      if (h.dataset.hero !== '7d' || e.pointerType !== 'mouse' || quieto || scrollY > hero.offsetHeight) return;
      mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1;
      if (!andando) andando = requestAnimationFrame(seguir);
    }, { passive: true });

    // --- problemas 6: brillo que sigue al mouse ---
    document.querySelectorAll('.prob').forEach((t) => t.addEventListener('pointermove', (e) => {
      if (h.dataset.prob !== '6') return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    // --- proceso 5: avanza solo hasta que la persona lo toca ---
    const pasos = [...document.querySelectorAll('.paso')];
    const lista = document.querySelector('.pasos');
    let tocado = false, encima = false, visible = false;
    lista.addEventListener('pointerenter', () => { encima = true; });
    lista.addEventListener('pointerleave', () => { encima = false; });
    lista.addEventListener('click', (e) => { if (e.isTrusted) tocado = true; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.5 }).observe(lista);
    setInterval(() => {
      if (h.dataset.proc !== '5' || tocado || encima || !visible || !conMouse()) return;
      const i = pasos.findIndex((p) => p.classList.contains('is-activo'));
      pasos[(i + 1) % pasos.length].querySelector('.paso__abre').click();
    }, 3800);

    const aplicar = () => { marcar(); chat(); };
    aplicar();
    op.querySelector('[data-op-abre]').addEventListener('click', () => op.classList.toggle('is-abierto'));
    op.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      estado[b.dataset.k] = b.dataset.v;
      h.dataset[b.dataset.k] = b.dataset.v;
      aplicar();
      guardar();
      // otra fuente cambia el ancho de cada letra: hay que volver a medir para el degradado
      if (b.dataset.k === 'tit') { medir(); document.fonts.ready.then(medir); setTimeout(medir, 700); }
      if (b.dataset.k === 'hero') {
        scrollTo({ top: 0 });
        muro.style.setProperty('--s', 0); mx = my = 0; if (!andando) andando = requestAnimationFrame(seguir);
        // 7e: vuelve a armar el muro para que se vea la entrada
        if (b.dataset.v === '7e') { h.classList.remove('is-listo'); void muro.offsetWidth; h.classList.add('is-listo'); }
      }
      else document.getElementById({ prob: 'problemas', proc: 'proceso', faq: 'preguntas' }[b.dataset.k]).scrollIntoView();
      dispatchEvent(new Event('resize'));
    });
    guardar();
  });
})();
