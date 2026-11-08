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

describe('Batería de Validación Automatizada de Escenarios de quickstart.md (Feature 001 - Catálogo Público)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Escenario 1: Navegación y Filtrado por Categoría (Story 1, P1)', async () => {
    // Paso 1.1: Obtener metadatos de categorías activas
    const resFiltros = await request('/api/catalogo/filtros');
    assert.equal(resFiltros.status, 200);
    assert.ok(resFiltros.body.categorias.length >= 3);
    const catCeramica = resFiltros.body.categorias.find(c => c.slug === 'ceramica' || c.nombre === 'Cerámica');
    assert.ok(catCeramica, 'Debe existir la categoría Cerámica');

    // Paso 1.2: Filtrar productos por la categoría "Cerámica"
    const resProductos = await request('/api/catalogo/productos?categoria=ceramica');
    assert.equal(resProductos.status, 200);
    assert.ok(resProductos.body.productos.length > 0);
    for (const prod of resProductos.body.productos) {
      assert.equal(prod.categoriaSlug, 'ceramica');
    }
  });

  it('Escenario 2: Filtrado Combinado Multidimensional (Story 2, P1)', async () => {
    // Paso 2.1: Filtrar por rango de precio (10,00 € a 50,00 €) y disponibilidad en stock
    const resPrecioStock = await request('/api/catalogo/productos?minPrecio=10&maxPrecio=50&enStock=true');
    assert.equal(resPrecioStock.status, 200);
    assert.ok(resPrecioStock.body.productos.length > 0);
    for (const prod of resPrecioStock.body.productos) {
      assert.ok(prod.precioBase >= 10 && prod.precioBase <= 50);
      assert.equal(prod.enStock, true);
    }

    // Paso 2.2: Combinar categoría, productor y stock
    const resCombinado = await request(
      '/api/catalogo/productos?categoria=ceramica&productor=Taller%20Hermanos%20Alfareros&enStock=true'
    );
    assert.equal(resCombinado.status, 200);
    assert.ok(resCombinado.body.productos.length > 0);
    for (const prod of resCombinado.body.productos) {
      assert.equal(prod.categoriaSlug, 'ceramica');
      assert.equal(prod.artesano, 'Taller Hermanos Alfareros');
      assert.equal(prod.enStock, true);
    }
  });

  it('Escenario 3: Sincronización Bidireccional con la URL (Story 3, P2)', async () => {
    // Paso 3.1: Acceso directo por URL simulado
    const resDirecto = await request(
      '/api/catalogo/productos?categoria=madera&minPrecio=20&maxPrecio=100&enStock=true'
    );
    assert.equal(resDirecto.status, 200);
    assert.equal(resDirecto.body.filtrosAplicados.categoria, 'madera');
    assert.equal(resDirecto.body.filtrosAplicados.minPrecio, 20);
    assert.equal(resDirecto.body.filtrosAplicados.maxPrecio, 100);
    assert.equal(resDirecto.body.filtrosAplicados.enStock, true);
    for (const prod of resDirecto.body.productos) {
      assert.equal(prod.categoriaSlug, 'madera');
      assert.ok(prod.precioBase >= 20 && prod.precioBase <= 100);
      assert.equal(prod.enStock, true);
    }
  });

  it('Escenario 4: Estado Vacío y Restablecimiento Completo de Filtros (Story 4, P3)', async () => {
    // Paso 4.1: Introducir un filtro sin coincidencias
    const resSinResultados = await request('/api/catalogo/productos?minPrecio=1000&maxPrecio=2000');
    assert.equal(resSinResultados.status, 200);
    assert.equal(resSinResultados.body.total, 0);
    assert.deepEqual(resSinResultados.body.productos, []);

    // Paso 4.2: Simular restablecimiento de filtros
    const resRestablecido = await request('/api/catalogo/productos');
    assert.equal(resRestablecido.status, 200);
    assert.ok(resRestablecido.body.total >= 4);
    assert.ok(resRestablecido.body.productos.length >= 4);
  });

  it('Escenario 5: Casos Límite y Tolerancia a Fallos', async () => {
    // Paso 5.1: Precios invertidos (minPrecio > maxPrecio)
    const resInvertidos = await request('/api/catalogo/productos?minPrecio=80&maxPrecio=20');
    assert.equal(resInvertidos.status, 200);
    assert.equal(resInvertidos.body.filtrosAplicados.minPrecio, 20);
    assert.equal(resInvertidos.body.filtrosAplicados.maxPrecio, 80);
    assert.ok(resInvertidos.body.productos.length > 0);

    // Paso 5.2: Categoría inexistente
    const resInexistente = await request('/api/catalogo/productos?categoria=inexistente');
    assert.equal(resInexistente.status, 200);
    assert.equal(resInexistente.body.total, 0);
    assert.deepEqual(resInexistente.body.productos, []);
  });
});
