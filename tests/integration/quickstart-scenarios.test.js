import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';

describe('Batería de Validación de Escenarios de quickstart.md', () => {
  let server;
  let baseUrl;

  beforeEach(() => {
    store.reset();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    if (server) server.close();
  });

  // Escenario 1: Compra Directa Autorizada (<= 100 €)
  it('Escenario 1: Compra Directa Autorizada (<= 100 €) genera pedido pagado y descuenta stock', async () => {
    // 1. Iniciar pago con pieza de cerámica (45,00 €)
    const initRes = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-001-azul', cantidad: 1 }]
      })
    });
    assert.strictEqual(initRes.status, 200);
    const initData = await initRes.json();
    assert.strictEqual(initData.total, 45.00);
    assert.strictEqual(initData.moneda, 'EUR');
    assert.ok(initData.sesionPagoId);

    // 2. Procesar con tarjeta directa 4242 (tokenizada)
    const payRes = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Lucía Ramos',
        clienteEmail: 'lucia.ramos@example.es',
        tokenTarjeta: 'tok_visa_4242424242424242_12345678'
      })
    });
    assert.strictEqual(payRes.status, 200);
    const payData = await payRes.json();
    assert.strictEqual(payData.estado, 'autorizado');
    assert.ok(payData.pedido);
    assert.strictEqual(payData.pedido.estado, 'pagado');
    assert.strictEqual(payData.pedido.total, 45.00);
    assert.ok(payData.pedido.codigoReferencia.startsWith('PED-'));

    // Stock decrementado: stockTotal pasa de 5 a 4
    const itemInv = store.getInventoryItem('var-001-azul');
    assert.strictEqual(itemInv.stockTotal, 4);
  });

  // Escenario 2: Compra Superior a 100 € con Desafío 3D Secure
  it('Escenario 2: Compra > 100 € exige 3D Secure y se confirma con código OTP 1234', async () => {
    // 1. Iniciar pago con manta artesanal (140,00 €)
    const initRes = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-002-natural', cantidad: 1 }]
      })
    });
    assert.strictEqual(initRes.status, 200);
    const initData = await initRes.json();
    assert.strictEqual(initData.total, 140.00);

    // 2. Procesar pago con tarjeta 3DS (4000...3000)
    const payRes = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Marcos Ortiz',
        clienteEmail: 'marcos@example.es',
        tokenTarjeta: 'tok_visa_4000000000003000_12345678'
      })
    });
    assert.strictEqual(payRes.status, 200);
    const payData = await payRes.json();
    assert.strictEqual(payData.estado, 'requiere_3ds');
    assert.ok(payData.desafio3ds);

    // 3. Probar código erróneo primero (0000)
    const wrongOtpRes = await fetch(`${baseUrl}/api/pagos/verificar-3ds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaccionId: payData.transaccionId,
        codigoOtp: '0000'
      })
    });
    assert.strictEqual(wrongOtpRes.status, 400);

    // 4. Iniciar de nuevo para el OTP correcto (puesto que el fallido liberó la reserva)
    const initRes2 = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-002-natural', cantidad: 1 }]
      })
    });
    const initData2 = await initRes2.json();
    const payRes2 = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesionPagoId: initData2.sesionPagoId,
        clienteNombre: 'Marcos Ortiz',
        clienteEmail: 'marcos@example.es',
        tokenTarjeta: 'tok_visa_4000000000003000_12345678'
      })
    });
    const payData2 = await payRes2.json();

    // Validar con OTP correcto (1234)
    const validOtpRes = await fetch(`${baseUrl}/api/pagos/verificar-3ds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaccionId: payData2.transaccionId,
        codigoOtp: '1234'
      })
    });
    assert.strictEqual(validOtpRes.status, 200);
    const validData = await validOtpRes.json();
    assert.strictEqual(validData.estado, 'autorizado');
    assert.strictEqual(validData.pedido.estado, 'pagado');
    assert.strictEqual(validData.pedido.total, 140.00);
  });

  // Escenario 3: Tarjeta Rechazada por Fondos Insuficientes
  it('Escenario 3: Tarjeta denegada por fondos insuficientes no crea pedido y libera stock', async () => {
    const initRes = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-001-azul', cantidad: 1 }]
      })
    });
    const initData = await initRes.json();

    const payRes = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Elena Gómez',
        clienteEmail: 'elena@example.es',
        tokenTarjeta: 'tok_visa_4000000000000101_insufficient_funds'
      })
    });
    assert.strictEqual(payRes.status, 400);
    const errData = await payRes.json();
    assert.strictEqual(errData.codigo, 'FONDOS_INSUFICIENTES');

    // No se creó ningún pedido
    const orders = store.getAllOrders();
    assert.strictEqual(orders.length, 0);

    // Stock sigue intacto (5)
    assert.strictEqual(store.getAvailableStock('var-001-azul'), 5);
  });

  // Escenario 4: Expiración de la Reserva Temporal (10 Minutos)
  it('Escenario 4: Reserva expirada rechaza el cobro y libera inventario', async () => {
    const initRes = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-004-unico', cantidad: 1 }]
      })
    });
    const initData = await initRes.json();

    // Forzar expiración adelantando el tiempo de la reserva
    const resList = store.getReservationsBySession(initData.sesionPagoId);
    for (const r of resList) {
      r.expiresAt = new Date(Date.now() - 5000).toISOString();
    }

    const payRes = await fetch(`${baseUrl}/api/pagos/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Marta Soler',
        clienteEmail: 'marta@example.es',
        tokenTarjeta: 'tok_visa_4242424242424242_12345678'
      })
    });
    assert.strictEqual(payRes.status, 410);
    const errData = await payRes.json();
    assert.strictEqual(errData.codigo, 'RESERVA_EXPIRADA');

    // El stock vuelve a estar disponible
    assert.strictEqual(store.getAvailableStock('var-004-unico'), 1);
  });

  // Escenario 5: Cierre Involuntario de Navegador y Confirmación por Webhook
  it('Escenario 5: Webhook bancario confirma la compra desatendida de forma idempotente', async () => {
    const initRes = await fetch(`${baseUrl}/api/pagos/iniciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ varianteId: 'var-001-azul', cantidad: 1 }]
      })
    });
    const initData = await initRes.json();

    // Notificación webhook de banco
    const webhookRes1 = await fetch(`${baseUrl}/api/pagos/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'firma_segura_banco_prueba'
      },
      body: JSON.stringify({
        transaccionId: 'tx_cierre_browser_1234',
        pasarelaRef: 'RED-998877',
        importe: 45.00,
        estado: 'autorizado',
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Carlos Mendoza',
        clienteEmail: 'carlos@example.es'
      })
    });
    assert.strictEqual(webhookRes1.status, 200);
    const hookData1 = await webhookRes1.json();
    assert.strictEqual(hookData1.recibido, true);

    // Pedido creado
    const orders = store.getAllOrders();
    assert.strictEqual(orders.length, 1);
    assert.strictEqual(orders[0].estado, 'pagado');
    assert.strictEqual(orders[0].clienteEmail, 'carlos@example.es');

    // Reenvío de webhook con el mismo transaccionId (idempotencia)
    const webhookRes2 = await fetch(`${baseUrl}/api/pagos/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'firma_segura_banco_prueba'
      },
      body: JSON.stringify({
        transaccionId: 'tx_cierre_browser_1234',
        pasarelaRef: 'RED-998877',
        importe: 45.00,
        estado: 'autorizado',
        sesionPagoId: initData.sesionPagoId,
        clienteNombre: 'Carlos Mendoza',
        clienteEmail: 'carlos@example.es'
      })
    });
    assert.strictEqual(webhookRes2.status, 200);
    const hookData2 = await webhookRes2.json();
    assert.strictEqual(hookData2.recibido, true);
    assert.ok(hookData2.nota && hookData2.nota.includes('idempotente'));

    // No se duplicó el pedido
    assert.strictEqual(store.getAllOrders().length, 1);
  });
});
