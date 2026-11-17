// Une los vídeos de cada funcionalidad (NNN-*.mp4) en videos/demo-completa.mp4, sin modificar los originales.
//   npm run unir
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(DIR, 'videos');
const salida = path.join(carpeta, 'demo-completa.mp4');

const videos = fs.readdirSync(carpeta)
  .filter(f => /^\d{3}-.+\.mp4$/.test(f))
  .sort();

if (videos.length === 0) {
  console.error('No hay vídeos que unir en demos/videos. Ejecute antes «npm run grabar».');
  process.exit(1);
}

// Lista para el demuxer «concat» de ffmpeg (rutas relativas a la propia lista)
const lista = path.join(carpeta, '.lista-demo-completa.txt');
fs.writeFileSync(lista, videos.map(v => `file '${v.replace(/'/g, "'\\''")}'`).join('\n') + '\n');

// Todas las demos se graban con el mismo códec, tamaño y fps: se pueden unir sin recodificar
const resultado = spawnSync(ffmpegPath, [
  '-y', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', lista,
  '-c', 'copy', '-movflags', '+faststart',
  salida
], { stdio: 'inherit' });

fs.rmSync(lista, { force: true });

if (resultado.status !== 0) {
  console.error('ffmpeg no pudo unir los vídeos.');
  process.exit(1);
}

console.log(`✔ ${path.relative(DIR, salida)} (${videos.length} vídeos: ${videos.join(', ')})`);
