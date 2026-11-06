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

describe('Contratos de API Pública de Catálogo (/api/catalogo)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('GET /api/catalogo/filtros', () => {
    it('debe devolver la lista de categorías activas, artesanos y rango de precios (200)', async () => {
      const res = await request('/api/catalogo/filtros');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.categorias), 'categorias debe ser un array');
      assert.ok(Array.isArray(res.body.productores), 'productores debe ser un array');
      assert.ok(res.body.rangoPrecio, 'rangoPrecio debe existir');
      assert.equal(typeof res.body.rangoPrecio.min, 'number');
      assert.equal(typeof res.body.rangoPrecio.max, 'number');

      // Validar estructura de categorías
      if (res.body.categorias.length > 0) {
        const cat = res.body.categorias[0];
        assert.ok(cat.id, 'debe tener id');
        assert.ok(cat.nombre, 'debe tener nombre');
        assert.ok(cat.slug, 'debe tener slug');
        assert.equal(typeof cat.totalProductos, 'number');
      }
    });
  });

  describe('GET /api/catalogo/productos', () => {
    it('debe devolver el catálogo completo cuando no se aplican filtros (200)', async () => {
      const res = await request('/api/catalogo/productos');
      assert.equal(res.status, 200);
      assert.equal(typeof res.body.total, 'number');
      assert.ok(Array.isArray(res.body.productos), 'productos debe ser un array');
      assert.ok(res.body.filtrosAplicados, 'filtrosAplicados debe estar presente');

      if (res.body.productos.length > 0) {
        const p = res.body.productos[0];
        assert.ok(p.id, 'debe tener id');
        assert.ok(p.titulo, 'debe tener titulo');
        assert.ok(p.categoriaId, 'debe tener categoriaId');
        assert.ok(p.categoriaNombre, 'debe tener categoriaNombre');
        assert.ok(p.categoriaSlug, 'debe tener categoriaSlug');
        assert.ok(p.artesano, 'debe tener artesano');
        assert.equal(typeof p.precioBase, 'number');
        assert.ok(p.precioFormateado.includes('€'), 'precioFormateado debe contener el símbolo €');
        assert.equal(p.moneda, 'EUR');
        assert.equal(typeof p.enStock, 'boolean');
        assert.equal(typeof p.stockDisponible, 'number');
      }
    });
  });

  describe('GET /api/catalogo/productos/:id', () => {
    it('debe devolver el detalle de un producto existente (200)', async () => {
      const res = await request('/api/catalogo/productos/art-001');
      assert.equal(res.status, 200);
      assert.equal(res.body.id, 'art-001');
      assert.ok(res.body.titulo);
      assert.ok(res.body.precioFormateado.includes('€'));
    });

    it('debe devolver 404 cuando el producto no existe', async () => {
      const res = await request('/api/catalogo/productos/art-inexistente');
      assert.equal(res.status, 404);
      assert.equal(res.body.codigo, 'PRODUCTO_NO_ENCONTRADO');
    });
  });
});
