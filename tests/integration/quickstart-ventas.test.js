import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order, OrderLine } from '../../backend/src/models/order.model.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';

// Helper ligero para peticiones HTTP
async function request(path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const url = `http://127.0.0.1:${port}${path}`;
    const start = performance.now();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {})
      }
    });
    const durationMs = performance.now() - start;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = buffer.toString('utf-8');
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return {
      status: res.status,
      headers: res.headers,
      body,
      rawBuffer: buffer,
      durationMs
    };
  } finally {
    server.close();
  }
}

describe('Batería de Validación Automatizada de Escenarios de quickstart.md (Feature 008)', () => {
  beforeEach(() => {
    store.reset();

    // Cargar 3 pedidos cobrados en distintas fechas para pruebas
    const p1 = new Order({
      codigoReferencia: 'PED-20261014-001',
      clienteNombre: 'Laura Gómez',
      clienteEmail: 'laura@example.com',
      total: 90.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      fechaCreacion: '2026-10-14T10:00:00.000Z',
      lineas: [
        new OrderLine({ productoId: 'art-001', titulo: 'Jarrón de Cerámica Azul', precioUnitario: 45.00, cantidad: 2, subtotal: 90.00 })
      ]
    });

    const p2 = new Order({
      codigoReferencia: 'PED-20261014-002',
      clienteNombre: 'Marcos Soto',
      clienteEmail: 'marcos@example.com',
      total: 140.00,
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
      fechaCreacion: '2026-10-15T15:30:00.000Z',
      lineas: [
        new OrderLine({ productoId: 'art-002', titulo: 'Manta de Lana Merina', precioUnitario: 140.00, cantidad: 1, subtotal: 140.00 })
      ]
    });

    const p3 = new Order({
      codigoReferencia: 'PED-20261014-003',
      clienteNombre: 'Elena Rivas',
      clienteEmail: 'elena@example.com',
      total: 57.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      fechaCreacion: '2026-10-16T12:00:00.000Z',
      lineas: [
        new OrderLine({ productoId: 'art-003', titulo: 'Tabla de Corte en Madera', precioUnitario: 28.50, cantidad: 2, subtotal: 57.00 })
      ]
    });

    store.saveOrder(p1);
    store.saveOrder(p2);
    store.saveOrder(p3);
  });

  it('Escenario 1: Consulta del Cuadro de Mando por Período Predefinido (Último Mes) (SC-001, SC-003)', async () => {
    const res = await request('/api/admin/ventas/resumen?periodo=30_dias', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    // Verificación de rendimiento SC-001: cálculo y respuesta en < 1 segundo (1000 ms)
    assert.ok(res.durationMs < 1000, `El cálculo tardó ${res.durationMs.toFixed(2)} ms (debe ser < 1000 ms)`);

    const { resumen } = res.body;
    assert.equal(resumen.recuentoPedidos, 3);
    // Exactitud contable SC-003: 90 + 140 + 57 = 287 €
    assert.equal(resumen.facturacionTotal, 287.00);
    assert.ok(resumen.facturacionFormateada.includes('287,00'));
    assert.ok(resumen.facturacionFormateada.includes('€'));
  });

  it('Escenario 2: Verificación del Ranking Top 5 de Artículos Más Vendidos (FR-004)', async () => {
    const res = await request('/api/admin/ventas/resumen?periodo=30_dias', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    const { rankingTop5 } = res.body;

    assert.ok(rankingTop5.length <= 5);
    // art-001 (2 uds, 90 €) y art-003 (2 uds, 57 €) empatan a 2 uds. art-001 debe ser 1º por facturación (90 > 57)
    assert.equal(rankingTop5[0].productoId, 'art-001');
    assert.equal(rankingTop5[0].posicion, 1);
    assert.equal(rankingTop5[0].unidadesVendidas, 2);
    assert.equal(rankingTop5[0].facturacionTotal, 90.00);

    assert.equal(rankingTop5[1].productoId, 'art-003');
    assert.equal(rankingTop5[1].posicion, 2);
    assert.equal(rankingTop5[1].unidadesVendidas, 2);

    assert.equal(rankingTop5[2].productoId, 'art-002');
    assert.equal(rankingTop5[2].posicion, 3);
    assert.equal(rankingTop5[2].unidadesVendidas, 1);
  });

  it('Escenario 3: Filtrado por Rango Personalizado de Fechas (FR-002)', async () => {
    // Filtrar únicamente el día 2026-10-14 (solo pedido p1)
    const res = await request('/api/admin/ventas/resumen?periodo=personalizado&fechaInicio=2026-10-14&fechaFin=2026-10-14', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    const { resumen, rankingTop5 } = res.body;

    assert.equal(resumen.recuentoPedidos, 1);
    assert.equal(resumen.facturacionTotal, 90.00);
    assert.equal(rankingTop5.length, 1);
    assert.equal(rankingTop5[0].productoId, 'art-001');
  });

  it('Escenario 4: Descarga y Verificación del Archivo CSV Exportable (SC-002, FR-005)', async () => {
    const res = await request('/api/admin/ventas/exportar?periodo=30_dias', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    // Rendimiento SC-002: inicio descarga en < 2 segundos
    assert.ok(res.durationMs < 2000, `La exportación tardó ${res.durationMs.toFixed(2)} ms (debe ser < 2000 ms)`);

    // Codificación UTF-8 con BOM
    const isBom = res.rawBuffer[0] === 0xEF && res.rawBuffer[1] === 0xBB && res.rawBuffer[2] === 0xBF;
    assert.ok(isBom, 'El archivo descargado debe incluir BOM UTF-8');

    const csvText = res.body;
    const lineas = csvText.trim().split('\n');
    // Cabecera + 3 líneas de transacciones = 4 líneas
    assert.equal(lineas.length, 4);

    const cabecera = lineas[0].replace('\uFEFF', '');
    assert.equal(cabecera, 'Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)');

    // Separador y coma decimal
    assert.ok(lineas[1].includes(';'));
    assert.ok(csvText.includes('PED-20261014-001'));
    assert.ok(csvText.includes('PED-20261014-002'));
    assert.ok(csvText.includes('PED-20261014-003'));
    assert.ok(csvText.includes('90,00 €'));
    assert.ok(csvText.includes('140,00 €'));
    assert.ok(csvText.includes('57,00 €'));
  });

  it('Escenario 5: Consulta y Exportación de un Período sin Ventas (Acceptance Scenario 3)', async () => {
    const res = await request('/api/admin/ventas/resumen?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.resumen.recuentoPedidos, 0);
    assert.equal(res.body.resumen.facturacionTotal, 0);
    assert.equal(res.body.resumen.facturacionFormateada, '0,00 €');
    assert.deepEqual(res.body.rankingTop5, []);

    const resCsv = await request('/api/admin/ventas/exportar?periodo=personalizado&fechaInicio=2020-01-01&fechaFin=2020-01-31', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(resCsv.status, 200);
    const lineasCsv = resCsv.body.trim().split('\n');
    assert.equal(lineasCsv.length, 1, 'Debe devolver únicamente la cabecera formateada');
    assert.ok(lineasCsv[0].includes('Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)'));
  });

  it('Escenario 6: Control de Acceso por Rol de Usuario (FR-001)', async () => {
    const resResumen = await request('/api/admin/ventas/resumen', {
      headers: { 'x-user-role': 'cliente' }
    });
    assert.equal(resResumen.status, 403);
    assert.ok(resResumen.body.mensaje.includes('administrador'));

    const resExport = await request('/api/admin/ventas/exportar', {
      headers: { 'x-user-role': 'cliente' }
    });
    assert.equal(resExport.status, 403);
    assert.ok(resExport.body.mensaje.includes('administrador'));
  });
});
