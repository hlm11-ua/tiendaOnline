import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CardTokenizerService } from '../../frontend/src/services/card-tokenizer.service.js';
import { PaymentGatewayService } from '../../backend/src/services/payment-gateway.service.js';
import { store } from '../../backend/src/models/store.js';

// Tarjetas que ofrece el formulario de pago como "Tarjetas de prueba para validación rápida"
const checkoutForm = fs.readFileSync(new URL('../../frontend/src/components/checkout-form.js', import.meta.url), 'utf8');
const TARJETAS_FORMULARIO = [...checkoutForm.matchAll(/fillTestCard\('([\d ]+)'/g)].map(m => m[1].replace(/\s+/g, ''));

describe('Tarjetas de prueba del checkout (Feature 003)', () => {
  it('el formulario ofrece las cuatro tarjetas de prueba', () => {
    assert.equal(TARJETAS_FORMULARIO.length, 4);
    assert.deepEqual(TARJETAS_FORMULARIO.map(t => t.slice(-4)), ['4242', '3000', '0101', '0180']);
  });

  for (const pan of TARJETAS_FORMULARIO) {
    it(`la tarjeta de prueba ${pan} supera la validación Luhn y se tokeniza`, () => {
      assert.equal(CardTokenizerService.validateLuhn(pan), true);
      const { token, ultimosCuatro } = CardTokenizerService.tokenize({
        pan, expiry: '12/30', cvv: '123', titular: 'Prueba'
      });
      assert.ok(token.includes(pan));
      assert.equal(ultimosCuatro, pan.slice(-4));
    });
  }
});

describe('Pasarela simulada: escenario según la tarjeta, no según la marca de tiempo', () => {
  beforeEach(() => store.reset());

  const autorizar = (tokenTarjeta, importe = 50) =>
    PaymentGatewayService.processAuthorization({ sesionPagoId: 'sesion-prueba', importe, tokenTarjeta });

  for (const marcaTiempo of ['1794850180123', '1794850101456', '1794899990000']) {
    it(`autoriza una tarjeta válida aunque la marca de tiempo ${marcaTiempo} contenga un código de prueba`, () => {
      const resultado = autorizar(`tok_visa_4242424242424242_${marcaTiempo}`);
      assert.equal(resultado.estado, 'autorizado');
      assert.equal(resultado.transaccion.ultimosCuatro, '4242');
    });
  }

  it('deniega por fondos insuficientes la tarjeta acabada en 0101', () => {
    assert.throws(() => autorizar('tok_visa_4000000000000101_1794850000000'), { codigo: 'FONDOS_INSUFICIENTES' });
  });

  it('deniega la tarjeta bloqueada acabada en 0180', () => {
    assert.throws(() => autorizar('tok_visa_4000000000040180_1794850000000'), { codigo: 'TARJETA_DENEGADA' });
  });

  it('simula error técnico con la tarjeta acabada en 9999', () => {
    assert.throws(() => autorizar('tok_visa_4000000000009999_1794850000000'), { codigo: 'ERROR_PASARELA' });
  });

  it('mantiene los identificadores de prueba por palabra clave', () => {
    assert.throws(() => autorizar('tok_visa_4242_insufficient_funds'), { codigo: 'FONDOS_INSUFICIENTES' });
    assert.throws(() => autorizar('tok_visa_4242_denied'), { codigo: 'TARJETA_DENEGADA' });
    assert.equal(autorizar('tok_visa_4242_success').estado, 'autorizado');
  });

  it('pide 3D Secure por importe (> 100 €) y guarda los últimos 4 dígitos reales', () => {
    const resultado = autorizar('tok_visa_4000000000063000_1794850000000', 185);
    assert.equal(resultado.estado, 'requiere_3ds');
    assert.equal(store.getTransaction(resultado.transaccionId).ultimosCuatro, '3000');
  });
});
