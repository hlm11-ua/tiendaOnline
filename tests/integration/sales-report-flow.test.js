import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../../backend/src/models/store.js';
import { Order, OrderLine } from '../../backend/src/models/order.model.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';
import { SalesReportService } from '../../backend/src/services/sales-report.service.js';

describe('Pruebas de Integración: Agregaciones de Ventas, Ranking Top 5 y Exportación CSV', () => {
  beforeEach(() => {
    store.reset();
  });

  it('debe calcular la facturación total y recuento exacto de pedidos cobrados (SC-003, FR-003)', async () => {
    const p1 = new Order({
      clienteNombre: 'Cliente 1',
      clienteEmail: 'c1@test.es',
      total: 100.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      fechaCreacion: new Date().toISOString(),
      lineas: [
        new OrderLine({ productoId: 'art-001', titulo: 'Jarrón', precioUnitario: 50, cantidad: 2, subtotal: 100 })
      ]
    });

    const p2 = new Order({
      clienteNombre: 'Cliente 2',
      clienteEmail: 'c2@test.es',
      total: 45.00,
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
      fechaCreacion: new Date().toISOString(),
      lineas: [
        new OrderLine({ productoId: 'art-003', titulo: 'Tabla', precioUnitario: 45, cantidad: 1, subtotal: 45 })
      ]
    });

    store.saveOrder(p1);
    store.saveOrder(p2);

    const report = SalesReportService.getSalesReport({ periodo: '30_dias' });
    assert.equal(report.resumen.recuentoPedidos, 2);
    assert.equal(report.resumen.facturacionTotal, 145.00);
    assert.ok(report.resumen.facturacionFormateada.includes('145,00'));
  });

  it('debe excluir rigurosamente pedidos pendientes o cancelados del cálculo (FR-006)', async () => {
    const cobrado = new Order({
      clienteNombre: 'Cobrado',
      clienteEmail: 'cobrado@test.es',
      total: 80.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      fechaCreacion: new Date().toISOString(),
      lineas: [
        new OrderLine({ productoId: 'art-001', titulo: 'Jarrón', precioUnitario: 80, cantidad: 1, subtotal: 80 })
      ]
    });

    const pendiente = new Order({
      clienteNombre: 'Pendiente',
      clienteEmail: 'pendiente@test.es',
      total: 500.00,
      estado: CONSTANTS.ORDER_STATUS.PENDING,
      fechaCreacion: new Date().toISOString(),
      lineas: [
        new OrderLine({ productoId: 'art-002', titulo: 'Manta', precioUnitario: 500, cantidad: 1, subtotal: 500 })
      ]
    });

    store.saveOrder(cobrado);
    store.saveOrder(pendiente);

    const report = SalesReportService.getSalesReport({ periodo: '30_dias' });
    assert.equal(report.resumen.recuentoPedidos, 1);
    assert.equal(report.resumen.facturacionTotal, 80.00);
  });

  it('debe generar el ranking Top 5 ordenado por unidades con desempate por facturación (FR-004)', async () => {
    // 6 productos distintos con diferentes cantidades y precios
    const lineas = [
      new OrderLine({ productoId: 'art-001', titulo: 'Jarrón Azul', precioUnitario: 10, cantidad: 10, subtotal: 100 }), // 10 uds, 100 €
      new OrderLine({ productoId: 'art-002', titulo: 'Manta Lana', precioUnitario: 80, cantidad: 5, subtotal: 400 }),    // 5 uds, 400 €
      new OrderLine({ productoId: 'art-003', titulo: 'Tabla Olivo', precioUnitario: 30, cantidad: 5, subtotal: 150 }),   // 5 uds, 150 € (empate en uds con art-002, pero menor €)
      new OrderLine({ productoId: 'art-004', titulo: 'Orfebrería', precioUnitario: 200, cantidad: 1, subtotal: 200 }),  // 1 ud, 200 €
      new OrderLine({ productoId: 'art-005', titulo: 'Tapiz Merina', precioUnitario: 60, cantidad: 3, subtotal: 180 }),  // 3 uds, 180 €
      new OrderLine({ productoId: 'art-006', titulo: 'Cesta Mimbre', precioUnitario: 20, cantidad: 2, subtotal: 40 })    // 2 uds, 40 € (debe quedar fuera del Top 5)
    ];

    const pedido = new Order({
      clienteNombre: 'Gran Comprador',
      clienteEmail: 'comprador@test.es',
      total: 1070.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      fechaCreacion: new Date().toISOString(),
      lineas
    });

    store.saveOrder(pedido);

    const report = SalesReportService.getSalesReport({ periodo: '30_dias' });
    const top = report.rankingTop5;

    // Límite máximo 5 elementos
    assert.equal(top.length, 5);

    // Posición 1: Jarrón (10 unidades)
    assert.equal(top[0].productoId, 'art-001');
    assert.equal(top[0].unidadesVendidas, 10);
    assert.equal(top[0].posicion, 1);

    // Posición 2 y 3 (empate a 5 unidades):
    // art-002 tiene 400 € vs art-003 con 150 € -> art-002 debe estar por delante
    assert.equal(top[1].productoId, 'art-002');
    assert.equal(top[1].facturacionTotal, 400);
    assert.equal(top[2].productoId, 'art-003');
    assert.equal(top[2].facturacionTotal, 150);

    // Posición 4: Tapiz (3 unidades)
    assert.equal(top[3].productoId, 'art-005');

    // Posición 5: Cesta (2 unidades) o Orfebrería (1 unidad)?
    // Cesta tiene 2 unidades, Orfebrería tiene 1 ud -> Cesta va antes por unidades
    assert.equal(top[4].productoId, 'art-006');
    assert.equal(top[4].unidadesVendidas, 2);
  });

  it('debe manejar períodos sin ventas sin arrojar errores (0,00 € y 0 pedidos)', async () => {
    const report = SalesReportService.getSalesReport({ periodo: '7_dias' });
    assert.equal(report.resumen.recuentoPedidos, 0);
    assert.equal(report.resumen.facturacionTotal, 0);
    assert.equal(report.resumen.facturacionFormateada, '0,00 €');
    assert.deepEqual(report.rankingTop5, []);

    const csv = SalesReportService.generateSalesCsv({ periodo: '7_dias' });
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)'));
    const lineasCsv = csv.trim().split('\n');
    assert.equal(lineasCsv.length, 1, 'Solo debe contener la línea de cabecera');
  });

  it('debe generar el archivo CSV con formato español compatible con Excel (FR-005)', async () => {
    const fechaTest = '2026-10-14T12:00:00.000Z';
    const pedido = new Order({
      codigoReferencia: 'PED-20261014-TEST',
      clienteNombre: 'Comprador Test',
      clienteEmail: 'test@example.com',
      total: 45.50,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      fechaCreacion: fechaTest,
      lineas: [
        new OrderLine({
          productoId: 'art-001',
          titulo: 'Jarrón de Cerámica Azul',
          precioUnitario: 45.50,
          cantidad: 1,
          subtotal: 45.50
        })
      ]
    });
    store.saveOrder(pedido);

    const csv = SalesReportService.generateSalesCsv({ periodo: '30_dias' });
    assert.ok(csv.startsWith('\uFEFF'), 'Debe tener BOM UTF-8');
    assert.ok(csv.includes(';'), 'Debe usar punto y coma como delimitador');
    assert.ok(csv.includes('45,50 €'), 'Debe formatear importes con coma decimal y símbolo euro');
    assert.ok(csv.includes('PED-20261014-TEST'));
    assert.ok(csv.includes('Jarrón de Cerámica Azul'));
  });
});
