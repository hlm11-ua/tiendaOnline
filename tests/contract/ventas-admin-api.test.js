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
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {})
      }
    });
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
      rawBuffer: buffer
    };
  } finally {
    server.close();
  }
}

describe('Contratos de API de Ventas y Exportación (/api/admin/ventas)', () => {
  beforeEach(() => {
    store.reset();

    // Crear pedido de prueba confirmado y cobrado
    const pedido = new Order({
      clienteNombre: 'María García',
      clienteEmail: 'maria.garcia@example.com',
      total: 90.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-ventas-001',
      fechaCreacion: new Date().toISOString(),
      lineas: [
        new OrderLine({
          productoId: 'art-001',
          titulo: 'Jarrón de Cerámica Esmaltada Azul',
          precioUnitario: 45.00,
          cantidad: 2,
          subtotal: 90.00
        })
      ]
    });
    store.saveOrder(pedido);
  });

  describe('Control de Acceso (FR-001)', () => {
    it('debe denegar acceso (403) a /resumen sin rol de administrador', async () => {
      const res = await request('/api/admin/ventas/resumen', {
        headers: { 'x-user-role': 'cliente' }
      });
      assert.equal(res.status, 403);
      assert.ok(res.body.mensaje.includes('administrador'));
    });

    it('debe denegar acceso (403) a /exportar sin rol de administrador', async () => {
      const res = await request('/api/admin/ventas/exportar', {
        headers: { 'x-user-role': 'cliente' }
      });
      assert.equal(res.status, 403);
      assert.ok(res.body.mensaje.includes('administrador'));
    });
  });

  describe('GET /api/admin/ventas/resumen', () => {
    it('debe devolver 200 con el esquema de resumen y ranking para el último mes por defecto', async () => {
      const res = await request('/api/admin/ventas/resumen', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.resumen);
      assert.ok(res.body.rankingTop5);
      assert.equal(typeof res.body.resumen.facturacionTotal, 'number');
      assert.equal(typeof res.body.resumen.facturacionFormateada, 'string');
      assert.ok(res.body.resumen.facturacionFormateada.includes('€'));
      assert.equal(typeof res.body.resumen.recuentoPedidos, 'number');
      assert.ok(Array.isArray(res.body.rankingTop5));
    });

    it('debe admitir el filtro de 7 días (200)', async () => {
      const res = await request('/api/admin/ventas/resumen?periodo=7_dias', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.resumen.periodoEtiqueta.includes('7 días'));
    });

    it('debe admitir el filtro de 1 año (200)', async () => {
      const res = await request('/api/admin/ventas/resumen?periodo=1_ano', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.resumen.periodoEtiqueta.includes('año'));
    });

    it('debe admitir un rango de fechas personalizado válido (200)', async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      const res = await request(`/api/admin/ventas/resumen?periodo=personalizado&fechaInicio=${hoy}&fechaFin=${hoy}`, {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.resumen.recuentoPedidos, 1);
      assert.equal(res.body.resumen.facturacionTotal, 90.00);
    });

    it('debe rechazar rango personalizado sin fechaInicio o fechaFin (400)', async () => {
      const res = await request('/api/admin/ventas/resumen?periodo=personalizado', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.mensaje);
    });

    it('debe rechazar rango personalizado con fechaInicio posterior a fechaFin (400)', async () => {
      const res = await request('/api/admin/ventas/resumen?periodo=personalizado&fechaInicio=2026-10-20&fechaFin=2026-10-10', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.mensaje);
    });

    it('debe rechazar un valor de período no reconocido (400)', async () => {
      const res = await request('/api/admin/ventas/resumen?periodo=invalido', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 400);
    });
  });

  describe('GET /api/admin/ventas/exportar', () => {
    it('debe generar y descargar el archivo CSV con cabeceras y codificación apropiadas (200)', async () => {
      const res = await request('/api/admin/ventas/exportar?periodo=30_dias', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      const contentType = res.headers.get('content-type') || '';
      const disposition = res.headers.get('content-disposition') || '';

      assert.ok(contentType.includes('text/csv'));
      assert.ok(contentType.includes('charset=utf-8'));
      assert.ok(disposition.includes('attachment'));
      assert.ok(disposition.includes('.csv'));

      // Verificar cabecera CSV delimitada por ';' y contenido con BOM UTF-8
      const isBom = res.rawBuffer[0] === 0xEF && res.rawBuffer[1] === 0xBB && res.rawBuffer[2] === 0xBF;
      assert.ok(isBom, 'Debe incluir BOM UTF-8');
      const text = res.body;
      assert.ok(text.includes('Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)'));
      assert.ok(text.includes('Jarrón de Cerámica Esmaltada Azul'));
      assert.ok(text.includes('90,00 €'));
    });
  });
});
