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

describe('Pruebas de Integración: Sincronización y Validación de Stock en Tiempo Real (cart-sync)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('debe detectar reducción de stock por reservas concurrentes y reajustar cantidades con aviso', async () => {
    // 1. Simular compra/reserva concurrente de 4 unidades de var-001-azul (total 5 disponibles)
    store.addReservation({
      sesionPagoId: 'ses-concurrente-1',
      varianteId: 'var-001-azul',
      cantidad: 4
    });

    assert.equal(store.getAvailableStock('var-001-azul'), 1);

    // 2. Cliente valida una cesta que tenía 3 unidades
    const res = await request('/api/carrito/validar-stock', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { varianteId: 'var-001-azul', cantidad: 3, precioUnitario: 45.00 }
        ]
      })
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.valido, false);
    assert.equal(res.body.bloqueaTramitacion, false); // reajustado a 1, aún se puede tramitar 1 unidad
    assert.equal(res.body.items[0].cantidadAjustada, 1);
    assert.equal(res.body.items[0].stockDisponible, 1);
    assert.equal(res.body.items[0].estado, 'reajustado');

    const aviso = res.body.avisos.find(a => a.tipo === 'stock_reajustado');
    assert.ok(aviso, 'Debe emitir aviso de stock reajustado');
    assert.equal(aviso.cantidadPrevia, 3);
    assert.equal(aviso.cantidadNueva, 1);
  });

  it('debe detectar cuando un producto queda agotado por completo y bloquear tramitación', async () => {
    // Reserver la totalidad del stock de var-004-unico (stock 1)
    store.addReservation({
      sesionPagoId: 'ses-concurrente-2',
      varianteId: 'var-004-unico',
      cantidad: 1
    });

    assert.equal(store.getAvailableStock('var-004-unico'), 0);

    const res = await request('/api/carrito/validar-stock', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { varianteId: 'var-004-unico', cantidad: 1 }
        ]
      })
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.valido, false);
    assert.equal(res.body.bloqueaTramitacion, true);
    assert.equal(res.body.items[0].cantidadAjustada, 0);
    assert.equal(res.body.items[0].stockDisponible, 0);
    assert.equal(res.body.items[0].estado, 'agotado');

    const aviso = res.body.avisos.find(a => a.tipo === 'stock_agotado');
    assert.ok(aviso, 'Debe emitir aviso de stock agotado');
  });

  it('debe sincronizar precio unitario actualizado en catálogo y emitir aviso', async () => {
    // El artesano modifica el precio base en el catálogo
    const prod = store.getProductById('art-001');
    prod.precioBase = 49.99;

    const res = await request('/api/carrito/validar-stock', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { varianteId: 'var-001-azul', cantidad: 2, precioUnitario: 45.00 }
        ]
      })
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.items[0].precioVigente, 49.99);

    const aviso = res.body.avisos.find(a => a.tipo === 'precio_actualizado');
    assert.ok(aviso, 'Debe emitir aviso de precio actualizado');
    assert.equal(aviso.precioPrevio, 45.00);
    assert.equal(aviso.precioNuevo, 49.99);
  });

  it('debe marcar piezas archivadas o despublicadas como no disponibles y bloquear tramitación', async () => {
    // Archivar variante en catálogo
    const variant = store.getVariantById('var-002-natural');
    variant.estado = 'archivada';

    const res = await request('/api/carrito/validar-stock', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { varianteId: 'var-002-natural', cantidad: 1 }
        ]
      })
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.valido, false);
    assert.equal(res.body.bloqueaTramitacion, true);
    assert.equal(res.body.items[0].estado, 'no_disponible');

    const aviso = res.body.avisos.find(a => a.tipo === 'producto_no_disponible');
    assert.ok(aviso, 'Debe emitir aviso de producto no disponible');
  });
});
