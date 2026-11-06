import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CartService } from '../../backend/src/services/cart.service.js';
import { Cart } from '../../backend/src/models/cart.model.js';
import { store } from '../../backend/src/models/store.js';

describe('Pruebas Unitarias del Algoritmo de Fusión de Carritos (Cart Merge)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('debe sumar cantidades de productos coincidentes si no superan el stock disponible', () => {
    // Carrito remoto: 1 unidad de var-001-azul (stock 5)
    const remoteCart = new Cart({ usuarioId: 'usr-1' });
    CartService.addItem(remoteCart, { varianteId: 'var-001-azul', cantidad: 1 });
    store.saveCart('usr-1', remoteCart);

    // Carrito local: 2 unidades de var-001-azul y 1 de var-002-natural (stock 3)
    const localItems = [
      { varianteId: 'var-001-azul', cantidad: 2 },
      { varianteId: 'var-002-natural', cantidad: 1 }
    ];

    const { carrito, avisosReajuste } = CartService.fusionarCarritos('usr-1', localItems);

    assert.equal(carrito.items.length, 2);
    const var1 = carrito.items.find(i => i.varianteId === 'var-001-azul');
    const var2 = carrito.items.find(i => i.varianteId === 'var-002-natural');

    assert.equal(var1.cantidad, 3);
    assert.equal(var2.cantidad, 1);
    assert.equal(avisosReajuste.length, 0);
  });

  it('debe recortar al stock máximo disponible y emitir aviso si la suma supera las existencias', () => {
    // Carrito remoto: 2 unidades de var-002-natural (stock total 3)
    const remoteCart = new Cart({ usuarioId: 'usr-1' });
    CartService.addItem(remoteCart, { varianteId: 'var-002-natural', cantidad: 2 });
    store.saveCart('usr-1', remoteCart);

    // Carrito local anónimo: 2 unidades más (total pretendido: 4, disponible: 3)
    const localItems = [
      { varianteId: 'var-002-natural', cantidad: 2 }
    ];

    const { carrito, avisosReajuste } = CartService.fusionarCarritos('usr-1', localItems);

    const item = carrito.items.find(i => i.varianteId === 'var-002-natural');
    assert.equal(item.cantidad, 3);
    assert.equal(avisosReajuste.length, 1);
    assert.equal(avisosReajuste[0].tipo, 'stock_reajustado');
    assert.equal(avisosReajuste[0].cantidadNueva, 3);
  });

  it('debe marcar artículos como no disponibles si fueron archivados o despublicados en catálogo', () => {
    // Archivar var-004-unico
    const variant = store.getVariantById('var-004-unico');
    variant.estado = 'archivada';

    const localItems = [
      { varianteId: 'var-004-unico', cantidad: 1 }
    ];

    const { carrito, avisosReajuste } = CartService.fusionarCarritos('usr-1', localItems);
    const item = carrito.items.find(i => i.varianteId === 'var-004-unico');

    assert.equal(item.estado, 'no_disponible');
    assert.equal(item.subtotalLinea, 0.00);
    assert.equal(carrito.estado, 'bloqueado');
    assert.ok(avisosReajuste.some(a => a.tipo === 'producto_no_disponible'));
  });
});
