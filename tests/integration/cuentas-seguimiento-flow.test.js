import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order, OrderLine } from '../../backend/src/models/order.model.js';
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

describe('Flujo de Integración: Cuentas de Usuario y Fases de Pedido (Feature 004)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Flujo completo: registro -> login persistente -> consulta historial -> avance fase con tracking -> aislamiento IDOR', async () => {
    // 1. Validación de contraseña corta (< 8 caracteres)
    const resCorta = await request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Elena Artesana',
        email: 'elena@artesania.es',
        password: 'corta'
      })
    });
    assert.strictEqual(resCorta.status, 400);
    assert.strictEqual(resCorta.body.codigo, 'CONTRASENA_CORTA');

    // 2. Registro exitoso de Elena
    const resRegistro = await request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Elena Artesana',
        email: 'elena@artesania.es',
        password: 'passwordSeguro123'
      })
    });
    assert.strictEqual(resRegistro.status, 201);
    const elenaCuentaId = resRegistro.body.usuario.id;
    let tokenElena = resRegistro.body.sesion.token;
    assert.ok(tokenElena);

    // 3. Intento de registro con email duplicado
    const resDuplicado = await request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Elena Clon',
        email: 'elena@artesania.es',
        password: 'passwordSeguro123'
      })
    });
    assert.strictEqual(resDuplicado.status, 409);
    assert.strictEqual(resDuplicado.body.codigo, 'EMAIL_DUPLICADO');

    // 4. Login persistente con credenciales correctas
    const resLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'elena@artesania.es',
        password: 'passwordSeguro123'
      })
    });
    assert.strictEqual(resLogin.status, 200);
    tokenElena = resLogin.body.sesion.token;

    // 5. Creación de un pedido formalizado vinculado a la cuenta de Elena
    const pedidoElena = new Order({
      clienteNombre: 'Elena Artesana',
      clienteEmail: 'elena@artesania.es',
      cuentaId: elenaCuentaId,
      total: 55.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-test-flow-001',
      lineas: [
        new OrderLine({
          titulo: 'Cuenco de Barro Cocido',
          precioUnitario: 55.00,
          cantidad: 1,
          subtotal: 55.00
        })
      ]
    });
    store.saveOrder(pedidoElena);
    const codigoReferencia = pedidoElena.codigoReferencia;

    // 6. Elena consulta su historial en "Mis compras"
    const resHistorial = await request('/api/pedidos/mis-compras', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenElena}`
      }
    });
    assert.strictEqual(resHistorial.status, 200);
    assert.strictEqual(resHistorial.body.total, 1);
    assert.strictEqual(resHistorial.body.pedidos[0].codigoReferencia, codigoReferencia);
    assert.strictEqual(resHistorial.body.pedidos[0].estado, CONSTANTS.ORDER_STATUS.PAID);

    // 7. Administrador avanza la fase a "salido_tienda" asignando código de seguimiento
    const resFase = await request(`/api/pedidos/${codigoReferencia}/fase`, {
      method: 'PUT',
      headers: {
        'x-user-role': 'admin'
      },
      body: JSON.stringify({
        fase: 'salido_tienda',
        numeroSeguimiento: 'SEUR-ES-789012',
        transportista: 'SEUR',
        notas: 'Paquete frágil con protección artesanal'
      })
    });
    assert.strictEqual(resFase.status, 200);
    assert.strictEqual(resFase.body.estado, 'salido_tienda');
    assert.strictEqual(resFase.body.envio.numeroSeguimiento, 'SEUR-ES-789012');

    // 8. Elena consulta el detalle del pedido y comprueba el código de tracking
    const resDetalle = await request(`/api/pedidos/mis-compras/${codigoReferencia}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenElena}`
      }
    });
    assert.strictEqual(resDetalle.status, 200);
    assert.strictEqual(resDetalle.body.estado, 'salido_tienda');
    assert.strictEqual(resDetalle.body.numeroSeguimiento, 'SEUR-ES-789012');

    // 9. Segundo usuario intenta acceder indebidamente al pedido de Elena (prevención IDOR)
    const resRegPablo = await request('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Pablo Comprador',
        email: 'pablo@artesania.es',
        password: 'passwordPablo123'
      })
    });
    const tokenPablo = resRegPablo.body.sesion.token;

    const resIdor = await request(`/api/pedidos/mis-compras/${codigoReferencia}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenPablo}`
      }
    });
    assert.strictEqual(resIdor.status, 403);
    assert.strictEqual(resIdor.body.codigo, 'ACCESO_DENEGADO');
  });
});
