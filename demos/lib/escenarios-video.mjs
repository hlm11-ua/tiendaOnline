// Localiza en un vídeo ya grabado el segundo en que empieza cada escenario.
// El rótulo de cada escenario empieza siempre por «ESCENARIO N DE M», en naranja claro (#E8A37E)
// sobre el fondo marrón del rótulo. Ese fragmento se dibuja igual sea cual sea la posición del rótulo
// (abajo, arriba o al lado), así que su forma solo cambia cuando cambia N.
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const W = 1280;
const H = 720;
const MUESTRAS_POR_SEGUNDO = 4;
const ANCHO_PREFIJO = 128;   // «ESCENARIO N DE» a 12 px con espaciado de 0,12 em
const ALTO_LINEA = 12;
// Calibrado sobre el dígito en 001: mismo escenario ≤ 0,12; escenarios distintos ≥ 0,38
const UMBRAL_CAMBIO = 0.25;
// Un prefijo real marca ~230 píxeles; menos es ruido (p. ej. la tarjeta de presentación)
const MINIMO_MARCADOS = 120;

function esNaranja(b, i, tol) {
  return Math.abs(b[i] - 232) < tol && Math.abs(b[i + 1] - 163) < tol && Math.abs(b[i + 2] - 126) < tol;
}

function esFondoRotulo(b, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const i = (y * W + x) * 3;
  return b[i] > 45 && b[i] < 80 && b[i + 1] > 30 && b[i + 1] < 62 && b[i + 2] > 20 && b[i + 2] < 52;
}

/** Firma del prefijo «ESCENARIO N DE» de un fotograma, o null si no hay rótulo. */
export function firmaRotulo(b) {
  // 1. Píxeles de letra del rótulo: naranja con fondo del rótulo a ambos lados, contados por fila.
  //    La línea del rótulo es la fila con más píxeles así; no se usa el primero de la imagen porque,
  //    con un modal abierto, el velo oscurece la cabecera de la tienda y el icono 🏺 también da positivo.
  const porFila = new Uint16Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      if (esNaranja(b, i, 26) &&
          ((esFondoRotulo(b, x - 3, y) && esFondoRotulo(b, x + 3, y)) || (esFondoRotulo(b, x, y - 3) && esFondoRotulo(b, x, y + 3)))) {
        porFila[y]++;
      }
    }
  }
  let filaPico = 0;
  for (let y = 1; y < H; y++) if (porFila[y] > porFila[filaPico]) filaPico = y;
  if (porFila[filaPico] === 0) return null;
  // Primera fila de esa línea de texto: se sube mientras siga habiendo letra (máx. una altura de línea)
  let y0 = filaPico;
  for (let y = filaPico - 1; y >= Math.max(0, filaPico - ALTO_LINEA); y--) if (porFila[y] > 0) y0 = y;
  // En el rótulo lateral (estrecho) la etiqueta ocupa dos líneas y la de más píxeles puede ser la segunda:
  // se sube mientras haya otra línea de etiqueta justo encima, para quedarse con la primera («ESCENARIO N…»)
  for (let subir = true; subir;) {
    subir = false;
    for (let y = y0 - 4; y >= Math.max(0, y0 - ALTO_LINEA - 10); y--) {
      if (porFila[y] > 0) {
        let tope = y;
        while (tope > 0 && porFila[tope - 1] > 0) tope--;
        y0 = tope;
        subir = true;
        break;
      }
    }
  }
  let x0 = W;

  // 2. Inicio exacto de la primera línea del rótulo (tolerancia amplia para el antialiasing)
  const filaIni = Math.max(0, y0 - 3);
  const filaFin = Math.min(H - 1, y0 + ALTO_LINEA);
  for (let y = filaIni; y <= filaFin; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      if (esNaranja(b, i, 40) && (esFondoRotulo(b, x - 4, y) || esFondoRotulo(b, x + 4, y))) {
        if (x < x0) x0 = x;
      }
    }
  }
  if (x0 === W) return null;

  // 3. Máscara del prefijo, relativa al inicio del texto
  const bits = new Uint8Array(ANCHO_PREFIJO * (ALTO_LINEA + 3));
  let k = 0;
  for (let y = filaIni; y < filaIni + ALTO_LINEA + 3; y++) {
    for (let x = x0; x < x0 + ANCHO_PREFIJO; x++, k++) {
      if (y < H && x < W && esNaranja(b, (y * W + x) * 3, 40)) bits[k] = 1;
    }
  }
  const marcados = bits.reduce((a, v) => a + v, 0);
  return marcados >= MINIMO_MARCADOS ? bits : null;
}

// Columnas del dígito N dentro de «ESCENARIO N DE», relativas al inicio del texto
const DIGITO_X0 = 82;
const DIGITO_X1 = 96;

/**
 * Proporción de píxeles distintos en el dígito N entre dos firmas (0 = idénticos).
 * Se prueba con un desplazamiento de ±1 px por si el inicio del texto se detectó con un píxel de diferencia.
 */
