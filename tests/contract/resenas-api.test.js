import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';

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

describe('Contratos de API de Reseñas y Valoraciones (/api/resenas)', () => {
  const PRODUCTO_ID = 'art-001';
  const USUARIO_ID = 'usr-comprador-test';
  const USUARIO_EMAIL = 'comprador.test@example.com';
  const USUARIO_NOMBRE = 'Cliente Comprador';

  beforeEach(() => {
    store.reset();
  });

  describe('GET /api/resenas/producto/:productoId', () => {
    it('debe devolver el resumen con media 0 y lista vacía si no hay reseñas (200)', async () => {
      const res = await request(`/api/resenas/producto/${PRODUCTO_ID}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.productoId, PRODUCTO_ID);
      assert.equal(res.body.media, 0);
      assert.equal(res.body.total, 0);
      assert.ok(Array.isArray(res.body.items));
      assert.equal(res.body.items.length, 0);
      assert.ok(res.body.distribucion);
    });

    it('debe devolver 404 si el producto no existe en el catálogo', async () => {
      const res = await request('/api/resenas/producto/prod-inexistente-xyz');
      assert.equal(res.status, 404);
      assert.ok(res.body.error || res.body.codigo);
    });
  });

  describe('GET /api/resenas/elegibilidad/:productoId', () => {
    it('debe devolver puedeValorar: false con SIN_COMPRA para usuario sin compras (200)', async () => {
      const res = await request(`/api/resenas/elegibilidad/${PRODUCTO_ID}`, {
        headers: {
          'x-usuario-id': 'usr-sin-compra-1',
          'x-usuario-email': 'sincompra@example.com'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.puedeValorar, false);
      assert.equal(res.body.motivo, CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.NO_PURCHASE);
      assert.ok(res.body.mensaje.includes('comprado'));
    });

    it('debe devolver puedeValorar: true con COMPRA_VERIFICADA si tiene pedido entregado o pagado (200)', async () => {
      // Registrar pedido pagado en el store
      store.saveOrder({
        id: 'ped-test-01',
        codigoReferencia: 'PED-TEST-01',
        clienteEmail: USUARIO_EMAIL,
        cuentaId: USUARIO_ID,
        estado: CONSTANTS.ORDER_STATUS.PAID,
        lineas: [
          {
            productoId: PRODUCTO_ID,
            varianteId: 'var-001-azul',
            titulo: 'Jarrón azul',
            precioUnitario: 45,
            cantidad: 1
          }
        ]
      });

      const res = await request(`/api/resenas/elegibilidad/${PRODUCTO_ID}`, {
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.puedeValorar, true);
      assert.equal(res.body.motivo, CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.VERIFIED_PURCHASE);
    });
  });

  describe('POST /api/resenas', () => {
    it('debe devolver 403 si el usuario intenta publicar sin compra verificada', async () => {
      const res = await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': 'usr-intruso',
          'x-usuario-email': 'intruso@example.com'
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 5,
          comentario: 'Intento de reseña sin compra previa'
        })
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.codigo, 'COMPRA_REQUERIDA');
    });

    it('debe devolver 400 si la puntuación no está entre 1 y 5', async () => {
      // Simular compra para que pase la verificación de compra
      store.saveOrder({
        id: 'ped-test-02',
        clienteEmail: USUARIO_EMAIL,
        cuentaId: USUARIO_ID,
        estado: CONSTANTS.ORDER_STATUS.DELIVERED,
        lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
      });

      const res = await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 7,
          comentario: 'Puntuación fuera de rango'
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'PUNTUACION_INVALIDA');
    });

    it('debe devolver 400 si el comentario está vacío o solo tiene espacios', async () => {
      store.saveOrder({
        id: 'ped-test-03',
        clienteEmail: USUARIO_EMAIL,
        cuentaId: USUARIO_ID,
        estado: CONSTANTS.ORDER_STATUS.DELIVERED,
        lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
      });

      const res = await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 5,
          comentario: '    '
        })
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.codigo, 'COMENTARIO_OBLIGATORIO');
    });

    it('debe publicar la reseña (201) para comprador verificado', async () => {
      store.saveOrder({
        id: 'ped-test-04',
        clienteEmail: USUARIO_EMAIL,
        cuentaId: USUARIO_ID,
        estado: CONSTANTS.ORDER_STATUS.DELIVERED,
        lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
      });

      const res = await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL,
          'x-usuario-nombre': USUARIO_NOMBRE
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 5,
          comentario: 'Excelente artesanía, muy satisfecho con la compra.'
        })
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.resena.productoId, PRODUCTO_ID);
      assert.equal(res.body.resena.puntuacion, 5);
      assert.equal(res.body.resena.usuarioNombre, USUARIO_NOMBRE);
      assert.equal(res.body.resumen.media, 5);
      assert.equal(res.body.resumen.total, 1);
    });

    it('debe denegar duplicados (409) si el usuario ya valoró el producto', async () => {
      store.saveOrder({
        id: 'ped-test-05',
        clienteEmail: USUARIO_EMAIL,
        cuentaId: USUARIO_ID,
        estado: CONSTANTS.ORDER_STATUS.DELIVERED,
        lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
      });

      // Primer envío
      await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 4,
          comentario: 'Primera reseña válida.'
        })
      });

      // Segundo envío repetido
      const resDup = await request('/api/resenas', {
        method: 'POST',
        headers: {
          'x-usuario-id': USUARIO_ID,
          'x-usuario-email': USUARIO_EMAIL
        },
        body: JSON.stringify({
          productoId: PRODUCTO_ID,
          puntuacion: 5,
          comentario: 'Segundo intento duplicado.'
        })
      });

      assert.equal(resDup.status, 409);
      assert.equal(resDup.body.codigo, 'VALORACION_DUPLICADA');
    });
  });
});
