import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CartService } from '../../backend/src/services/cart.service.js';
import { store } from '../../backend/src/models/store.js';

describe('Pruebas Unitarias de CartService (Cálculos, Stock y Validaciones)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('debe calcular correctamente el subtotal en euros y la estimación fija de 0,00 € de envío', () => {
    const cart = CartService.getOrCreateCart('usr-test');
    CartService.addItem(cart, {
      varianteId: 'var-001-azul',
      cantidad: 2
    });

    assert.equal(cart.subtotal, 90.00);
    assert.equal(cart.gastosEnvioEstimados, 0.00);
    assert.equal(cart.total, 90.00);
    assert.equal(cart.moneda, 'EUR');
    assert.equal(cart.estado, 'listo');
  });

  it('debe rechazar entradas decimales, negativas o no enteras', () => {
    const cart = CartService.getOrCreateCart('usr-test');

    assert.throws(
      () => CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: -1 }),
      /La cantidad debe ser un número entero mayor que 0/
    );

    assert.throws(
      () => CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: 'texto' }),
      /La cantidad debe ser un número entero mayor que 0/
    );

    assert.throws(
      () => CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: 1.5 }),
      /La cantidad debe ser un número entero mayor que 0/
    );
  });

  it('debe bloquear adición si excede el stock disponible', () => {
    const cart = CartService.getOrCreateCart('usr-test');

    assert.throws(
      () => CartService.addItem(cart, { varianteId: 'var-004-unico', cantidad: 2 }), // stock: 1
      /Existencias insuficientes|La cantidad solicitada supera/
    );
  });

  it('debe considerar reservas temporales activas de checkout como stock no disponible', () => {
    const cart = CartService.getOrCreateCart('usr-test');

    // Simular que otra sesión tiene 4 de las 5 unidades reservadas activamente
    store.addReservation({
      sesionPagoId: 'ses-otra',
      varianteId: 'var-001-azul',
      cantidad: 4
    });

    // Ahora sólo queda 1 unidad disponible
    assert.equal(store.getAvailableStock('var-001-azul'), 1);

    // Intentar añadir 2 unidades debe fallar
    assert.throws(
      () => CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: 2 }),
      /Existencias insuficientes|La cantidad solicitada supera/
    );

    // Añadir 1 debe permitirse
    CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: 1 });
    assert.equal(cart.items[0].cantidad, 1);
  });

  it('debe sincronizar precio unitario con el precio vigente en catálogo', () => {
    const cart = CartService.getOrCreateCart('usr-test');
    CartService.addItem(cart, { varianteId: 'var-001-azul', cantidad: 1 });
    assert.equal(cart.items[0].precioUnitario, 45.00);

    // El artesano modifica el precioBase en catálogo a 50.00 €
    const prod = store.getProductById('art-001');
    prod.precioBase = 50.00;

    // Validación síncrona
    const result = CartService.validarStock([{ varianteId: 'var-001-azul', cantidad: 1 }]);
    assert.equal(result.items[0].precioVigente, 50.00);
    assert.ok(result.avisos.some(a => a.tipo === 'precio_actualizado'));
  });
});
