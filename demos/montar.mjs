// Monta el sitio estático de la demo (demos/sitio/) a partir de los vídeos ya grabados en demos/videos/.
// No vuelve a grabar nada: copia los vídeos, los une en la demo completa, saca un póster de cada uno,
// localiza en cada vídeo el segundo en que empieza cada escenario y escribe datos.js.
//   npm run montar
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { plantillasDigitos, detectarEscenarios } from './lib/escenarios-video.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS = path.join(DIR, 'videos');
const SITIO = path.join(DIR, 'sitio');
const SITIO_VIDEO = path.join(SITIO, 'video');

// Vídeos cuya división en escenarios es limpia: de ellos salen las plantillas de los dígitos 1…6
const REFERENCIAS_DIGITOS = [
  { id: '001-catalogo-filtros', escenarios: 5 },
  { id: '006-administracion-catalogo', escenarios: 6 }
];

function ffmpeg(args) {
  const r = spawnSync(ffmpegPath, ['-v', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg falló (${args.join(' ')}): ${r.stderr}`);
  return r;
}

function duracion(video) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', video], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error(`No se pudo leer la duración de ${video}`);
  return +(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])).toFixed(2);
}

const ids = fs.readdirSync(VIDEOS).filter(f => /^\d{3}-.+\.mp4$/.test(f)).map(f => f.replace(/\.mp4$/, '')).sort();
if (ids.length === 0) {
  console.error('No hay vídeos en demos/videos. Ejecute antes «npm run grabar».');
  process.exit(1);
}
fs.mkdirSync(SITIO_VIDEO, { recursive: true });

console.log('Plantillas de los dígitos de «Escenario N»…');
const plantillas = await plantillasDigitos(
  REFERENCIAS_DIGITOS.map(r => ({ video: path.join(VIDEOS, `${r.id}.mp4`), escenarios: r.escenarios }))
);

const historias = [];
let inicio = 0;
for (const id of ids) {
  const { default: definicion } = await import(pathToFileURL(path.join(DIR, 'funcionalidades', `${id}.mjs`)).href);
  const { intro } = definicion;
  const origen = path.join(VIDEOS, `${id}.mp4`);
  const dur = duracion(origen);
  const tiempos = await detectarEscenarios(origen, intro.escenarios.length, plantillas);

  fs.copyFileSync(origen, path.join(SITIO_VIDEO, `${id}.mp4`));
  // Póster: la tarjeta de presentación con todos los escenarios ya visibles. La tarjeta dura
  // 2,6 s + 0,65 s por escenario + 3,8 s de lectura (lib/motor.mjs, tarjetaPresentacion)
  const posterT = Math.min(2.6 + intro.escenarios.length * 0.65 + 3, tiempos[0] - 1);
  ffmpeg(['-ss', posterT.toFixed(2), '-i', origen, '-frames:v', '1', '-q:v', '3', path.join(SITIO_VIDEO, `${id}.jpg`)]);

  const [codigo, grupo, rol] = intro.etiqueta.split(' · ');
  historias.push({
    id,
    spec: `${codigo} · ${grupo}`,
    titulo: intro.titulo,
    rol,
    historia: intro.descripcion.replace(/<(\/?)strong>/g, '<$1em>'),
    escenarios: intro.escenarios.map((titulo, i) => ({ titulo, t: tiempos[i] })),
    previstos: intro.escenarios,
    duracion: dur,
    inicio: +inicio.toFixed(2),
    video: `video/${id}.mp4`,
    poster: `video/${id}.jpg`
  });
  console.log(`✔ ${id}: ${tiempos.length} escenarios (${tiempos.join(', ')} s)`);
  inicio += dur;
}

// Demo completa: los vídeos seguidos, sin recodificar
const lista = path.join(SITIO_VIDEO, '.lista.txt');
fs.writeFileSync(lista, ids.map(id => `file '${id}.mp4'`).join('\n') + '\n');
ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', path.join(SITIO_VIDEO, 'demo-completa.mp4')]);
fs.rmSync(lista, { force: true });

const datos = {
  completa: 'video/demo-completa.mp4',
  duracion: +inicio.toFixed(2),
  historias,
  generado: new Date().toISOString()
};
fs.writeFileSync(path.join(SITIO, 'datos.js'), `window.DEMO = ${JSON.stringify(datos, null, 2)};\n`);
fs.copyFileSync(path.join(DIR, 'plantillas', 'sitio.html'), path.join(SITIO, 'index.html'));

console.log(`✔ Sitio en ${path.relative(DIR, SITIO)}/ (${historias.length} historias, ${Math.round(inicio)} s de demo). Abra sitio/index.html en el navegador.`);
