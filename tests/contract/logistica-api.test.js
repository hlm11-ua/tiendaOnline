import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order } from '../../backend/src/models/order.model.js';
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
        'Content-Type': 'application/json',
        // Rutas operativas del taller protegidas por rol admin (hardening F1)
        'x-user-role': 'admin',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return {
      status: res.status,
      headers: res.headers,
      body
    };
  } finally {
    server.close();
  }
}

describe('Contratos de API Logística (/api/logistica)', () => {
  let pedidoPrueba;

  beforeEach(() => {
    store.reset();
    pedidoPrueba = new Order({
      clienteNombre: 'Carmen Romero',
      clienteEmail: 'carmen.romero@example.com',
      total: 45.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-test-001'
    });
    store.saveOrder(pedidoPrueba);
  });

  describe('GET /api/logistica/transportistas', () => {
    it('debe devolver la lista de transportistas habituales en España (200)', async () => {
      const res = await request('/api/logistica/transportistas');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.transportistas));
      assert.ok(res.body.transportistas.includes('Correos de España'));
      assert.ok(res.body.transportistas.includes('SEUR'));
      assert.ok(res.body.transportistas.includes('Otro'));
    });
  });

  describe('GET /api/logistica/pedidos', () => {
    it('debe listar los pedidos del taller logístico con filtro opcional por estado (200)', async () => {
      const res = await request('/api/logistica/pedidos?estado=pagado');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.pedidos));
      assert.equal(res.body.pedidos.length, 1);
      assert.equal(res.body.pedidos[0].codigoReferencia, pedidoPrueba.codigoReferencia);
      assert.equal(res.body.pedidos[0].estado, 'pagado');
    });

    it('debe ordenar el listado por estado del flujo y, dentro de cada estado, por fecha más reciente (200, FR-001)', async () => {
      const crear = (estado, fechaCreacion, transaccionId) => {
        const pedido = new Order({
          clienteNombre: 'Cliente Orden',
          clienteEmail: 'orden@example.com',
          total: 10.00,
          estado,
          fechaCreacion,
          transaccionId
        });
        store.saveOrder(pedido);
        return pedido.codigoReferencia;
      };

      // pedidoPrueba (pagado) se crea en beforeEach con la fecha actual
      const entregado = crear(CONSTANTS.ORDER_STATUS.DELIVERED, '2026-11-15T10:00:00.000Z', 'tx-ord-1');
      const salido = crear(CONSTANTS.ORDER_STATUS.SHIPPED, '2026-11-14T10:00:00.000Z', 'tx-ord-2');
      const preparacionAntiguo = crear(CONSTANTS.ORDER_STATUS.IN_PREPARATION, '2026-11-01T10:00:00.000Z', 'tx-ord-3');
      const preparacionReciente = crear(CONSTANTS.ORDER_STATUS.IN_PREPARATION, '2026-11-10T10:00:00.000Z', 'tx-ord-4');
      const pagadoAntiguo = crear(CONSTANTS.ORDER_STATUS.PAID, '2026-10-20T10:00:00.000Z', 'tx-ord-5');

      const res = await request('/api/logistica/pedidos');
      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.pedidos.map(p => p.codigoReferencia),
        [
          pedidoPrueba.codigoReferencia,
          pagadoAntiguo,
          preparacionReciente,
          preparacionAntiguo,
          salido,
          entregado
        ]
      );
    });

    it('debe devolver lista vacía si ningún pedido coincide con el filtro de estado (200)', async () => {
      const res = await request('/api/logistica/pedidos?estado=entregado');
      assert.equal(res.status, 200);
      assert.equal(res.body.pedidos.length, 0);
    });
  });

  describe('POST /api/logistica/pedidos/:codigoReferencia/preparar', () => {
    it('debe avanzar el pedido a "en_preparacion" al iniciar el empaquetado (200)', async () => {
      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, {
        method: 'POST'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.estado, 'en_preparacion');
      assert.equal(res.body.pedido.estado, 'en_preparacion');
    });

    it('debe rechazar preparar un pedido inexistente (404)', async () => {
      const res = await request('/api/logistica/pedidos/PED-INEXISTENTE/preparar', {
        method: 'POST'
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.codigo, 'PEDIDO_NO_ENCONTRADO');
    });
  });

  describe('POST /api/logistica/pedidos/:codigoReferencia/despachar', () => {
    it('debe despachar el pedido con transportista y tracking válidos y generar aviso (200)', async () => {
      // Primero avanzamos a preparación
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'Correos de España',
          numeroSeguimiento: 'CORREOS-ES-123456',
          notas: 'Embalaje protegido con papel kraft'
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.estado, 'salido_tienda');
      assert.equal(res.body.pedido.envio.transportista, 'Correos de España');
      assert.equal(res.body.pedido.envio.numeroSeguimiento, 'CORREOS-ES-123456');
      assert.ok(res.body.aviso, 'Debe devolver el aviso automático de salida generado');
      assert.equal(res.body.aviso.tipo, 'salida_almacen');
    });

    it('debe rechazar despachar un pedido "pagado" que no ha pasado por "en preparación" (400, FR-002)', async () => {
      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'Correos de España',
          numeroSeguimiento: 'CORREOS-ES-123456'
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'TRANSICION_ESTADO_INVALIDA');
      assert.equal(store.getOrderByCode(pedidoPrueba.codigoReferencia).estado, 'pagado');
      assert.equal(store.getOrderNotifications(pedidoPrueba.codigoReferencia).length, 0);
    });

    it('debe rechazar despachos con código de seguimiento menor a 6 caracteres (400)', async () => {
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'SEUR',
          numeroSeguimiento: '123'
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'TRACKING_LONGITUD_INVALIDA');
    });

    it('debe rechazar despachos sin seleccionar empresa de transporte (400)', async () => {
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: '',
          numeroSeguimiento: 'SEUR-998877'
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'TRANSPORTISTA_REQUERIDO');
    });
  });

  describe('POST /api/logistica/pedidos/:codigoReferencia/rectificar-tracking', () => {
    it('debe permitir rectificar erratas en el código y generar aviso de rectificación (200)', async () => {
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'SEUR',
          numeroSeguimiento: 'SEUR-ERRONEO-11'
        })
      });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/rectificar-tracking`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'SEUR',
          numeroSeguimiento: 'SEUR-CORRECTO-22',
          motivo: 'Corrección de etiqueta dañada'
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.pedido.envio.numeroSeguimiento, 'SEUR-CORRECTO-22');
      assert.ok(res.body.avisoRectificacion);
      assert.equal(res.body.avisoRectificacion.tipo, 'rectificacion_tracking');
    });
  });

  describe('POST /api/logistica/pedidos/:codigoReferencia/entregar', () => {
    it('debe marcar el pedido como entregado tanto si el origen es admin como cliente (200)', async () => {
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'MRW',
          numeroSeguimiento: 'MRW-ES-554433'
        })
      });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/entregar`, {
        method: 'POST',
        body: JSON.stringify({ origen: 'cliente' })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.estado, 'entregado');
      assert.equal(res.body.pedido.estado, 'entregado');
      assert.ok(res.body.pedido.envio.fechaEntrega);
    });

    it('debe rechazar entregar un pedido que no ha salido de la tienda (400)', async () => {
      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/entregar`, {
        method: 'POST',
        body: JSON.stringify({ origen: 'admin' })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'TRANSICION_ESTADO_INVALIDA');
    });
  });

  describe('GET /api/logistica/pedidos/:codigoReferencia/avisos', () => {
    it('debe devolver el registro de avisos y correos emitidos para inspección observable (200)', async () => {
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/preparar`, { method: 'POST' });
      await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/despachar`, {
        method: 'POST',
        body: JSON.stringify({
          transportista: 'Correos de España',
          numeroSeguimiento: 'CORREOS-ES-776655'
        })
      });

      const res = await request(`/api/logistica/pedidos/${pedidoPrueba.codigoReferencia}/avisos`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.avisos));
      assert.equal(res.body.avisos.length, 1);
      assert.equal(res.body.avisos[0].numeroSeguimiento, 'CORREOS-ES-776655');
    });
  });
});
