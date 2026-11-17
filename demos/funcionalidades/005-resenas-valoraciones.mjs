// Demo 005 · Valoraciones y comentarios de productos
import { store } from '../../backend/src/models/store.js';
import { PRODUCTOS, registrarCliente, crearPedido } from '../lib/datos.mjs';

// Cuentas ficticias de prueba para la demo
const ELENA = { nombre: 'Elena Rivas', email: 'elena.demo@example.com', password: 'DemoTienda2026' };
const PABLO = { nombre: 'Pablo Soto', email: 'pablo.demo@example.com', password: 'DemoTienda2026' };
const BOTON_OPINIONES = '.btn-open-reviews[data-product-id="art-001"]';

export default {
  archivo: '005-resenas-valoraciones',
  intro: {
    etiqueta: '005 · Valoraciones · Compradores',
    titulo: 'Reseñas verificadas',
    descripcion: 'Solo quien <strong>ha comprado la pieza</strong> puede valorarla, <strong>una única vez</strong>, con estrellas y comentario. Todo el mundo ve las opiniones y la nota media, que se recalcula al instante.',
    escenarios: [
      'Sin compra no se puede valorar',
      'Campos obligatorios y estrellas',
      'Publicar una reseña verificada',
      'Una sola valoración por pieza',
      'Opiniones visibles para todos'
    ]
  },

  async preparar({ base }) {
    const idElena = await registrarCliente(base, ELENA);
    await registrarCliente(base, PABLO);
    crearPedido(store, { cliente: ELENA.nombre, email: ELENA.email, cuentaId: idElena, estado: 'entregado', lineas: [[PRODUCTOS.jarron, 1]], diasAtras: 6 });
  },

  async guion(demo) {
    // 1. Sin compra
    await demo.iniciarSesion(PABLO.email, PABLO.password);
    await demo.ir('/catalogo');
    await demo.escenario(1, 'Sin compra no se puede valorar',
      'Pablo ha iniciado sesión pero nunca ha comprado el jarrón. Abre sus opiniones.');
    await demo.clic(BOTON_OPINIONES, { esperar: 1800 });
    await demo.narrar('Puede leer las opiniones, pero la tienda le explica que solo los compradores verificados pueden valorar.', { posicion: 'lado' });
    await demo.clic('#btn-cerrar-modal-resenas', { esperar: 800 });
    await demo.cerrarSesion();

    // 2. Validación
    await demo.iniciarSesion(ELENA.email, ELENA.password);
    await demo.ir('/catalogo');
    await demo.escenario(2, 'Campos obligatorios y estrellas',
      'Elena sí compró el jarrón. Intenta publicar sin elegir estrellas ni escribir comentario.', { posicion: 'lado' });
    await demo.clic(BOTON_OPINIONES, { esperar: 1800 });
    await demo.clic('#btn-submit-review', { esperar: 1600 });
    await demo.narrar('La tienda pide una puntuación de 1 a 5 estrellas y un comentario antes de publicar.');

    // 3. Publicar
    await demo.escenario(3, 'Publicar una reseña verificada',
      'Elena elige 5 estrellas y escribe su opinión.', { posicion: 'lado' });
    await demo.clic('label[for="star-5"]', { esperar: 600 });
    await demo.escribir('#review-comentario', 'Precioso esmalte azul y muy bien embalado. Se nota el trabajo hecho a mano.', { retardo: 30 });
    await demo.clic('#btn-submit-review', { esperar: 2200 });
    await demo.narrar('La reseña se publica con la etiqueta de compra verificada y la nota media se actualiza al momento.');

    // 4. Única valoración
    await demo.escenario(4, 'Una sola valoración por pieza',
      'Elena vuelve a abrir las opiniones del jarrón.', { posicion: 'lado' });
    await demo.clic('#btn-cerrar-modal-resenas', { esperar: 800 });
    await demo.clic(BOTON_OPINIONES, { esperar: 1800 });
    await demo.narrar('El formulario ya no aparece: cada comprador valora una pieza una sola vez.');
    await demo.clic('#btn-cerrar-modal-resenas', { esperar: 800 });
    await demo.cerrarSesion();

    // 5. Vista pública
    await demo.ir('/catalogo');
    await demo.escenario(5, 'Opiniones visibles para todos',
      'Un visitante sin sesión mira la tarjeta del jarrón: ya muestra la nota media.');
    await demo.moverA(BOTON_OPINIONES);
    await demo.clic(BOTON_OPINIONES, { esperar: 1800 });
    await demo.narrar('Cualquiera puede leer la reseña de Elena con su puntuación, fecha y sello de compra verificada.', { posicion: 'lado' });
  }
};
