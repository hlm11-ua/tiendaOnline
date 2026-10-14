import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../../backend/src/server.js';

describe('Servicio Web de Checkout y Estáticos', () => {
  it('debe servir checkout.html en la raíz /', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Pasarela de Pago Seguro con Tarjeta'));
      assert.ok(text.includes('checkout-form-container'));
      assert.ok(text.includes('reservation-timer-container'));
    } finally {
      server.close();
    }
  });

  it('debe servir la hoja de estilos checkout.css', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/src/styles/checkout.css`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('--accent-primary'));
      assert.ok(text.includes('.reservation-badge'));
    } finally {
      server.close();
    }
  });

  it('debe servir los módulos de componentes frontend', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res1 = await fetch(`http://localhost:${port}/src/components/reservation-timer.js`);
      assert.strictEqual(res1.status, 200);

      const res2 = await fetch(`http://localhost:${port}/src/components/payment-3ds-modal.js`);
      assert.strictEqual(res2.status, 200);

      const res3 = await fetch(`http://localhost:${port}/src/components/order-receipt.js`);
      assert.strictEqual(res3.status, 200);

      const res4 = await fetch(`http://localhost:${port}/src/components/checkout-form.js`);
      assert.strictEqual(res4.status, 200);
    } finally {
      server.close();
    }
  });
});
