import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order, OrderLine } from '../../backend/src/models/order.model.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';

// Helper ligero para peticiones HTTP
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

describe('Pruebas de Integración: Ciclo de Vida del Catálogo y Alertas de Stock', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Flujo completo de catálogo: Crear categoría -> Alta producto con variantes -> Verificación de alerta visual', async () => {
    // 1. Crear categoría
    const catRes = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        nombre: 'Forja y Cerrajería',
        descripcion: 'Piezas artesanales de hierro y fragua tradicional.'
      })
    });
    assert.equal(catRes.status, 201);
    const catId = catRes.body.categoria.id;

    // 2. Dar de alta producto con dos variantes: una con stock seguro (5) y otra en umbral (2 con umbral 2)
    const prodRes = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Aldaba de Hierro Forjado Tradicional',
        descripcion: 'Aldaba artesanal forjada a yunque con pátina de cera natural.',
        categoriaId: catId,
        artesano: 'Herrería Los Pinos',
        precioBase: 55.00,
        imagenes: [
          {
            url: '/public/uploads/aldaba-hierro.webp',
            mimeType: 'image/webp',
            tamanoBytes: 450000,
            esPrincipal: true
          }
        ],
        variantes: [
          {
            nombre: 'Acabado Rústico Negro',
            stockTotal: 5,
            umbralAlerta: 2
          },
          {
            nombre: 'Acabado Bronce Envejecido',
            stockTotal: 2,
            umbralAlerta: 2
          }
        ]
      })
    });
    assert.equal(prodRes.status, 201);
    const producto = prodRes.body.producto;
    assert.equal(producto.precioBase, 55.00);
    assert.equal(producto.variantes.length, 2);

    // 3. Consultar la lista de productos filtrando por alertas activas
    const listRes = await request('/api/admin/productos?soloAlertas=true', {
      headers: { 'x-user-role': 'admin' }
    });
    assert.equal(listRes.status, 200);
    const aldaba = listRes.body.productos.find(p => p.id === producto.id);
    assert.ok(aldaba, 'El producto debe figurar con alerta activa');
    assert.equal(aldaba.alertaActiva, true);

    // 4. Consultar el endpoint de alertas y verificar que la variante en umbral aparece
    const alertasRes = await request('/api/admin/alertas-stock', {
      headers: { 'x-user-role': 'admin' }
    });
    assert.equal(alertasRes.status, 200);
    const alertaBronce = alertasRes.body.alertas.find(a => a.varianteNombre === 'Acabado Bronce Envejecido');
    assert.ok(alertaBronce);
    assert.equal(alertaBronce.estadoAlerta, 'stock_bajo');
    assert.equal(alertaBronce.stockDisponible, 2);
  });

  it('Sincronización en tiempo real: Venta descuenta stock de la variante y transiciona a "Agotada" (SC-003)', async () => {
    // Tomar producto existente (art-004 / var-004-unico con stock 1)
    const alertaInicialRes = await request('/api/admin/alertas-stock', {
      headers: { 'x-user-role': 'admin' }
    });
    const alertaInicial = alertaInicialRes.body.alertas.find(a => a.varianteId === 'var-004-unico');
    assert.ok(alertaInicial);
    assert.equal(alertaInicial.stockDisponible, 1);
    assert.equal(alertaInicial.estadoAlerta, 'stock_bajo');

    // Simular venta que descuenta el stock directamente en store.inventory
    const invItem = store.getInventoryItem('var-004-unico');
    assert.ok(invItem);
    invItem.stockTotal = 0; // Descuento tras compra de 1 unidad

    // Comprobar inmediatamente que el endpoint de alertas refleja "agotado"
    const alertaPostVentaRes = await request('/api/admin/alertas-stock', {
      headers: { 'x-user-role': 'admin' }
    });
    const alertaPostVenta = alertaPostVentaRes.body.alertas.find(a => a.varianteId === 'var-004-unico');
    assert.ok(alertaPostVenta);
    assert.equal(alertaPostVenta.stockDisponible, 0);
    assert.equal(alertaPostVenta.estadoAlerta, 'agotado');
    assert.equal(alertaPostVenta.mensajeAlerta, 'Agotada');
  });

  it('Integridad histórica: Producto con pedidos históricos se archiva lógicamente en lugar de borrarse físicamente', async () => {
    // 1. Simular un pedido existente para la variante var-001-azul del producto art-001
    const pedidoConProducto = new Order({
      clienteNombre: 'Comprador Histórico',
      clienteEmail: 'historico@example.com',
      total: 45.00,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: 'tx-hist-001',
      lineas: [
        new OrderLine({
          productoId: 'art-001',
          varianteId: 'var-001-azul',
          titulo: 'Jarrón de Cerámica Esmaltada Azul',
          precioUnitario: 45.00,
          cantidad: 1,
          subtotal: 45.00
        })
      ]
    });
    store.saveOrder(pedidoConProducto);

    // 2. Intentar eliminar el producto art-001
    const deleteRes = await request('/api/admin/productos/art-001', {
      method: 'DELETE',
      headers: { 'x-user-role': 'admin' }
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.accion, 'archivado');

    // 3. Verificar que sigue existiendo en store pero en estado 'archivado'
    const prod = store.getProductById('art-001');
    assert.ok(prod);
    assert.equal(prod.estado, 'archivado');
  });
});
