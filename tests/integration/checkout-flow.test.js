import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
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

describe('Pruebas de Integración: Flujo Completo de Pago y Confirmación Condicionada', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Escenario 1: Pago directo autorizado (<= 100 €) descuenta inventario y crea pedido pagado', async () => {
    const initialStock = store.getAvailableStock('var-001-azul');
    assert.equal(initialStock, 5);

    // 1. Iniciar checkout
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
    assert.equal(initRes.status, 200);

    // Stock disponible temporalmente reducido
    assert.equal(store.getAvailableStock('var-001-azul'), 3);

    // 2. Procesar pago
    const procRes = await request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify({
        sesionPagoId: initRes.body.sesionPagoId,
        clienteNombre: 'Carmen López',
        clienteEmail: 'carmen@example.es',
        tokenTarjeta: 'tok_visa_4242_success'
      })
    });

    assert.equal(procRes.status, 200);
    assert.equal(procRes.body.estado, 'autorizado');

    // Comprobar persistencia atómica del pedido con estado "pagado"
    const order = store.getOrderByCode(procRes.body.pedido.codigoReferencia);
    assert.ok(order, 'El pedido debe existir en el almacén de datos');
    assert.equal(order.estado, 'pagado');
    assert.equal(order.total, 90.00);

    // Stock permanente descontado
    const item = store.getInventoryItem('var-001-azul');
    assert.equal(item.stockTotal, 3);
  });

  it('Escenario 2: Pago > 100 € exige 3D Secure y se confirma con OTP válido (1234)', async () => {
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

    // 2. Procesar -> Requiere 3DS
    const procRes = await request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify({
        sesionPagoId: initRes.body.sesionPagoId,
        clienteNombre: 'Andrés Suárez',
        clienteEmail: 'andres@example.es',
        tokenTarjeta: 'tok_visa_4000000000003000_success'
      })
    });
    assert.equal(procRes.body.estado, 'requiere_3ds');
    const { transaccionId } = procRes.body;

    // Aún NO debe existir pedido en estado pagado
    assert.equal(store.getOrderByTransactionId(transaccionId), null);

    // 3. Introducir OTP correcto (1234) -> Autorizado
    const successOtpRes = await request('/api/pagos/verificar-3ds', {
      method: 'POST',
      body: JSON.stringify({ transaccionId, codigoOtp: '1234' })
    });
    assert.equal(successOtpRes.status, 200);
    assert.equal(successOtpRes.body.estado, 'autorizado');
    assert.ok(successOtpRes.body.pedido);
    assert.equal(successOtpRes.body.pedido.estado, 'pagado');
  });

  it('Escenario 2B: Desafío 3D Secure con código incorrecto deniega la transacción y libera el stock', async () => {
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

    const procRes = await request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify({
        sesionPagoId: initRes.body.sesionPagoId,
        clienteNombre: 'Laura Blanco',
        clienteEmail: 'laura@example.es',
        tokenTarjeta: 'tok_visa_4000000000003000_success'
      })
    });
    const { transaccionId } = procRes.body;

    // Introducir OTP erróneo -> 400 3DS_FALLIDO
    const failOtpRes = await request('/api/pagos/verificar-3ds', {
      method: 'POST',
      body: JSON.stringify({ transaccionId, codigoOtp: '9999' })
    });
    assert.equal(failOtpRes.status, 400);

    // No se genera pedido y el stock vuelve a estar disponible (3 unidades)
    assert.equal(store.getOrderByTransactionId(transaccionId), null);
    assert.equal(store.getAvailableStock('var-002-natural'), 3);
  });

  it('Escenario 3: Tarjeta con fondos insuficientes no crea pedido y libera la reserva', async () => {
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

    const procRes = await request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify({
        sesionPagoId: initRes.body.sesionPagoId,
        clienteNombre: 'Pedro Valls',
        clienteEmail: 'pedro@example.es',
        tokenTarjeta: 'tok_visa_4000000000000101_insufficient_funds'
      })
    });

    assert.equal(procRes.status, 400);
    assert.equal(procRes.body.codigo, 'FONDOS_INSUFICIENTES');

    // Stock liberado
    assert.equal(store.getAvailableStock('var-001-azul'), 5);
  });

  it('Escenario 4: Expiración de reserva (10 minutos) impide el cobro', async () => {
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

    // Simular paso del tiempo manipulando la marca expiresAt en la reserva
    const reservations = store.getReservationsBySession(initRes.body.sesionPagoId);
    for (const res of reservations) {
      res.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 segundo en el pasado
    }

    const procRes = await request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify({
        sesionPagoId: initRes.body.sesionPagoId,
        clienteNombre: 'Sara Gil',
        clienteEmail: 'sara@example.es',
        tokenTarjeta: 'tok_visa_4242_success'
      })
    });

    assert.equal(procRes.status, 410);
    assert.equal(procRes.body.codigo, 'RESERVA_EXPIRADA');
  });

  it('Escenario 5: Webhook bancario confirma la compra desatendida de forma idempotente', async () => {
    // 1. Iniciar checkout
    const initRes = await request('/api/pagos/iniciar', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            productoId: 'art-003',
            varianteId: 'var-003-olivo',
            titulo: 'Tabla de Corte en Madera de Olivo',
            precioUnitario: 28.50,
            cantidad: 1
          }
        ]
      })
    });

    // 2. Simular que el navegador se cierra pero la pasarela emite webhook
    const webhookPayload = {
      transaccionId: 'tx_webhook_test_999',
      pasarelaRef: 'RED-999',
      importe: 28.50,
      estado: 'autorizado',
      sesionPagoId: initRes.body.sesionPagoId,
      clienteNombre: 'Javier Pons',
      clienteEmail: 'javier@example.es'
    };

    const webhookRes1 = await request('/api/pagos/webhook', {
      method: 'POST',
      headers: { 'X-Signature': CONSTANTS.WEBHOOK_TEST_SIGNATURE },
      body: JSON.stringify(webhookPayload)
    });

    assert.equal(webhookRes1.status, 200);

    // El pedido debe haber sido creado
    const order = store.getOrderByTransactionId('tx_webhook_test_999');
    assert.ok(order, 'El pedido debe existir');
    assert.equal(order.estado, 'pagado');
    assert.equal(order.clienteNombre, 'Javier Pons');

    // 3. Segundo envío del mismo webhook (prueba de idempotencia SC-004)
    const webhookRes2 = await request('/api/pagos/webhook', {
      method: 'POST',
      headers: { 'X-Signature': CONSTANTS.WEBHOOK_TEST_SIGNATURE },
      body: JSON.stringify(webhookPayload)
    });

    assert.equal(webhookRes2.status, 200);
    // El stock no debe haberse descontado dos veces
    const item = store.getInventoryItem('var-003-olivo');
    assert.equal(item.stockTotal, 9); // Inicial era 10, descontado 1
  });
});
