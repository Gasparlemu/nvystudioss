// Driver minimo de Chrome DevTools Protocol (Node 22+, sin dependencias).
// Lo usan capturas.mjs (screenshots de los sitios), calibrar-anchos.mjs y og.mjs.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333, profile, width = 1440, height = 900, args = [] } = {}) {
  const bin = CANDIDATOS.find((p) => existsSync(p));
  if (!bin) throw new Error('No encontre Chrome ni Edge. Define CHROME_PATH.');
  mkdirSync(profile, { recursive: true });
  // Perfil temporal y con cache minima: se borra al cerrar para no dejar basura en disco.
  const proc = spawn(bin, [
    '--headless', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disk-cache-size=1048576', '--media-cache-size=1048576',
    '--disable-component-update', '--disable-extensions', '--disable-sync',
    `--window-size=${width},${height}`, ...args, 'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
    if (!target) await sleep(150);
  }
  if (!target) throw new Error('Chrome no expuso una pestana por CDP');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params);
    }
  };
  // Ningun comando puede colgar el script para siempre: a los 60 s se rechaza.
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    const t = setTimeout(() => {
      if (pending.delete(id)) rej(new Error(`CDP sin respuesta en 60 s: ${method}`));
    }, 60000);
    pending.set(id, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const on = (method, fn) => {
    listeners.set(method, [...(listeners.get(method) || []), fn]);
    return () => listeners.set(method, (listeners.get(method) || []).filter((f) => f !== fn));
  };
  const once = (method, timeout = 30000) => new Promise((res) => {
    const off = on(method, (p) => { off(); clearTimeout(t); res(p); });
    const t = setTimeout(() => { off(); res(null); }, timeout);
  });

  const consola = [];
  on('Runtime.consoleAPICalled', (p) => consola.push(`${p.type}: ${p.args.map((a) => a.value ?? a.description).join(' ')}`));
  on('Runtime.exceptionThrown', (p) => consola.push(`EXCEPCION: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`));
  on('Log.entryAdded', (p) => consola.push(`${p.entry.level}: ${p.entry.text} ${p.entry.url || ''}`));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  return {
    send, on, once, consola,
    async viewport(w, h, { mobile = false, dpr = 1 } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
      await send('Emulation.setUserAgentOverride', {
        userAgent: mobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      });
    },
    async media(features) {
      await send('Emulation.setEmulatedMedia', { features });
    },
    async goto(url, wait = 1500) {
      const loaded = once('Page.loadEventFired', 45000);
      await send('Page.navigate', { url });
      await loaded;
      await sleep(wait);
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    // Devuelve el PNG como Buffer; si se pasa ruta, ademas lo guarda.
    async shot(path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(data, 'base64');
      if (path) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf); }
      return buf;
    },
    async move(x, y) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    async tap(x, y) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
    async wheel(dy, x = 700, y = 450) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
    },
    async key(key, code = key, keyCode = 0) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
    },
    async close() {
      try { ws.close(); } catch {}
      if (process.platform === 'win32') spawnSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' });
      else proc.kill('SIGKILL');
      await sleep(500);
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
    },
  };
}
