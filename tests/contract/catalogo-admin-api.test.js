import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';

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

describe('Contratos de API Administración de Catálogo (/api/admin)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('Control de Acceso por Rol (FR-001)', () => {
    it('debe denegar acceso (403) si no se proporciona el rol admin', async () => {
      const res = await request('/api/admin/categorias');
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
      assert.ok(res.body.mensaje.includes('Acceso restringido'));
    });

    it('debe permitir acceso cuando se proporciona la cabecera x-user-role: admin', async () => {
      const res = await request('/api/admin/categorias', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.categorias));
    });
  });

  describe('Categorías (/api/admin/categorias)', () => {
    it('GET /api/admin/categorias debe listar categorías (200)', async () => {
      const res = await request('/api/admin/categorias', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.categorias.length >= 4);
      const cat = res.body.categorias.find(c => c.id === 'cat-ceramica');
      assert.ok(cat);
      assert.equal(cat.nombre, 'Cerámica');
    });

    it('POST /api/admin/categorias debe crear una categoría válida (201)', async () => {
      const res = await request('/api/admin/categorias', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({
          nombre: 'Vidrio Soplado',
          descripcion: 'Piezas artesanales modeladas con técnica de caña y fuego.'
        })
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.categoria);
      assert.equal(res.body.categoria.nombre, 'Vidrio Soplado');
      assert.equal(res.body.categoria.slug, 'vidrio-soplado');
    });

    it('POST /api/admin/categorias debe devolver 400 si el nombre es inválido', async () => {
      const res = await request('/api/admin/categorias', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({ nombre: ' ' })
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'CATEGORIA_NOMBRE_INVALIDO');
    });

    it('PUT /api/admin/categorias/:id debe actualizar los datos de la categoría (200)', async () => {
      const res = await request('/api/admin/categorias/cat-ceramica', {
        method: 'PUT',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({
          nombre: 'Cerámica y Barro Cocido',
          descripcion: 'Piezas tradicionales de barro rojo y gres.'
        })
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.categoria.nombre, 'Cerámica y Barro Cocido');
    });

    it('PATCH /api/admin/categorias/:id/archivar debe bloquear el archivado si tiene productos activos (409)', async () => {
      const res = await request('/api/admin/categorias/cat-ceramica/archivar', {
        method: 'PATCH',
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'CONFLICT_ACTIVE_PRODUCTS');
      assert.ok(res.body.mensaje.includes('contiene productos activos'));
    });

    it('PATCH /api/admin/categorias/:id/archivar debe archivar si no tiene productos asociados (200)', async () => {
      // Crear categoría vacía
      const createRes = await request('/api/admin/categorias', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({ nombre: 'Cuero y Marroquinería' })
      });
      const catId = createRes.body.categoria.id;

      const archRes = await request(`/api/admin/categorias/${catId}/archivar`, {
        method: 'PATCH',
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(archRes.status, 200);
      assert.equal(archRes.body.categoria.estado, 'archivada');
    });
  });

  describe('Productos (/api/admin/productos)', () => {
    it('GET /api/admin/productos debe listar productos con variantes e indicadores (200)', async () => {
      const res = await request('/api/admin/productos', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.productos));
      assert.ok(res.body.productos.length >= 4);
      const prod = res.body.productos.find(p => p.id === 'art-001');
      assert.ok(prod);
      assert.ok(Array.isArray(prod.variantes));
    });

    it('POST /api/admin/productos debe crear un producto con fotos y variantes (201)', async () => {
      const nuevoProducto = {
        titulo: 'Cuenco Rústico de Arcilla',
        descripcion: 'Cuenco esmaltado en ceniza volcánica para ensaladas.',
        categoriaId: 'cat-ceramica',
        artesano: 'Cerámicas del Sur',
        precioBase: 26.00,
        imagenes: [
          {
            url: '/public/uploads/cuenco-1.webp',
            nombreArchivo: 'cuenco-1.webp',
            mimeType: 'image/webp',
            tamanoBytes: 300000,
            esPrincipal: true
          }
        ],
        variantes: [
          {
            nombre: 'Pequeño',
            stockTotal: 4,
            umbralAlerta: 2
          },
          {
            nombre: 'Mediano',
            stockTotal: 1,
            umbralAlerta: 2
          }
        ]
      };

      const res = await request('/api/admin/productos', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify(nuevoProducto)
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.producto);
      assert.equal(res.body.producto.titulo, 'Cuenco Rústico de Arcilla');
      assert.equal(res.body.producto.variantes.length, 2);
      assert.equal(res.body.producto.precioBase, 26.00);
    });

    it('POST /api/admin/productos debe crear automáticamente variante "Única" si no se envían variantes', async () => {
      const nuevoProducto = {
        titulo: 'Botijo Tradicional de Cerámica',
        descripcion: 'Botijo clásico sin vidriar que enfría el agua por transpiración.',
        categoriaId: 'cat-ceramica',
        artesano: 'Alfarería Popular',
        precioBase: 19.50,
        imagenes: [
          {
            url: '/public/uploads/botijo.webp',
            mimeType: 'image/webp'
          }
        ]
      };

      const res = await request('/api/admin/productos', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify(nuevoProducto)
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.producto.variantes.length, 1);
      assert.equal(res.body.producto.variantes[0].nombre, 'Única');
      assert.equal(res.body.producto.variantes[0].umbralAlerta, 3);
    });

    it('POST /api/admin/productos debe rechazar más de 5 imágenes (400)', async () => {
      const imagenesExcesivas = Array(6).fill(null).map((_, i) => ({
        url: `/public/uploads/foto-${i}.webp`,
        mimeType: 'image/webp',
        tamanoBytes: 1000
      }));

      const res = await request('/api/admin/productos', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({
          titulo: 'Producto Test Fotos',
          descripcion: 'Descripción válida de prueba con longitud suficiente.',
          categoriaId: 'cat-ceramica',
          artesano: 'Test Artesano',
          precioBase: 15.00,
          imagenes: imagenesExcesivas
        })
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'PRODUCTO_DEMASIADAS_IMAGENES');
    });

    it('POST /api/admin/productos debe rechazar imágenes mayores a 5 MB (400)', async () => {
      const res = await request('/api/admin/productos', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({
          titulo: 'Producto Test Tamaño',
          descripcion: 'Descripción válida de prueba con longitud suficiente.',
          categoriaId: 'cat-ceramica',
          artesano: 'Test Artesano',
          precioBase: 15.00,
          imagenes: [
            {
              url: '/public/uploads/pesada.jpg',
              mimeType: 'image/jpeg',
              tamanoBytes: 6 * 1024 * 1024 // 6 MB
            }
          ]
        })
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'IMAGEN_TAMANO_EXCEDIDO');
    });
  });

  describe('Stock y Alertas (/api/admin/variantes y /api/admin/alertas-stock)', () => {
    it('PATCH /api/admin/variantes/:id/stock debe actualizar el stock físico y recalcular alerta (200)', async () => {
      const res = await request('/api/admin/variantes/var-001-azul/stock', {
        method: 'PATCH',
        headers: { 'x-user-role': 'admin' },
        body: JSON.stringify({ stockTotal: 2, umbralAlerta: 3 })
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.variante.stockTotal, 2);
      assert.equal(res.body.alerta.estadoAlerta, 'stock_bajo');
    });

    it('GET /api/admin/alertas-stock debe devolver la lista de variantes bajo el umbral (200)', async () => {
      const res = await request('/api/admin/alertas-stock', {
        headers: { 'x-user-role': 'admin' }
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.alertas));
      assert.ok(res.body.alertas.length >= 2);
      // var-002-natural tiene stock 3 con umbral 3 -> stock_bajo
      // var-004-unico tiene stock 1 con umbral 2 -> stock_bajo
      const var2 = res.body.alertas.find(a => a.varianteId === 'var-002-natural');
      assert.ok(var2);
      assert.equal(var2.estadoAlerta, 'stock_bajo');
    });
  });
});
