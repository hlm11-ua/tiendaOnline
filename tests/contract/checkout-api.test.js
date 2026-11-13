import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';

// Helper ligero para simular peticiones HTTP a la app Express sin dependencias externas
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

describe('Contratos de API de Checkout (/api/pagos)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('POST /api/pagos/iniciar', () => {
    it('debe iniciar la sesión de pago y reservar stock si hay disponibilidad (200)', async () => {
      const res = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-001',
              varianteId: 'var-001-azul',
              titulo: 'Jarrón de Cerámica Esmaltada Azul',
              precioUnitario: 45.00,
              cantidad: 1
            }
          ]
        })
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.sesionPagoId, 'Debe devolver sesionPagoId');
      assert.equal(res.body.total, 45.00);
      assert.equal(res.body.moneda, 'EUR');
      assert.equal(res.body.minutosRestantes, 10);
      assert.ok(res.body.expiresAt);
    });

    it('debe devolver 409 si la cantidad solicitada excede el stock disponible', async () => {
      const res = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-004',
              varianteId: 'var-004-unico',
              titulo: 'Pieza Única',
              precioUnitario: 220.00,
              cantidad: 10 // Solo hay 1 en stock
            }
          ]
        })
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.codigo, 'STOCK_INSUFICIENTE');
    });

    it('debe devolver 400 si la lista de items está vacía o es inválida', async () => {
      const res = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({ items: [] })
      });

      assert.equal(res.status, 400);
    });
  });

  describe('POST /api/pagos/procesar', () => {
    it('debe autorizar directamente compras <= 100 € con tarjeta válida (200)', async () => {
      // 1. Iniciar pago
      const initRes = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-001',
              varianteId: 'var-001-azul',
              titulo: 'Jarrón de Cerámica Esmaltada Azul',
              precioUnitario: 45.00,
              cantidad: 1
            }
          ]
        })
      });

      // 2. Procesar pago con tarjeta directa
      const procRes = await request('/api/pagos/procesar', {
        method: 'POST',
        body: JSON.stringify({
          sesionPagoId: initRes.body.sesionPagoId,
          clienteNombre: 'Elena Naranjo',
          clienteEmail: 'elena@example.es',
          tokenTarjeta: 'tok_visa_4242_success'
        })
      });

      assert.equal(procRes.status, 200);
      assert.equal(procRes.body.estado, 'autorizado');
      assert.ok(procRes.body.pedido, 'Debe devolver el pedido formalizado');
      assert.equal(procRes.body.pedido.estado, 'pagado');
      assert.equal(procRes.body.pedido.clienteNombre, 'Elena Naranjo');
      assert.equal(procRes.body.pedido.clienteEmail, 'elena@example.es');
      assert.equal(procRes.body.pedido.total, 45.00);
    });

    it('debe solicitar 3D Secure para compras > 100 € (200 requiere_3ds)', async () => {
      // 1. Iniciar compra de 140 €
      const initRes = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-002',
              varianteId: 'var-002-natural',
              titulo: 'Manta de Lana Merina',
              precioUnitario: 140.00,
              cantidad: 1
            }
          ]
        })
      });

      // 2. Procesar
      const procRes = await request('/api/pagos/procesar', {
        method: 'POST',
        body: JSON.stringify({
          sesionPagoId: initRes.body.sesionPagoId,
          clienteNombre: 'Marcos Alonso',
          clienteEmail: 'marcos@example.es',
          tokenTarjeta: 'tok_visa_4000000000003000_success'
        })
      });

      assert.equal(procRes.status, 200);
      assert.equal(procRes.body.estado, 'requiere_3ds');
      assert.ok(procRes.body.desafio3ds, 'Debe incluir objeto de desafío 3DS');
      assert.ok(procRes.body.transaccionId);
    });
  });

  describe('POST /api/pagos/:sesionPagoId/liberar', () => {
    it('debe liberar la reserva de un checkout abandonado y devolver el stock disponible', async () => {
      // 1. Reservar la última unidad de una pieza única
      const initRes = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-004',
              varianteId: 'var-004-unico',
              titulo: 'Pieza Única',
              precioUnitario: 220.00,
              cantidad: 1
            }
          ]
        })
      });
      assert.equal(initRes.status, 200);

      const stockReservado = await request('/api/pagos/catalogo');
      const reservado = stockReservado.body.items.find(it => it.varianteId === 'var-004-unico');
      assert.equal(reservado.stockDisponible, 0);

      // 2. El comprador abandona la pasarela sin pagar: la reserva se libera
      const liberarRes = await request(`/api/pagos/${initRes.body.sesionPagoId}/liberar`, { method: 'POST' });
      assert.equal(liberarRes.status, 200);
      assert.equal(liberarRes.body.liberada, true);

      // 3. El stock vuelve a estar disponible y la sesión ya no permite cobrar
      const stockLiberado = await request('/api/pagos/catalogo');
      const disponible = stockLiberado.body.items.find(it => it.varianteId === 'var-004-unico');
      assert.equal(disponible.stockDisponible, 1);

      const procRes = await request('/api/pagos/procesar', {
        method: 'POST',
        body: JSON.stringify({
          sesionPagoId: initRes.body.sesionPagoId,
          clienteNombre: 'Elena Naranjo',
          clienteEmail: 'elena@example.es',
          tokenTarjeta: 'tok_visa_4242_success'
        })
      });
      assert.equal(procRes.status, 400);
      assert.equal(procRes.body.codigo, 'RESERVA_INACTIVA');
    });

    it('no debe deshacer una venta confirmada al liberar una reserva consolidada', async () => {
      // 1. Pago directo autorizado de 45 €
      const initRes = await request('/api/pagos/iniciar', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              productoId: 'art-001',
              varianteId: 'var-001-azul',
              titulo: 'Jarrón de Cerámica Esmaltada Azul',
              precioUnitario: 45.00,
              cantidad: 2
            }
          ]
        })
      });

      const procRes = await request('/api/pagos/procesar', {
        method: 'POST',
        body: JSON.stringify({
          sesionPagoId: initRes.body.sesionPagoId,
          clienteNombre: 'Elena Naranjo',
          clienteEmail: 'elena@example.es',
          tokenTarjeta: 'tok_visa_4242_success'
        })
      });
      assert.equal(procRes.status, 200);
      assert.equal(procRes.body.estado, 'autorizado');

      // 2. Liberar la sesión ya cobrada no altera el inventario descontado
      const liberarRes = await request(`/api/pagos/${initRes.body.sesionPagoId}/liberar`, { method: 'POST' });
      assert.equal(liberarRes.status, 200);

      const stockRes = await request('/api/pagos/catalogo');
      const vendido = stockRes.body.items.find(it => it.varianteId === 'var-001-azul');
      assert.equal(vendido.stockDisponible, 3); // 5 unidades iniciales - 2 vendidas
    });

    it('debe responder 200 aunque la sesión no exista o ya haya expirado (idempotente)', async () => {
      const res = await request('/api/pagos/sesion-inexistente/liberar', { method: 'POST' });
      assert.equal(res.status, 200);
      assert.equal(res.body.liberada, true);
    });
  });

  describe('POST /api/pagos/webhook', () => {
    it('debe rechazar llamadas sin firma o con firma inválida (401)', async () => {
      const res = await request('/api/pagos/webhook', {
        method: 'POST',
        headers: { 'X-Signature': 'firma_invalida' },
        body: JSON.stringify({ transaccionId: '123' })
      });

      assert.equal(res.status, 401);
    });
  });
});
