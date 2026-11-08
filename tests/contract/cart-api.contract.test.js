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

describe('Contratos de API del Carrito de Compras (/api/carrito)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('GET /api/carrito', () => {
    it('debe devolver un carrito vacío cuando no hay artículos (200)', async () => {
      const res = await request('/api/carrito', {
        headers: { 'x-usuario-id': 'usr-test-1' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.estado, 'vacio');
      assert.equal(res.body.subtotal, 0.00);
      assert.equal(res.body.gastosEnvioEstimados, 0.00);
      assert.equal(res.body.total, 0.00);
      assert.equal(res.body.moneda, 'EUR');
      assert.deepEqual(res.body.items, []);
    });
  });

  describe('POST /api/carrito/items', () => {
    it('debe añadir un producto con stock disponible (200)', async () => {
      const res = await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({
          varianteId: 'var-001-azul',
          cantidad: 2
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.estado, 'listo');
      assert.equal(res.body.items.length, 1);
      assert.equal(res.body.items[0].varianteId, 'var-001-azul');
      assert.equal(res.body.items[0].cantidad, 2);
      assert.equal(res.body.subtotal, 90.00);
      assert.equal(res.body.total, 90.00);
    });

    it('debe devolver 409 si la cantidad supera el stock disponible', async () => {
      const res = await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({
          varianteId: 'var-004-unico', // stock: 1
          cantidad: 2
        })
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'STOCK_INSUFICIENTE');
      assert.equal(res.body.codigo, 'STOCK_INSUFICIENTE');
    });

    it('debe devolver 400 si la cantidad es menor que 1 o inválida', async () => {
      const res = await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({
          varianteId: 'var-001-azul',
          cantidad: -1
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'PARAMETROS_INVALIDOS');
    });
  });

  describe('PUT /api/carrito/items/:varianteId', () => {
    it('debe actualizar la cantidad deseada (200)', async () => {
      // 1. Añadir 1 unidad
      await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({ varianteId: 'var-001-azul', cantidad: 1 })
      });

      // 2. Modificar a 3
      const res = await request('/api/carrito/items/var-001-azul', {
        method: 'PUT',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({ cantidad: 3 })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.items[0].cantidad, 3);
      assert.equal(res.body.subtotal, 135.00);
    });

    it('debe eliminar la línea si la cantidad es 0', async () => {
      await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({ varianteId: 'var-001-azul', cantidad: 1 })
      });

      const res = await request('/api/carrito/items/var-001-azul', {
        method: 'PUT',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({ cantidad: 0 })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.items.length, 0);
      assert.equal(res.body.estado, 'vacio');
    });
  });

  describe('DELETE /api/carrito/items/:varianteId y DELETE /api/carrito', () => {
    it('debe eliminar una línea específica y vaciar la cesta completa', async () => {
      await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-test-1' },
        body: JSON.stringify({ varianteId: 'var-001-azul', cantidad: 1 })
      });

      const deleteLineRes = await request('/api/carrito/items/var-001-azul', {
        method: 'DELETE',
        headers: { 'x-usuario-id': 'usr-test-1' }
      });
      assert.equal(deleteLineRes.status, 200);
      assert.equal(deleteLineRes.body.items.length, 0);

      // Vaciar cesta
      const emptyRes = await request('/api/carrito', {
        method: 'DELETE',
        headers: { 'x-usuario-id': 'usr-test-1' }
      });
      assert.equal(emptyRes.status, 200);
      assert.equal(emptyRes.body.estado, 'vacio');
    });
  });

  describe('POST /api/carrito/validar-stock', () => {
    it('debe validar existencias y sincronizar precios vigentes', async () => {
      const res = await request('/api/carrito/validar-stock', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { varianteId: 'var-001-azul', cantidad: 2 }
          ]
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.valido, true);
      assert.equal(res.body.bloqueaTramitacion, false);
      assert.equal(res.body.items[0].precioVigente, 45.00);
      assert.equal(res.body.items[0].stockDisponible, 5);
      assert.equal(res.body.items[0].estado, 'disponible');
    });

    it('debe reajustar y advertir si la cantidad deseada supera el stock disponible', async () => {
      const res = await request('/api/carrito/validar-stock', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { varianteId: 'var-004-unico', cantidad: 3 } // stock: 1
          ]
        })
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.valido, false);
      assert.equal(res.body.items[0].cantidadAjustada, 1);
      assert.equal(res.body.items[0].estado, 'reajustado');
      assert.ok(res.body.avisos.some(a => a.tipo === 'stock_reajustado'));
    });
  });

  describe('POST /api/carrito/fusionar', () => {
    it('debe fusionar artículos locales y remotos sumando coincidentes hasta el stock disponible', async () => {
      // 1. Preparar carrito remoto con 1 unidad de var-001-azul
      await request('/api/carrito/items', {
        method: 'POST',
        headers: { 'x-usuario-id': 'usr-merge-1' },
        body: JSON.stringify({ varianteId: 'var-001-azul', cantidad: 1 })
      });

      // 2. Fusionar con carrito local (2 unidades de var-001-azul y 1 de var-002-natural)
      const res = await request('/api/carrito/fusionar', {
        method: 'POST',
        body: JSON.stringify({
          usuarioId: 'usr-merge-1',
          itemsLocales: [
            { varianteId: 'var-001-azul', cantidad: 2 },
            { varianteId: 'var-002-natural', cantidad: 1 }
          ]
        })
      });

      assert.equal(res.status, 200);
      const var1 = res.body.carrito.items.find(i => i.varianteId === 'var-001-azul');
      const var2 = res.body.carrito.items.find(i => i.varianteId === 'var-002-natural');
      assert.equal(var1.cantidad, 3); // 1 + 2 = 3 (<= 5 disponible)
      assert.equal(var2.cantidad, 1);
    });
  });
});
