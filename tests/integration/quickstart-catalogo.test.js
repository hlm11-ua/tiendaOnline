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

describe('Batería de Validación Automatizada de Escenarios de quickstart.md (Feature 006 - Administración de Catálogo)', () => {
  beforeEach(() => {
    store.reset();
  });

  it('Escenario 1: Creación de Categoría y Alta Completa de Producto con Fotos y Variantes (SC-001)', async () => {
    // Paso 1.1: Crear la categoría "Cerámica" (FR-002)
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        nombre: 'Cerámica',
        descripcion: 'Piezas artesanales torneadas a mano en torno de alfarero'
      })
    });

    assert.equal(resCat.status, 201);
    const cat = resCat.body.categoria;
    assert.ok(cat);
    assert.equal(cat.nombre, 'Cerámica');
    assert.ok(cat.slug.startsWith('ceramica'));
    assert.equal(cat.estado, 'activa');
    const categoriaId = cat.id;

    // Paso 1.2: Dar de alta el producto con fotos y variantes (FR-003, FR-004, SC-001)
    const resProd = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Jarrón Artesanal Verde Esmaltado',
        descripcion: 'Jarrón decorativo cocido a 1250 grados con acabado vidriado tradicional.',
        categoriaId,
        artesano: 'Alfarería Sierra',
        precioBase: 38.50,
        imagenes: [
          {
            url: '/public/uploads/jarron-verde-1.webp',
            nombreArchivo: 'jarron-verde-1.webp',
            mimeType: 'image/webp',
            tamanoBytes: 524288,
            esPrincipal: true
          },
          {
            url: '/public/uploads/jarron-verde-2.webp',
            nombreArchivo: 'jarron-verde-2.webp',
            mimeType: 'image/webp',
            tamanoBytes: 480120,
            esPrincipal: false
          }
        ],
        variantes: [
          {
            nombre: 'Pequeño',
            stockTotal: 4,
            umbralAlerta: 2
          },
          {
            nombre: 'Grande',
            stockTotal: 1,
            umbralAlerta: 2
          }
        ]
      })
    });

    assert.equal(resProd.status, 201);
    const prod = resProd.body.producto;
    assert.ok(prod);
    assert.equal(prod.titulo, 'Jarrón Artesanal Verde Esmaltado');
    assert.equal(prod.precioBase, 38.50);
    assert.equal(prod.imagenes.length, 2);
    assert.equal(prod.variantes.length, 2);

    const varGrande = prod.variantes.find(v => v.nombre === 'Grande');
    assert.ok(varGrande);
    assert.equal(varGrande.stockTotal, 1);
    assert.equal(varGrande.estadoAlerta, 'stock_bajo');
  });

  it('Escenario 2: Detección y Resaltado Visual de Alerta de Stock Bajo (SC-002)', async () => {
    // 1. Crear categoría
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        nombre: 'Cerámica',
        descripcion: 'Piezas artesanales'
      })
    });
    const catId = resCat.body.categoria.id;

    // 2. Crear producto con variante Grande (1 ud, umbral 2)
    await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Jarrón Artesanal Verde Esmaltado',
        descripcion: 'Jarrón decorativo cocido a alta temperatura.',
        categoriaId: catId,
        artesano: 'Alfarería Sierra',
        precioBase: 38.50,
        variantes: [
          { nombre: 'Pequeño', stockTotal: 4, umbralAlerta: 2 },
          { nombre: 'Grande', stockTotal: 1, umbralAlerta: 2 }
        ]
      })
    });

    // 3. Consultar la lista de alertas activas (FR-006, SC-002)
    const resAlertas = await request('/api/admin/alertas-stock', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(resAlertas.status, 200);
    assert.ok(Array.isArray(resAlertas.body.alertas));

    const alertaGrande = resAlertas.body.alertas.find(a => a.varianteNombre === 'Grande');
    assert.ok(alertaGrande, 'La variante "Grande" debe figurar en las alertas');
    assert.equal(alertaGrande.estadoAlerta, 'stock_bajo');
    assert.equal(alertaGrande.stockDisponible, 1);
    assert.equal(alertaGrande.umbralAlerta, 2);
    assert.ok(alertaGrande.mensajeAlerta.includes('Stock bajo (1 unidad restante)'));
  });

  it('Escenario 3: Sincronización en Tiempo Real de Ventas y Descuento Instantáneo (SC-003)', async () => {
    // 1. Crear categoría y producto
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({ nombre: 'Cerámica' })
    });
    const catId = resCat.body.categoria.id;

    const resProd = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Jarrón Verde Exclusivo',
        descripcion: 'Pieza única con tirada limitada.',
        categoriaId: catId,
        artesano: 'Alfarería Sierra',
        precioBase: 42.00,
        variantes: [
          { nombre: 'Grande', stockTotal: 1, umbralAlerta: 2 }
        ]
      })
    });
    const varianteGrande = resProd.body.producto.variantes[0];

    // 2. Venta simula descuento directo de inventario (venta checkout o patch stock)
    const resStock = await request(`/api/admin/variantes/${varianteGrande.id}/stock`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({ stockTotal: 0 })
    });
    assert.equal(resStock.status, 200);
    assert.equal(resStock.body.alerta.estadoAlerta, 'agotado');

    // 3. Consultar alertas inmediatamente
    const resAlertas = await request('/api/admin/alertas-stock', {
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(resAlertas.status, 200);
    const alertaAgotada = resAlertas.body.alertas.find(a => a.varianteId === varianteGrande.id);
    assert.ok(alertaAgotada);
    assert.equal(alertaAgotada.estadoAlerta, 'agotado');
    assert.equal(alertaAgotada.stockDisponible, 0);
    assert.equal(alertaAgotada.mensajeAlerta, 'Agotada');
  });

  it('Escenario 4: Bloqueo de Integridad al Archivar Categoría con Productos Activos (FR-002)', async () => {
    // 1. Crear categoría
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({ nombre: 'Cerámica' })
    });
    const catId = resCat.body.categoria.id;

    // 2. Asociar producto activo
    await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Jarrón de Prueba',
        descripcion: 'Descripción para test de integridad referencial.',
        categoriaId: catId,
        artesano: 'Taller Artesano',
        precioBase: 30.00
      })
    });

    // 3. Intentar archivar categoría con producto activo
    const resArchivar = await request(`/api/admin/categorias/${catId}/archivar`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'admin' }
    });

    assert.equal(resArchivar.status, 409);
    assert.equal(resArchivar.body.error, 'CONFLICT_ACTIVE_PRODUCTS');
    assert.ok(resArchivar.body.mensaje.includes('productos activos'));

    // 4. Verificar que permanece activa
    const catActualizada = store.getCategoryById(catId);
    assert.equal(catActualizada.estado, 'activa');
  });

  it('Escenario 5: Creación de Producto sin Variantes Explícitas (Variante Estándar "Única")', async () => {
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({ nombre: 'Barro Tradicional' })
    });
    const catId = resCat.body.categoria.id;

    const res = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Plato Decorativo de Barro Rojo',
        descripcion: 'Plato modelado a torno con arcilla roja y engobes minerales.',
        categoriaId: catId,
        artesano: 'Taller Alfar',
        precioBase: 24.00,
        imagenes: [
          {
            url: '/public/uploads/plato-rojo.webp',
            nombreArchivo: 'plato-rojo.webp',
            mimeType: 'image/webp',
            tamanoBytes: 320000,
            esPrincipal: true
          }
        ]
      })
    });

    assert.equal(res.status, 201);
    const prod = res.body.producto;
    assert.ok(prod);
    assert.equal(prod.variantes.length, 1);
    assert.equal(prod.variantes[0].nombre, 'Única');
    assert.equal(prod.variantes[0].stockTotal, 0);
    assert.equal(prod.variantes[0].umbralAlerta, 3);
  });

  it('Escenario 6: Validación de Límites de Imágenes (Máx. 5 fotos, 5 MB c/u)', async () => {
    const resCat = await request('/api/admin/categorias', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({ nombre: 'Textil' })
    });
    const catId = resCat.body.categoria.id;

    // Intento con 6 imágenes
    const resExcesoFotos = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Test Límites Exceso',
        descripcion: 'Descripción del producto de prueba.',
        categoriaId: catId,
        artesano: 'Test Artesano',
        precioBase: 10.00,
        imagenes: [
          { url: '1.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 },
          { url: '2.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 },
          { url: '3.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 },
          { url: '4.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 },
          { url: '5.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 },
          { url: '6.jpg', mimeType: 'image/jpeg', tamanoBytes: 100 }
        ]
      })
    });

    assert.equal(resExcesoFotos.status, 400);
    assert.ok(resExcesoFotos.body.mensaje.includes('más de 5 imágenes'));

    // Intento con imagen > 5 MB
    const resExcesoTamano = await request('/api/admin/productos', {
      method: 'POST',
      headers: { 'x-user-role': 'admin' },
      body: JSON.stringify({
        titulo: 'Test Límites Tamaño',
        descripcion: 'Descripción del producto de prueba.',
        categoriaId: catId,
        artesano: 'Test Artesano',
        precioBase: 10.00,
        imagenes: [
          { url: 'gigante.jpg', mimeType: 'image/jpeg', tamanoBytes: 6 * 1024 * 1024 }
        ]
      })
    });

    assert.equal(resExcesoTamano.status, 400);
    assert.ok(resExcesoTamano.body.mensaje.includes('5 MB'));
  });

  it('Escenario 7: Control de Acceso por Rol (FR-001)', async () => {
    // Petición sin cabecera x-user-role
    const resSinRol = await request('/api/admin/productos');
    assert.equal(resSinRol.status, 403);
    assert.equal(resSinRol.body.error, 'FORBIDDEN');
    assert.ok(resSinRol.body.mensaje.includes('rol de administrador'));

    // Petición con rol de cliente normal
    const resCliente = await request('/api/admin/productos', {
      headers: { 'x-user-role': 'cliente' }
    });
    assert.equal(resCliente.status, 403);
    assert.equal(resCliente.body.error, 'FORBIDDEN');
  });
});
