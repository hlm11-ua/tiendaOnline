import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';

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

describe('Pruebas de Integración: Flujo Completo del Carrito y Persistencia (cart-flow)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('debe gestionar el ciclo de vida completo del carrito (añadir, modificar, eliminar y vaciar)', async () => {
    const usuarioId = 'usr-flow-1';
    const headers = { 'x-usuario-id': usuarioId };

    // 1. Obtener carrito inicial (vacío)
    const initialRes = await request('/api/carrito', { headers });
    assert.equal(initialRes.status, 200);
    assert.equal(initialRes.body.estado, 'vacio');
    assert.equal(initialRes.body.subtotal, 0.00);
    assert.equal(initialRes.body.gastosEnvioEstimados, 0.00);

    // 2. Añadir artículo 1: Jarrón Azul x2 (45.00 € c/u)
    const add1Res = await request('/api/carrito/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ varianteId: 'var-001-azul', cantidad: 2 })
    });
    assert.equal(add1Res.status, 200);
    assert.equal(add1Res.body.estado, 'listo');
    assert.equal(add1Res.body.subtotal, 90.00);
    assert.equal(add1Res.body.total, 90.00);

    // 3. Añadir artículo 2: Manta de Lana x1 (140.00 € c/u)
    const add2Res = await request('/api/carrito/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ varianteId: 'var-002-natural', cantidad: 1 })
    });
    assert.equal(add2Res.status, 200);
    assert.equal(add2Res.body.items.length, 2);
    assert.equal(add2Res.body.subtotal, 230.00);
    assert.equal(add2Res.body.total, 230.00);

    // 4. Modificar cantidad de Jarrón Azul de 2 a 3 unidades
    const updateRes = await request('/api/carrito/items/var-001-azul', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ cantidad: 3 })
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.subtotal, 275.00); // 3 * 45 + 140 = 135 + 140 = 275

    // 5. Eliminar artículo 2 (Manta de Lana)
    const deleteRes = await request('/api/carrito/items/var-002-natural', {
      method: 'DELETE',
      headers
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.items.length, 1);
    assert.equal(deleteRes.body.subtotal, 135.00);

    // 6. Vaciar carrito completo
    const clearRes = await request('/api/carrito', {
      method: 'DELETE',
      headers
    });
    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.estado, 'vacio');
    assert.equal(clearRes.body.items.length, 0);
    assert.equal(clearRes.body.subtotal, 0.00);
    assert.equal(clearRes.body.total, 0.00);
  });

  it('debe integrar la cesta con la inicialización de checkout (/api/pagos/iniciar) y vaciado posterior', async () => {
    const usuarioId = 'usr-flow-checkout';
    const headers = { 'x-usuario-id': usuarioId };

    // 1. Añadir artículo al carrito
    await request('/api/carrito/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ varianteId: 'var-003-olivo', cantidad: 2 })
    });

    const cartRes = await request('/api/carrito', { headers });
    assert.equal(cartRes.body.subtotal, 57.00);

    // 2. Iniciar sesión de pago en checkout usando las líneas del carrito
    const checkoutRes = await request('/api/pagos/iniciar', {
      method: 'POST',
      body: JSON.stringify({
        items: cartRes.body.items.map(it => ({
          varianteId: it.varianteId,
          cantidad: it.cantidad
        }))
      })
    });
    assert.equal(checkoutRes.status, 200);
    assert.ok(checkoutRes.body.sesionPagoId);
    assert.equal(checkoutRes.body.total, 57.00);

    // 3. Tras finalizar compra con éxito, se invoca vaciado de cesta
    const clearRes = await request('/api/carrito', {
      method: 'DELETE',
      headers
    });
    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.estado, 'vacio');
  });
});
