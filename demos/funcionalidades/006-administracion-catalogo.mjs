// Demo 006 · Administración de productos y alertas de stock bajo
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

export default {
  archivo: '006-administracion-catalogo',
  intro: {
    etiqueta: '006 · Catálogo · Administración',
    titulo: 'Gestión del catálogo',
    descripcion: 'La administración <strong>da de alta categorías y piezas con sus variantes</strong>, ajusta existencias y recibe <strong>alertas de stock bajo</strong> antes de quedarse sin género. Solo el rol administrador entra en este panel.',
    escenarios: [
      'Crear una categoría',
      'Alta de una pieza con variantes',
      'Alerta de stock bajo',
      'Reponer existencias',
      'Categoría con piezas activas',
      'Sin rol de administrador no se entra'
    ]
  },

  async guion(demo) {
    await demo.iniciarSesion(ADMIN_EMAIL, ADMIN_PASSWORD);
    await demo.ir('/admin/catalogo', { esperar: 1500 });

    // 1. Categoría
    await demo.escenario(1, 'Crear una categoría',
      'Abrimos la gestión de categorías y creamos «Azulejos».');
    await demo.clic('#btn-toggle-seccion-categorias', { esperar: 1200 });
    await demo.escribir('#cat-nombre', 'Azulejos');
    await demo.escribir('#cat-desc', 'Azulejos pintados a mano con esmaltes tradicionales', { retardo: 25 });
    await demo.clic('#btn-crear-cat', { esperar: 1800 });
    await demo.narrar('La categoría aparece en la lista y ya se puede usar al dar de alta piezas.');

    // 2. Alta de producto
    await demo.escenario(2, 'Alta de una pieza con variantes',
      'Pulsamos «Añadir producto» y rellenamos la ficha de un azulejo artesanal.', { posicion: 'arriba' });
    await demo.clic('#btn-alta-producto-top', { esperar: 1400 });
    await demo.escribir('#prod-titulo', 'Azulejo de Talavera Pintado a Mano', { retardo: 30 });
    await demo.escribir('#prod-desc', 'Azulejo de 15 × 15 cm con motivos florales en azul cobalto y amarillo.', { retardo: 22 });
    const idCategoria = await demo.enPagina(texto =>
      [...document.querySelectorAll('#prod-categoria option')].find(o => o.textContent.includes(texto))?.value, 'Azulejos');
    await demo.elegir('#prod-categoria', idCategoria);
    await demo.escribir('#prod-artesano', 'Cerámica Ruiz de Luna', { retardo: 30 });
    await demo.escribir('#prod-precio', '18.50');
    await demo.narrar('Definimos una variante «Floral» con solo 2 unidades y aviso a partir de 3.', { posicion: 'arriba' });
    await demo.escribir('.variant-row[data-index="0"] .input-variant-nombre', 'Floral');
    await demo.escribir('.variant-row[data-index="0"] .input-variant-stock', '2');
    await demo.escribir('.variant-row[data-index="0"] .input-variant-umbral', '3');
    await demo.clic('#btn-submit-product', { esperar: 2400 });
    await demo.narrar('La pieza se publica en el catálogo con su variante y existencias.', { posicion: 'arriba' });

    // 3. Alerta
    await demo.escenario(3, 'Alerta de stock bajo',
      'Como quedan menos unidades que el umbral, el panel de alertas lo marca enseguida.');
    await demo.moverA('#stock-alerts-container');
    await demo.pausa(2500);

    // 4. Reponer
    await demo.escenario(4, 'Reponer existencias',
      'El taller fabrica 12 azulejos más. Ajustamos el stock de la variante «Floral».');
    demo.responderPrompt('14');
    await demo.clic('.btn-quick-stock[data-variant-name="Floral"]', { esperar: 2600 });
    await demo.narrar('Con 14 unidades la alerta desaparece y el catálogo muestra la pieza disponible.');

    // 5. Archivar categoría con piezas
    await demo.escenario(5, 'Categoría con piezas activas',
      'Intentamos archivar «Cerámica», que todavía tiene piezas a la venta.', { posicion: 'arriba' });
    await demo.clic('.btn-archivar-cat[data-nombre="Cerámica"]', { esperar: 3400 });
    // Confirmación y error llegan en diálogos nativos, que no se ven en el vídeo: se cita el aviso
    await demo.narrar(`La tienda lo impide para no dejar piezas sin categoría y avisa: «${demo.ultimoDialogo}»`, { posicion: 'arriba', leer: 7000 });

    // 6. Control de acceso
    await demo.cerrarSesion();
    await demo.escenario(6, 'Sin rol de administrador no se entra',
      'Sin sesión de administrador intentamos abrir el panel de catálogo directamente.');
    await demo.ir('/admin/catalogo', { esperar: 1800 });
    await demo.narrar('El acceso se bloquea: el panel solo está disponible para la administración.');
  }
};
