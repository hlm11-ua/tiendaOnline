// Motor de grabación de demos: Chrome (puppeteer-core) + ffmpeg (ffmpeg-static).
// Cada demo = tarjeta de presentación + recorrido real por la tienda con rótulos por escenario.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';

const DIR_DEMOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANCHO = 1280;
const ALTO = 720;
const FPS = 25;

const CHROME_CANDIDATOS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const espera = ms => new Promise(r => setTimeout(r, ms));

function localizarChrome() {
  const ruta = CHROME_CANDIDATOS.find(p => fs.existsSync(p));
  if (!ruta) throw new Error('No se encuentra Chrome ni Edge. Indique la ruta con la variable CHROME_PATH.');
  return ruta;
}

// ---------------------------------------------------------------------------
// Grabadora: fotogramas del screencast de Chrome → ffmpeg a ritmo constante
// ---------------------------------------------------------------------------
class Grabadora {
  constructor(page, salida) {
    this.page = page;
    this.salida = salida;
    this.ultimo = null;
    this.escritos = 0;
  }

  async iniciar() {
    this.ffmpeg = spawn(ffmpegPath, [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-vf', `scale=${ANCHO}:${ALTO}:flags=lanczos,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart',
      this.salida
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    this.terminado = new Promise((resolve, reject) => {
      this.ffmpeg.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg terminó con código ${code}`)));
    });

    this.ultimo = await this.page.screenshot({ type: 'jpeg', quality: 90 });
    this.cdp = await this.page.createCDPSession();
    this.cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      this.ultimo = Buffer.from(data, 'base64');
      try { await this.cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* sesión cerrada */ }
    });
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: ANCHO, maxHeight: ALTO, everyNthFrame: 1 });

    // Se escribe el último fotograma tantas veces como marque el reloj real: la duración del vídeo es la real
    this.inicio = Date.now();
    this.reloj = setInterval(() => this.volcar(), 1000 / FPS / 2);
  }

  volcar() {
    const debidos = Math.floor((Date.now() - this.inicio) / (1000 / FPS));
    while (this.escritos < debidos && this.ultimo) {
      this.ffmpeg.stdin.write(this.ultimo);
      this.escritos++;
    }
  }

  async detener() {
    this.volcar();
    clearInterval(this.reloj);
    try { await this.cdp.send('Page.stopScreencast'); } catch { /* ya detenido */ }
    this.ffmpeg.stdin.end();
    await this.terminado;
  }
}

// ---------------------------------------------------------------------------
// Capa de demo inyectada en cada página: rótulo del escenario + cursor simulado
// ---------------------------------------------------------------------------
const CAPA_DEMO = `
(() => {
  if (window.__demo) return;
  const estilo = document.createElement('style');
  estilo.textContent = \`
    #demo-rotulo { position: fixed; left: 32px; z-index: 2147483646; max-width: 640px;
      background: rgba(59, 42, 32, 0.94); color: #FAF5EE; border-radius: 14px;
      padding: 14px 20px 16px; box-shadow: 0 12px 32px rgba(59, 42, 32, 0.35);
      font-family: 'Nunito Sans', system-ui, sans-serif; pointer-events: none;
      transition: opacity .35s ease, transform .35s ease; border-left: 5px solid #C9693F; }
    #demo-rotulo.abajo { bottom: 28px; } #demo-rotulo.arriba { top: 84px; }
    /* Junto a un modal centrado: columna estrecha a la izquierda, centrada en vertical */
    #demo-rotulo.lado { left: 24px; top: 50%; transform: translateY(-50%); max-width: 290px; }
    #demo-rotulo.oculto { opacity: 0; transform: translateY(8px); }
    #demo-rotulo .etiqueta { display: block; font-size: 12px; font-weight: 800; letter-spacing: .12em;
      text-transform: uppercase; color: #E8A37E; margin-bottom: 6px; }
    #demo-rotulo .texto { font-size: 17px; line-height: 1.45; font-weight: 600; }
    #demo-cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
      pointer-events: none; transition: transform .7s cubic-bezier(.45,.05,.25,1); }
    #demo-cursor.pulsa::after { content: ''; position: absolute; left: -11px; top: -11px; width: 22px; height: 22px;
      border-radius: 50%; background: rgba(168, 75, 42, .35); animation: demo-pulso .45s ease-out; }
    @keyframes demo-pulso { from { transform: scale(.4); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
  \`;
  const montar = () => {
    document.head.appendChild(estilo);
    const rotulo = document.createElement('div');
    rotulo.id = 'demo-rotulo'; rotulo.className = 'abajo oculto';
    rotulo.innerHTML = '<span class="etiqueta"></span><span class="texto"></span>';
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12 14.2 L18.5 14.2 Z" fill="#3B2A20" stroke="#FFFCF7" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(rotulo, cursor);
  };
  window.__demo = {
    rotulo(etiqueta, texto, posicion) {
      const r = document.getElementById('demo-rotulo');
      if (!r) return;
      if (!etiqueta && !texto) { r.classList.add('oculto'); return; }
      r.querySelector('.etiqueta').textContent = etiqueta;
      r.querySelector('.texto').textContent = texto;
      r.className = (posicion || 'abajo');
    },
    cursor(x, y, instantaneo) {
      const c = document.getElementById('demo-cursor');
      if (!c) return;
      if (instantaneo) { c.style.transition = 'none'; requestAnimationFrame(() => { c.style.transition = ''; }); }
      c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    },
    pulsar() {
      const c = document.getElementById('demo-cursor');
      c.classList.remove('pulsa'); void c.offsetWidth; c.classList.add('pulsa');
    }
  };
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
`;

// ---------------------------------------------------------------------------
// API de guion: lo que usan los archivos de cada funcionalidad
// ---------------------------------------------------------------------------
export class Demo {
  constructor(page, base, total) {
    this.page = page;
    this.base = base;
    this.total = total;
    this.cursorX = ANCHO / 2;
    this.cursorY = ALTO / 2;
    this.rotuloActual = null;
    this.respuestaPrompt = '';
  }

  /** Texto con el que se responderá al próximo prompt() de la página (los confirm() se aceptan siempre). */
  responderPrompt(texto) { this.respuestaPrompt = String(texto); }

  /** Rellena un campo cuyo valor no se puede teclear de forma fiable (p. ej. fechas) y lanza sus eventos. */
  async fijarValor(selector, valor) {
    await this.moverA(selector);
    await this.page.evaluate(() => window.__demo.pulsar());
    await this.page.$eval(selector, (el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, valor);
    await espera(700);
  }

  /** Inicia sesión desde la pantalla «Mi Cuenta». */
  async iniciarSesion(email, password) {
    await this.ir('/cuenta');
    await this.escribir('#login-email', email);
    await this.escribir('#login-password', password, { retardo: 40 });
    await this.clic('#btn-login-submit', { esperar: 1800 });
  }

  /** Cierra la sesión desde «Mi Cuenta». */
  async cerrarSesion() {
    await this.ir('/cuenta');
    await this.clic('#btn-logout', { esperar: 1500 });
  }

  url(ruta) { return ruta.startsWith('http') || ruta.startsWith('file:') ? ruta : this.base + ruta; }

  async restaurarCapa() {
    await this.page.evaluate(CAPA_DEMO);
    await this.page.waitForFunction(() => document.getElementById('demo-cursor'));
    await this.page.evaluate((x, y) => window.__demo.cursor(x, y, true), this.cursorX, this.cursorY);
    if (this.rotuloActual) {
      const { etiqueta, texto, posicion } = this.rotuloActual;
      await this.page.evaluate((e, t, p) => window.__demo.rotulo(e, t, p), etiqueta, texto, posicion);
    }
  }

  async ir(ruta, { esperar = 900 } = {}) {
    await this.page.goto(this.url(ruta), { waitUntil: 'networkidle0' });
    await this.restaurarCapa();
    await espera(esperar);
  }

  /** Muestra el rótulo de un escenario. n = número de escenario (1..total). */
  async escenario(n, titulo, texto, { posicion = 'abajo', leer } = {}) {
    this.rotuloActual = { etiqueta: `Escenario ${n} de ${this.total} · ${titulo}`, texto, posicion };
    await this.page.evaluate((e, t, p) => window.__demo.rotulo(e, t, p), this.rotuloActual.etiqueta, texto, posicion);
    await espera(leer ?? Math.max(2600, texto.length * 45));
  }

  /** Cambia solo el texto narrado del escenario en curso. */
  async narrar(texto, { posicion, leer } = {}) {
    if (!this.rotuloActual) throw new Error('narrar() requiere un escenario activo');
    this.rotuloActual = { ...this.rotuloActual, texto, posicion: posicion || this.rotuloActual.posicion };
    const { etiqueta, posicion: p } = this.rotuloActual;
    await this.page.evaluate((e, t, pos) => window.__demo.rotulo(e, t, pos), etiqueta, texto, p);
    await espera(leer ?? Math.max(2200, texto.length * 45));
  }

  async ocultarRotulo() {
    this.rotuloActual = null;
    await this.page.evaluate(() => window.__demo.rotulo('', ''));
  }

  async moverA(selector, { desplazar = true } = {}) {
    // Las páginas re-renderizan componentes tras cargar datos: si el nodo desaparece, se vuelve a buscar
    let caja = null;
    for (let intento = 0; intento < 4 && !caja; intento++) {
      const el = await this.page.waitForSelector(selector, { visible: true, timeout: 15000 });
      if (desplazar) {
        await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'smooth' })).catch(() => {});
        await espera(650);
      }
      caja = await el.boundingBox().catch(() => null);
      // Nodos que se regeneran cada segundo (p. ej. el temporizador): se mide el nodo vigente en una sola llamada
      if (!caja && !selector.includes('::-p-')) {
        caja = await this.page.$eval(selector, e => {
          const r = e.getBoundingClientRect();
          return r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
        }).catch(() => null);
      }
      if (!caja) await espera(400);
    }
    if (!caja) throw new Error(`El elemento ${selector} no tiene posición en pantalla`);
    const x = Math.round(caja.x + Math.min(caja.width / 2, 60));
    const y = Math.round(caja.y + caja.height / 2);
    await this.page.evaluate((cx, cy) => window.__demo.cursor(cx, cy), x, y);
    this.cursorX = x; this.cursorY = y;
    await espera(800);
    return { x, y };
  }

  async clic(selector, { navega = false, esperar = 700 } = {}) {
    const { x, y } = await this.moverA(selector);
    await this.page.evaluate(() => window.__demo.pulsar());
    if (navega) {
      await Promise.all([this.page.waitForNavigation({ waitUntil: 'networkidle0' }), this.page.mouse.click(x, y)]);
      await this.restaurarCapa();
    } else {
      await this.page.mouse.click(x, y);
    }
    await espera(esperar);
  }

  async escribir(selector, texto, { borrar = true, retardo = 55 } = {}) {
    await this.clic(selector, { esperar: 250 });
    if (borrar) {
      await this.page.$eval(selector, el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    }
    await this.page.type(selector, String(texto), { delay: retardo });
    await espera(450);
  }

  async elegir(selector, valor) {
    await this.moverA(selector);
    await this.page.evaluate(() => window.__demo.pulsar());
    await this.page.select(selector, valor);
    await espera(900);
  }

  async desplazar(pixeles) {
    await this.page.evaluate(px => window.scrollBy({ top: px, behavior: 'smooth' }), pixeles);
    await espera(900);
  }

  async pausa(ms) { await espera(ms); }

  /** Ejecuta código en la página (para preparar datos o leer estado). */
  async enPagina(fn, ...args) { return this.page.evaluate(fn, ...args); }
}

// ---------------------------------------------------------------------------
// Tarjeta de presentación
// ---------------------------------------------------------------------------
async function tarjetaPresentacion(page, intro) {
  const plantilla = pathToFileURL(path.join(DIR_DEMOS, 'plantillas', 'intro.html')).href;
  const datos = encodeURIComponent(JSON.stringify(intro));
  await page.goto(`${plantilla}#${datos}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.iniciarAnimacion());
  // Aparición escalonada de los escenarios + tiempo de lectura
  await espera(2600 + intro.escenarios.length * 650 + 3800);
}

// ---------------------------------------------------------------------------
// Ejecución de una demo completa
// ---------------------------------------------------------------------------
export async function grabarDemo(definicion, { base, carpetaSalida, alPrepararDatos }) {
  const salida = path.join(carpetaSalida, `${definicion.archivo}.mp4`);
  const navegador = await puppeteer.launch({
    executablePath: localizarChrome(),
    headless: true,
    args: [`--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars', '--font-render-hinting=none', '--lang=es-ES'],
    defaultViewport: { width: ANCHO, height: ALTO, deviceScaleFactor: 1 }
  });
  try {
    const page = await navegador.newPage();
    await page.emulateTimezone('Europe/Madrid');
    page.on('pageerror', err => console.warn(`   [página] ${err.message}`));
    // Las descargas (exportación CSV) no se guardan durante la grabación
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});

    await alPrepararDatos?.();
    const demo = new Demo(page, base, definicion.intro.escenarios.length);
    // Los diálogos nativos no salen en la grabación: se guarda su texto para citarlo en el rótulo
    page.on('dialog', async d => {
      demo.ultimoDialogo = d.message();
      await espera(900);
      await (d.type() === 'prompt' ? d.accept(demo.respuestaPrompt) : d.accept());
    });

    // Página en blanco con el color del tema para el primer fotograma
    await page.setContent('<body style="margin:0;background:#FAF5EE"></body>');
    const grabadora = new Grabadora(page, salida);
    await grabadora.iniciar();
    await tarjetaPresentacion(page, definicion.intro);
    await definicion.guion(demo);
    await espera(1200);
    await grabadora.detener();
    return { salida, segundos: grabadora.escritos / FPS };
  } finally {
    await navegador.close();
  }
}

export { ANCHO, ALTO, FPS, espera };
