import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order } from '../../backend/src/models/order.model.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';

async function request(path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const url = `http://127.0.0.1:${port}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

describe('Batería de Validación Automatizada de Escenarios de quickstart.md (Feature 007)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Escenario 1: Preparación y Empaquetado en el Taller avanza a "en_preparacion"', async () => {
    // 1. Pedido en estado pagado
    const pedido = new Order({
      clienteNombre: 'Ignacio Vega',
      clienteEmail: 'ignacio.vega@example.com',
      total: 45.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-qs-001'
    });
    store.saveOrder(pedido);

    // 2. Iniciar preparación
    const res = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/preparar`, {
      method: 'POST'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'en_preparacion');
    assert.equal(res.body.pedido.estado, 'en_preparacion');

    // Verificar en el listado de pedidos
    const resList = await request('/api/logistica/pedidos?estado=en_preparacion');
    assert.equal(resList.body.pedidos.length, 1);
    assert.equal(resList.body.pedidos[0].codigoReferencia, pedido.codigoReferencia);
  });

  it('Escenario 2: Despacho con Transportista, Código de Seguimiento y Aviso Automático (< 1s)', async () => {
    const pedido = new Order({
      clienteNombre: 'Lucía Blanco',
      clienteEmail: 'lucia.blanco@example.com',
      total: 140.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      transaccionId: 'tx-qs-002'
    });
    store.saveOrder(pedido);

    const tInicio = Date.now();
    const resDespacho = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'Correos de España',
        numeroSeguimiento: 'CORREOS-ES-998877',
        notas: 'Protección reforzada con papel kraft'
      })
    });
    const duracionMs = Date.now() - tInicio;

    assert.equal(resDespacho.status, 200);
    assert.equal(resDespacho.body.estado, 'salido_tienda');
    assert.equal(resDespacho.body.pedido.envio.transportista, 'Correos de España');
    assert.equal(resDespacho.body.pedido.envio.numeroSeguimiento, 'CORREOS-ES-998877');
    assert.ok(duracionMs < 1000, `Aviso generado en < 1s (duró ${duracionMs} ms)`);

    // Comprobar correo de notificación simulado
    const resAvisos = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/avisos`);
    assert.equal(resAvisos.status, 200);
    assert.equal(resAvisos.body.avisos.length, 1);
    const aviso = resAvisos.body.avisos[0];
    assert.equal(aviso.tipo, 'salida_almacen');
    assert.ok(aviso.asunto.includes(pedido.codigoReferencia));
    assert.ok(aviso.cuerpoTexto.includes('CORREOS-ES-998877'));
    assert.ok(aviso.cuerpoTexto.includes('Correos de España'));
  });

  it('Escenario 3: Rechazo de Despacho sin Transportista o con Código Inválido', async () => {
    const pedido = new Order({
      clienteNombre: 'Alberto Giménez',
      clienteEmail: 'alberto.gimenez@example.com',
      total: 28.50,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      transaccionId: 'tx-qs-003'
    });
    store.saveOrder(pedido);

    // Intento con código de solo 2 caracteres
    const resInvalido = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'SEUR',
        numeroSeguimiento: '12'
      })
    });

    assert.equal(resInvalido.status, 400);
    assert.equal(resInvalido.body.codigo, 'TRACKING_LONGITUD_INVALIDA');
    assert.ok(resInvalido.body.mensaje.includes('6 y 32 caracteres'));

    // Comprobar que el pedido NO cambió de estado
    const pedidoActual = store.getOrderByCode(pedido.codigoReferencia);
    assert.equal(pedidoActual.estado, 'en_preparacion');
    assert.equal(pedidoActual.avisosEnvio.length, 0);

    // Intento sin transportista
    const resSinTransportista = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: '',
        numeroSeguimiento: 'SEUR-ES-123456'
      })
    });

    assert.equal(resSinTransportista.status, 400);
    assert.equal(resSinTransportista.body.codigo, 'TRANSPORTISTA_REQUERIDO');
  });

  it('Escenario 4: Rectificación de Errata en el Código de Seguimiento', async () => {
    const pedido = new Order({
      clienteNombre: 'Sara Morales',
      clienteEmail: 'sara.morales@example.com',
      total: 220.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      transaccionId: 'tx-qs-004'
    });
    store.saveOrder(pedido);

    // Despacho inicial
    await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'Correos de España',
        numeroSeguimiento: 'CORREOS-ES-998877'
      })
    });

    // Rectificar tracking
    const resRect = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/rectificar-tracking`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'Correos de España',
        numeroSeguimiento: 'CORREOS-ES-998888',
        motivo: 'Sustitución por etiqueta dañada'
      })
    });

    assert.equal(resRect.status, 200);
    assert.equal(resRect.body.pedido.envio.numeroSeguimiento, 'CORREOS-ES-998888');
    assert.equal(resRect.body.pedido.envio.rectificaciones.length, 1);
    assert.equal(resRect.body.pedido.envio.rectificaciones[0].numeroAnterior, 'CORREOS-ES-998877');

    // Comprobar que se generó el segundo aviso de tipo rectificación
    const resAvisos = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/avisos`);
    assert.equal(resAvisos.body.avisos.length, 2);
    assert.equal(resAvisos.body.avisos[1].tipo, 'rectificacion_tracking');
    assert.ok(resAvisos.body.avisos[1].asunto.includes('Actualización de seguimiento'));
    assert.ok(resAvisos.body.avisos[1].cuerpoTexto.includes('CORREOS-ES-998888'));
  });

  it('Escenario 5: Confirmación de Entrega Definitiva (Doble Vía: Cliente y Administrador)', async () => {
    // Vía A: Confirmación por el comprador
    const pedidoCliente = new Order({
      clienteNombre: 'Daniel Ruiz',
      clienteEmail: 'daniel.ruiz@example.com',
      total: 50.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      transaccionId: 'tx-qs-005A'
    });
    store.saveOrder(pedidoCliente);

    await request(`/api/logistica/pedidos/${pedidoCliente.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'MRW',
        numeroSeguimiento: 'MRW-ES-112233'
      })
    });

    const resEntregaCliente = await request(`/api/logistica/pedidos/${pedidoCliente.codigoReferencia}/entregar`, {
      method: 'POST',
      body: JSON.stringify({ origen: 'cliente' })
    });

    assert.equal(resEntregaCliente.status, 200);
    assert.equal(resEntregaCliente.body.estado, 'entregado');
    assert.ok(resEntregaCliente.body.pedido.envio.fechaEntrega);

    // Vía B: Confirmación por el gestor de la tienda
    const pedidoAdmin = new Order({
      clienteNombre: 'Paula Soto',
      clienteEmail: 'paula.soto@example.com',
      total: 95.00,
      estado: CONSTANTS.ORDER_STATUS.IN_PREPARATION,
      transaccionId: 'tx-qs-005B'
    });
    store.saveOrder(pedidoAdmin);

    await request(`/api/logistica/pedidos/${pedidoAdmin.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'DHL Express',
        numeroSeguimiento: 'DHL-ES-445566'
      })
    });

    const resEntregaAdmin = await request(`/api/logistica/pedidos/${pedidoAdmin.codigoReferencia}/entregar`, {
      method: 'POST',
      body: JSON.stringify({ origen: 'admin' })
    });

    assert.equal(resEntregaAdmin.status, 200);
    assert.equal(resEntregaAdmin.body.estado, 'entregado');
    assert.ok(resEntregaAdmin.body.pedido.envio.fechaEntrega);
  });
});
