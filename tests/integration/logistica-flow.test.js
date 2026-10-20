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

describe('Pruebas de Integración: Ciclo Logístico Completo de Envío y Notificación', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Flujo completo: pagado -> en preparación -> salido con tracking -> entregado', async () => {
    // 1. Pedido inicial formalizado tras cobro
    const pedido = new Order({
      clienteNombre: 'Elena Naranjo',
      clienteEmail: 'elena.naranjo@example.com',
      total: 89.50,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-logistica-001'
    });
    store.saveOrder(pedido);

    // 2. Transición a "en_preparacion"
    const resPreparar = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/preparar`, {
      method: 'POST'
    });
    assert.equal(resPreparar.status, 200);
    assert.equal(resPreparar.body.estado, 'en_preparacion');

    // 3. Despacho con transportista y tracking (SC-001, SC-002)
    const tInicio = Date.now();
    const resDespacho = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'GLS',
        numeroSeguimiento: 'GLS-ES-889900',
        notas: 'Frágil: cerámica de alta temperatura'
      })
    });
    const duracionMs = Date.now() - tInicio;

    assert.equal(resDespacho.status, 200);
    assert.equal(resDespacho.body.estado, 'salido_tienda');
    assert.ok(duracionMs < 1000, `El aviso automático debe emitirse en menos de 1 s (tardó ${duracionMs} ms)`);

    // Comprobar aviso emitido
    const resAvisos = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/avisos`);
    assert.equal(resAvisos.status, 200);
    assert.equal(resAvisos.body.avisos.length, 1);
    const aviso = resAvisos.body.avisos[0];
    assert.equal(aviso.tipo, 'salida_almacen');
    assert.equal(aviso.destinatarioEmail, 'elena.naranjo@example.com');
    assert.ok(aviso.cuerpoTexto.includes('GLS-ES-889900'));

    // 4. Confirmación de entrega por parte del comprador ("He recibido mi pedido")
    const resEntrega = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/entregar`, {
      method: 'POST',
      body: JSON.stringify({ origen: 'cliente' })
    });
    assert.equal(resEntrega.status, 200);
    assert.equal(resEntrega.body.estado, 'entregado');
    assert.ok(resEntrega.body.pedido.envio.fechaEntrega);

    // Comprobar estado final persistido en store
    const pedidoFinal = store.getOrderByCode(pedido.codigoReferencia);
    assert.equal(pedidoFinal.estado, 'entregado');
    assert.equal(pedidoFinal.avisosEnvio.length, 2); // Salida + Confirmación de entrega
  });

  it('Manejo de Erratas: rectificación de tracking antes de la entrega genera segundo aviso', async () => {
    const pedido = new Order({
      clienteNombre: 'Mario Santos',
      clienteEmail: 'mario.santos@example.com',
      total: 120.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-logistica-002'
    });
    store.saveOrder(pedido);

    // Preparar y despachar
    await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/preparar`, { method: 'POST' });
    await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/despachar`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'SEUR',
        numeroSeguimiento: 'SEUR-INCORRECTO-1'
      })
    });

    // Rectificar tracking
    const resRectificar = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/rectificar-tracking`, {
      method: 'POST',
      body: JSON.stringify({
        transportista: 'SEUR',
        numeroSeguimiento: 'SEUR-CORREGIDO-99',
        motivo: 'Etiqueta reimpresa por error tipográfico'
      })
    });

    assert.equal(resRectificar.status, 200);
    assert.equal(resRectificar.body.pedido.envio.numeroSeguimiento, 'SEUR-CORREGIDO-99');

    // Comprobar historial de avisos
    const resAvisos = await request(`/api/logistica/pedidos/${pedido.codigoReferencia}/avisos`);
    assert.equal(resAvisos.body.avisos.length, 2);
    assert.equal(resAvisos.body.avisos[1].tipo, 'rectificacion_tracking');
    assert.ok(resAvisos.body.avisos[1].cuerpoTexto.includes('SEUR-CORREGIDO-99'));
  });
});
