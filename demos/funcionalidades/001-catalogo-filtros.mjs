// Demo 001 · Catálogo de productos con filtros y sincronización de URL
export default {
  archivo: '001-catalogo-filtros',
  intro: {
    etiqueta: '001 · Catálogo · Visitantes',
    titulo: 'Catálogo con filtros',
    descripcion: 'Cualquier visitante <strong>explora las piezas por categoría</strong> y las acota por <strong>precio, taller y disponibilidad</strong>. Los filtros viajan en la dirección de la página, así que un enlace compartido muestra lo mismo.',
    escenarios: [
      'Navegar por categorías',
      'Filtrar por rango de precio',
      'Combinar taller y solo en stock',
      'Enlace compartido con filtros',
      'Sin resultados y restablecer filtros'
    ]
  },

  async guion(demo) {
    await demo.ir('/catalogo');

    // 1. Categorías
    await demo.escenario(1, 'Navegar por categorías',
      'El catálogo muestra todas las piezas artesanales. Elegimos la categoría Cerámica.', { posicion: 'abajo' });
    await demo.clic('button.category-chip::-p-text(Cerámica)', { esperar: 1400 });
    await demo.narrar('Solo quedan las piezas de cerámica, y la dirección de la página refleja la categoría elegida.');
    await demo.clic('button.category-chip::-p-text(Todas)', { esperar: 1200 });

    // 2. Rango de precio
    await demo.escenario(2, 'Filtrar por rango de precio',
      'Buscamos piezas entre 20 y 50 euros escribiendo el rango de precio.');
    await demo.escribir('#precio-min', '20');
    await demo.escribir('#precio-max', '50');
    await demo.pausa(1200);
    await demo.narrar('El listado se actualiza solo: quedan las piezas cuyo precio está dentro del rango.');

    // 3. Taller + stock
    await demo.escenario(3, 'Combinar taller y solo en stock',
      'Ahora quitamos el precio y combinamos un taller concreto con «solo productos en stock».');
    await demo.clic('#btn-reset-filters', { esperar: 1000 });
    await demo.elegir('#filtro-productor', 'Taller Hermanos Alfareros');
    await demo.clic('#filtro-stock', { esperar: 1400 });
    await demo.narrar('Todos los filtros se aplican a la vez: piezas de ese taller y con existencias.');

    // 4. URL compartida
    await demo.escenario(4, 'Enlace compartido con filtros',
      'Abrimos directamente un enlace con filtros en la dirección, como si nos lo hubieran compartido.');
    await demo.ir('/catalogo?categoria=textil&enStock=true', { esperar: 1500 });
    await demo.narrar('La página se abre con la categoría Textil y «solo en stock» ya marcados.');

    // 5. Estado vacío
    await demo.escenario(5, 'Sin resultados y restablecer filtros',
      'Pedimos piezas de más de 1.000 €: no hay ninguna.', { posicion: 'arriba' });
    await demo.escribir('#precio-min', '1000');
    await demo.pausa(1500);
    await demo.narrar('La tienda lo explica con un mensaje y ofrece restablecer los filtros.', { posicion: 'arriba' });
    await demo.clic('#btn-cta-reset', { esperar: 1500 });
    await demo.narrar('Con un clic vuelve el catálogo completo.', { posicion: 'arriba' });
  }
};
