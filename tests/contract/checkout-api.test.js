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