export function distancia(a, b) {
  const filas = ALTO_LINEA + 3;
  let mejor = 1;
  // ±1 px en horizontal y ±2 px en vertical: el inicio del texto puede detectarse con algún píxel de diferencia
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      let distintos = 0;
      let marcados = 0;
      for (let y = 2; y < ALTO_LINEA + 1; y++) {
        const yb = y + dy;
        if (yb < 0 || yb >= filas) continue;
        for (let x = DIGITO_X0; x < DIGITO_X1; x++) {
          const va = a[y * ANCHO_PREFIJO + x];
          const vb = b[yb * ANCHO_PREFIJO + x + dx];
          if (va || vb) marcados++;
          if (va !== vb) distintos++;
        }
      }
      if (marcados) mejor = Math.min(mejor, distintos / marcados);
    }
  }
  return mejor;
}

/** Recorre el vídeo muestra a muestra y llama a alFotograma(t, firma) en cada una que tenga rótulo. */
function recorrer(video, alFotograma) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, [
      '-v', 'error', '-i', video,
      '-vf', `fps=${MUESTRAS_POR_SEGUNDO}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ]);
    const tam = W * H * 3;
    let pendiente = Buffer.alloc(0);
    let n = 0;
    ff.stdout.on('data', trozo => {
      pendiente = Buffer.concat([pendiente, trozo]);
      while (pendiente.length >= tam) {
        const fotograma = pendiente.subarray(0, tam);
        pendiente = pendiente.subarray(tam);
        const t = n / MUESTRAS_POR_SEGUNDO;
        n++;
        const firma = firmaRotulo(fotograma);
        if (firma) alFotograma(t, firma);
      }
    });
    ff.on('error', reject);
    ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg terminó con código ${code} al analizar ${video}`)));
  });
}

/**
 * Divide un vídeo en tramos según cambia el dígito del rótulo (cambio confirmado en 2 muestras).
 * Sirve para obtener las plantillas de los dígitos a partir de vídeos donde la división es limpia.
 */
export async function segmentar(video) {
  const tramos = [];
  let candidata = null;
  let tCandidata = 0;
  await recorrer(video, (t, firma) => {
    const actual = tramos[tramos.length - 1];
    if (actual && distancia(firma, actual.firma) < UMBRAL_CAMBIO) { candidata = null; return; }
    if (candidata && distancia(firma, candidata) < UMBRAL_CAMBIO) {
      tramos.push({ t: +tCandidata.toFixed(2), firma: candidata });
      candidata = null;
    } else {
      candidata = firma;
      tCandidata = t;
    }
  });
  return tramos;
}

/**
 * Plantillas de los dígitos 1…N: la firma de cada tramo de unos vídeos de referencia cuya división
 * coincide exactamente con su número de escenarios. referencias = [{ video, escenarios }].
 */
export async function plantillasDigitos(referencias) {
  const plantillas = {};
  for (const { video, escenarios } of referencias) {
    const tramos = await segmentar(video);
    if (tramos.length !== escenarios) {
      throw new Error(`${video} no sirve de referencia: ${tramos.length} tramos para ${escenarios} escenarios`);
    }
    tramos.forEach((tramo, i) => { plantillas[i + 1] ??= tramo.firma; });
  }
  return plantillas;
}

// Reconocimiento: el dígito más parecido, si lo es lo bastante y con margen claro sobre el segundo.
// Con el rótulo lateral sobre el velo de un modal, el dígito correcto queda en torno a 0,2–0,35 y el
// siguiente más parecido por encima de 0,5.
const MAXIMO_RECONOCER = 0.45;
const MARGEN_RECONOCER = 0.12;

/** Dígito más parecido a la firma, o null si ninguno destaca lo suficiente. */
function reconocerDigito(firma, plantillas) {
  const orden = Object.entries(plantillas)
    .map(([digito, plantilla]) => ({ digito: Number(digito), d: distancia(firma, plantilla) }))
    .sort((x, y) => x.d - y.d);
  const [primero, segundo] = orden;
  if (primero.d >= MAXIMO_RECONOCER) return null;
  if (segundo && segundo.d - primero.d < MARGEN_RECONOCER) return null;
  return primero.digito;
}

/**
 * Devuelve el segundo de inicio de cada escenario, en orden: el escenario k empieza la primera vez que
 * el rótulo muestra el dígito k en dos muestras seguidas, una vez visto el escenario k − 1.
 * @param {string} video ruta del MP4
 * @param {number} esperados número de escenarios del guion
 * @param {Record<number, Uint8Array>} plantillas firmas de los dígitos (véase plantillasDigitos)
 */
export async function detectarEscenarios(video, esperados, plantillas) {
  const inicios = [];
  let pendienteT = null;
  await recorrer(video, (t, firma) => {
    if (inicios.length >= esperados) return;
    const siguiente = inicios.length + 1;
    if (reconocerDigito(firma, plantillas) !== siguiente) { pendienteT = null; return; }
    if (pendienteT === null) { pendienteT = t; return; }
    inicios.push(+pendienteT.toFixed(2));
    pendienteT = null;
  });
  if (inicios.length !== esperados) {
    throw new Error(`${video}: se esperaban ${esperados} escenarios y se han reconocido ${inicios.length} (${inicios.join(', ')})`);
  }
  return inicios;
}
