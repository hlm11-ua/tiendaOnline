// Graba un vídeo de demostración por funcionalidad.
//   npm run grabar            → todas las demos
//   npm run grabar -- 003 005 → solo las indicadas
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app } from '../backend/src/server.js';
import { store } from '../backend/src/models/store.js';
import { grabarDemo } from './lib/motor.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const carpetaGuiones = path.join(DIR, 'funcionalidades');
const carpetaSalida = path.join(DIR, 'videos');
fs.mkdirSync(carpetaSalida, { recursive: true });

const filtros = process.argv.slice(2);
const guiones = fs.readdirSync(carpetaGuiones)
  .filter(f => f.endsWith('.mjs'))
  .filter(f => filtros.length === 0 || filtros.some(id => f.startsWith(id)))
  .sort();

if (guiones.length === 0) {
  console.error('No hay guiones que coincidan con', filtros.join(', '));
  process.exit(1);
}

const servidor = app.listen(0, '127.0.0.1');
await new Promise(r => servidor.once('listening', r));
const base = `http://127.0.0.1:${servidor.address().port}`;
console.log(`Tienda de demostración en ${base}`);

let fallos = 0;
for (const archivo of guiones) {
  const { default: definicion } = await import(pathToFileURL(path.join(carpetaGuiones, archivo)).href);
  console.log(`▶ ${definicion.archivo}`);
  const inicio = Date.now();
  try {
    const { salida, segundos } = await grabarDemo(definicion, {
      base,
      carpetaSalida,
      // Cada demo arranca con la tienda recién sembrada y sus propios datos de partida
      alPrepararDatos: async () => {
        store.reset();
        await definicion.preparar?.({ store, base });
      }
    });
    console.log(`  ✔ ${path.relative(DIR, salida)} (${segundos.toFixed(1)} s de vídeo, ${((Date.now() - inicio) / 1000).toFixed(0)} s de grabación)`);
  } catch (err) {
    fallos++;
    console.error(`  ✖ ${definicion.archivo}: ${err.stack || err.message}`);
  }
}

servidor.closeAllConnections();
servidor.close();
process.exit(fallos ? 1 : 0);
