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

describe('Pruebas de Integración: Flujo de Catálogo Público y Filtros Combinados (Feature 001)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('User Story 1: Navegación y Filtrado por Categorías (P1)', () => {
    it('debe filtrar exclusivamente los productos de la categoría seleccionada por slug (Cerámica)', async () => {
      const res = await request('/api/catalogo/productos?categoria=ceramica');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.categoriaSlug, 'ceramica');
        assert.equal(prod.categoriaNombre, 'Cerámica');
      }
    });

    it('debe filtrar por categoría seleccionada por ID (cat-textil)', async () => {
      const res = await request('/api/catalogo/productos?categoria=cat-textil');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.categoriaId, 'cat-textil');
      }
    });

    it('debe devolver todos los productos activos cuando se consulta "todas" o sin parámetro', async () => {
      const resTodas = await request('/api/catalogo/productos?categoria=todas');
      const resSinFiltro = await request('/api/catalogo/productos');
      assert.equal(resTodas.status, 200);
      assert.equal(resSinFiltro.status, 200);
      assert.equal(resTodas.body.total, resSinFiltro.body.total);
      assert.ok(resTodas.body.total >= 4);
    });

    it('debe devolver lista vacía de forma elegante cuando la categoría no existe', async () => {
      const res = await request('/api/catalogo/productos?categoria=categoria-inexistente');
      assert.equal(res.status, 200);
      assert.equal(res.body.total, 0);
      assert.deepEqual(res.body.productos, []);
    });
  });

  describe('User Story 2: Filtrado Combinado Multidimensional (P1)', () => {
    it('debe filtrar productos dentro de un rango de precios válido (20,00 € a 50,00 €)', async () => {
      const res = await request('/api/catalogo/productos?minPrecio=20&maxPrecio=50');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.ok(prod.precioBase >= 20.00 && prod.precioBase <= 50.00);
      }
    });

    it('debe tolerar e invertir ordenadamente si minPrecio > maxPrecio (80 y 20)', async () => {
      const res = await request('/api/catalogo/productos?minPrecio=80&maxPrecio=20');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.ok(prod.precioBase >= 20.00 && prod.precioBase <= 80.00);
      }
    });

    it('debe filtrar exclusivamente por productor (Taller Hermanos Alfareros)', async () => {
      const res = await request('/api/catalogo/productos?productor=Taller%20Hermanos%20Alfareros');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.artesano.toLowerCase(), 'taller hermanos alfareros');
      }
    });

    it('debe filtrar solo productos con disponibilidad en stock (enStock=true)', async () => {
      const res = await request('/api/catalogo/productos?enStock=true');
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.enStock, true);
        assert.ok(prod.stockDisponible > 0);
      }
    });

    it('debe aplicar la conjunción lógica AND entre todos los filtros combinados', async () => {
      const res = await request(
        '/api/catalogo/productos?categoria=ceramica&minPrecio=10&maxPrecio=60&productor=Taller%20Hermanos%20Alfareros&enStock=true'
      );
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.categoriaSlug, 'ceramica');
        assert.ok(prod.precioBase >= 10 && prod.precioBase <= 60);
        assert.equal(prod.artesano, 'Taller Hermanos Alfareros');
        assert.equal(prod.enStock, true);
      }
    });
  });

  describe('User Story 3: Sincronización Bidireccional con la URL y Optimización SEO (P2)', () => {
    it('debe reflejar y normalizar los filtros activos en filtrosAplicados para su sincronización con la URL', async () => {
      const res = await request(
        '/api/catalogo/productos?categoria=ceramica&minPrecio=15&maxPrecio=60&enStock=true'
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.filtrosAplicados.categoria, 'ceramica');
      assert.equal(res.body.filtrosAplicados.minPrecio, 15);
      assert.equal(res.body.filtrosAplicados.maxPrecio, 60);
      assert.equal(res.body.filtrosAplicados.enStock, true);
    });

    it('debe ignorar parámetros de consulta desconocidos o adicionales sin romper el filtrado (ej. utm_source)', async () => {
      const res = await request(
        '/api/catalogo/productos?categoria=ceramica&utm_source=newsletter&campana=otono'
      );
      assert.equal(res.status, 200);
      assert.ok(res.body.productos.length > 0);
      for (const prod of res.body.productos) {
        assert.equal(prod.categoriaSlug, 'ceramica');
      }
    });

    it('debe sanear entradas no numéricas en los precios sin provocar error 500', async () => {
      const res = await request('/api/catalogo/productos?minPrecio=invalido&maxPrecio=texto');
      assert.equal(res.status, 200);
      assert.equal(res.body.filtrosAplicados.minPrecio, null);
      assert.equal(res.body.filtrosAplicados.maxPrecio, null);
      assert.ok(res.body.productos.length > 0);
    });

    it('debe normalizar precios negativos a cero', async () => {
      const res = await request('/api/catalogo/productos?minPrecio=-25&maxPrecio=50');
      assert.equal(res.status, 200);
      assert.equal(res.body.filtrosAplicados.minPrecio, 0);
      assert.equal(res.body.filtrosAplicados.maxPrecio, 50);
    });
  });

  describe('User Story 4: Estado Vacío y Restablecimiento Completo de Filtros (P3)', () => {
    it('debe devolver total: 0 y lista vacía cuando no existen productos coincidentes (FR-008)', async () => {
      const res = await request('/api/catalogo/productos?minPrecio=1000&maxPrecio=2000');
      assert.equal(res.status, 200);
      assert.equal(res.body.total, 0);
      assert.deepEqual(res.body.productos, []);
    });

    it('debe devolver total: 0 cuando la combinación de productor y categoría no arroja resultados', async () => {
      const res = await request('/api/catalogo/productos?categoria=madera&productor=Taller%20Hermanos%20Alfareros');
      assert.equal(res.status, 200);
      assert.equal(res.body.total, 0);
      assert.deepEqual(res.body.productos, []);
    });

    it('debe permitir la recuperación completa del catálogo al limpiar los filtros (FR-005, FR-009)', async () => {
      // 1. Búsqueda restrictiva sin productos
      const resVacia = await request('/api/catalogo/productos?minPrecio=9999');
      assert.equal(resVacia.status, 200);
      assert.equal(resVacia.body.total, 0);

      // 2. Consulta restablecida (sin filtros)
      const resRestablecida = await request('/api/catalogo/productos');
      assert.equal(resRestablecida.status, 200);
      assert.ok(resRestablecida.body.total >= 4);
      assert.ok(resRestablecida.body.productos.length >= 4);
    });
  });
});
