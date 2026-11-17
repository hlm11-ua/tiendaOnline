// Demo 008 · Resumen de ventas y exportación de métricas
import { store } from '../../backend/src/models/store.js';
import { PRODUCTOS, crearPedido } from '../lib/datos.mjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

function fechaHaceDias(dias) {
  const fecha = new Date(Date.now() - dias * 86400000);
  return fecha.toISOString().slice(0, 10);
}

export default {
  archivo: '008-resumen-ventas',
  intro: {
    etiqueta: '008 · Ventas · Administración',
    titulo: 'Resumen de ventas',
    descripcion: 'La administración consulta <strong>facturación, pedidos y ticket medio</strong> del período que elija, el <strong>ranking de las 5 piezas más vendidas</strong> y exporta las transacciones a CSV para Excel.',
    escenarios: [
      'Cuadro de mando del último mes',
      'Las 5 piezas más vendidas',
      'Rango de fechas personalizado',
      'Exportar a CSV',
      'Período sin ventas',
      'Solo para la administración'
    ]
  },

  async preparar() {
    // Ventas ficticias repartidas en el último mes (solo cuentan los pedidos cobrados)
    const ventas = [
      ['Laura Gómez', 'pagado', [[PRODUCTOS.jarron, 2]], 2],
      ['Marcos Soto', 'entregado', [[PRODUCTOS.manta, 1]], 5],
      ['Elena Rivas', 'en_preparacion', [[PRODUCTOS.tabla, 3]], 8],
      ['Daniel Ruiz', 'salido_tienda', [[PRODUCTOS.jarron, 1], [PRODUCTOS.tabla, 1]], 12],
      ['Paula Soto', 'entregado', [[PRODUCTOS.cobre, 1]], 18],
      ['Javier Beltrán', 'entregado', [[PRODUCTOS.jarron, 3]], 26],
      ['Ana Torres', 'pendiente', [[PRODUCTOS.manta, 2]], 3]
    ];
    for (const [cliente, estado, lineas, diasAtras] of ventas) {
      crearPedido(store, { cliente, email: `${cliente.split(' ')[0].toLowerCase()}.demo@example.com`, estado, lineas, diasAtras });
    }
  },

  async guion(demo) {
    await demo.iniciarSesion(ADMIN_EMAIL, ADMIN_PASSWORD);
    await demo.ir('/admin/ventas', { esperar: 1800 });

    // 1. Último mes
    await demo.escenario(1, 'Cuadro de mando del último mes',
      'Por defecto el panel muestra el último mes: facturación bruta, pedidos cobrados y ticket medio.');
    await demo.moverA('#kpi-facturacion');
    await demo.narrar('Solo cuentan los pedidos cobrados: el pedido pendiente de pago no suma.');

    // 2. Ranking
    await demo.escenario(2, 'Las 5 piezas más vendidas',
      'Debajo, el ranking ordena las piezas por unidades vendidas en el período.', { posicion: 'arriba' });
    await demo.moverA('#tabla-ranking');
    await demo.pausa(2600);

    // 3. Rango personalizado
    await demo.escenario(3, 'Rango de fechas personalizado',
      'Elegimos «Personalizado» y consultamos solo la última semana.');
    await demo.clic('.btn-period[data-periodo="personalizado"]', { esperar: 1000 });
    await demo.fijarValor('#input-fecha-inicio', fechaHaceDias(7));
    await demo.fijarValor('#input-fecha-fin', fechaHaceDias(0));
    await demo.clic('#btn-aplicar-rango', { esperar: 1800 });
    await demo.narrar('Los indicadores y el ranking se recalculan para esas fechas.');

    // 4. CSV
    await demo.escenario(4, 'Exportar a CSV',
      'Pulsamos «Exportar a CSV» para descargar las transacciones del período.');
    await demo.clic('#btn-exportar-csv', { esperar: 1800 });
    await demo.narrar('El archivo usa punto y coma y euros con coma decimal, listo para abrir en Excel.');

    // 5. Sin ventas
    await demo.escenario(5, 'Período sin ventas',
      'Consultamos enero de 2020, cuando la tienda aún no vendía.');
    await demo.fijarValor('#input-fecha-inicio', '2020-01-01');
    await demo.fijarValor('#input-fecha-fin', '2020-01-31');
    await demo.clic('#btn-aplicar-rango', { esperar: 1800 });
    await demo.narrar('El panel muestra 0,00 €, 0 pedidos y un ranking vacío, sin errores.');

    // 6. Acceso
    await demo.cerrarSesion();
    await demo.escenario(6, 'Solo para la administración',
      'Sin sesión de administrador intentamos abrir los informes de ventas.');
    await demo.ir('/admin/ventas', { esperar: 1800 });
    await demo.narrar('El acceso se bloquea: las métricas de negocio solo las ve la administración.');
  }
};
