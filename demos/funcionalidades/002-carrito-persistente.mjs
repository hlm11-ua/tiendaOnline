// Demo 002 · Carrito de compras persistente con control de stock
import { store } from '../../backend/src/models/store.js';

export default {
  archivo: '002-carrito-persistente',
  intro: {
    etiqueta: '002 · Cesta · Compradores',
    titulo: 'Cesta persistente',
    descripcion: 'La cesta <strong>guarda las piezas aunque se cierre el navegador</strong> y comprueba en todo momento <strong>las existencias y el precio vigente</strong>, avisando de cualquier cambio antes de pagar.',
    escenarios: [
      'Añadir piezas y ver el total',
      'Límite por existencias',
      'La cesta se conserva al volver',
      'Otra persona compra a la vez',
      'El taller cambia un precio',
      'Vaciar la cesta'
    ]
  },

  async guion(demo) {
    // 1. Añadir y totales
    await demo.ir('/catalogo');
    await demo.escenario(1, 'Añadir piezas y ver el total',
      'Desde el catálogo pulsamos «Comprar» en el jarrón de cerámica.');
    await demo.clic('a[href="/carrito?anadirProducto=art-001"]', { navega: true, esperar: 1500 });
    await demo.narrar('El jarrón ya está en la cesta. Añadimos también la tabla de olivo.');
    await demo.ir('/carrito?anadirProducto=art-003', { esperar: 1500 });
    await demo.moverA('#cart-total');
    await demo.narrar('El resumen suma los artículos en euros y el envío estimado es gratuito.');

    // 2. Límite de stock
    await demo.escenario(2, 'Límite por existencias',
      'Subimos la cantidad del jarrón: solo quedan 5 unidades en el taller.');
    for (let i = 0; i < 5; i++) {
      await demo.clic('.cart-btn-mas[data-variante-id="var-001-azul"]', { esperar: 650 });
    }
    await demo.narrar('Al llegar a 5 la cesta no deja añadir más: nunca se piden más piezas de las que existen.');

    // 3. Persistencia
    await demo.escenario(3, 'La cesta se conserva al volver',
      'Salimos de la tienda y volvemos más tarde, sin haber iniciado sesión.');
    await demo.ir('/catalogo', { esperar: 1200 });
    await demo.clic('a.site-header__link[href="/carrito"]', { navega: true, esperar: 1500 });
    await demo.narrar('Las piezas y las cantidades siguen ahí: la cesta se guarda en el propio navegador.');

    // 4. Compra concurrente
    await demo.escenario(4, 'Otra persona compra a la vez',
      'Mientras tanto, otra clienta reserva 4 jarrones en su pago. Recargamos la cesta.');
    store.addReservation({ sesionPagoId: 'demo-compra-simultanea', varianteId: 'var-001-azul', cantidad: 4 });
    await demo.ir('/carrito', { esperar: 1800 });
    await demo.moverA('#cart-avisos-panel');
    await demo.narrar('La cesta detecta que solo queda 1 jarrón, reajusta la cantidad y lo explica con un aviso.');

    // 5. Cambio de precio
    await demo.escenario(5, 'El taller cambia un precio',
      'El taller sube el precio de la tabla de olivo de 28,50 € a 32,00 €.');
    store.products.get('art-003').precioBase = 32.00;
    await demo.ir('/carrito', { esperar: 1800 });
    await demo.moverA('#cart-avisos-panel');
    await demo.narrar('Al volver, la cesta aplica el precio vigente y avisa del cambio antes de pagar.');

    // 6. Vaciar
    await demo.escenario(6, 'Vaciar la cesta',
      'Pulsamos «Vaciar carrito» y confirmamos.', { posicion: 'arriba' });
    await demo.clic('#btn-vaciar-carrito', { esperar: 2200 });
    await demo.narrar('La cesta queda vacía y sugiere piezas con existencias para seguir comprando.', { posicion: 'arriba' });
    await demo.desplazar(400);
    await demo.pausa(1500);
  }
};
