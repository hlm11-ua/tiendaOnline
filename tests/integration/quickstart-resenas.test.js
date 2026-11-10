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

describe('Batería de Validación Automatizada de Escenarios de quickstart.md (Feature 005 - Valoraciones y Reseñas)', () => {
  const PRODUCTO_ID = 'art-001';
  const USUARIO_COMPRADOR = 'usr-comprador-1';
  const EMAIL_COMPRADOR = 'comprador@example.com';
  const NOMBRE_COMPRADOR = 'Carlos Mendoza';

  beforeEach(() => {
    store.reset();
  });

  it('Escenario 1: Restricción para Usuarios Sin Compra Previa (FR-001, FR-002, US-3)', async () => {
    // Paso 1: Consultar elegibilidad sin pedido registrado
    const resEleg = await request(`/api/resenas/elegibilidad/${PRODUCTO_ID}`, {
      headers: {
        'x-usuario-id': 'usr-sin-compra',
        'x-usuario-email': 'sincompra@example.com'
      }
    });

    assert.equal(resEleg.status, 200);
    assert.equal(resEleg.body.puedeValorar, false);
    assert.equal(resEleg.body.motivo, 'SIN_COMPRA');
    assert.ok(resEleg.body.mensaje.toLowerCase().includes('comprado'));

    // Paso 2: Intentar envío directo sin compra
    const resEnvio = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': 'usr-sin-compra',
        'x-usuario-email': 'sincompra@example.com'
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 4,
        comentario: 'Me gustaría comprar esta artesanía'
      })
    });

    assert.equal(resEnvio.status, 403);
    assert.equal(resEnvio.body.codigo, 'COMPRA_REQUERIDA');
    assert.ok(resEnvio.body.mensaje.includes('Solo los clientes que hayan comprado'));
  });

  it('Escenario 2: Publicación de Reseña por Comprador Verificado (FR-003, FR-004, FR-005, FR-009, US-1)', async () => {
    // Paso 1: Crear un pedido entregado/completado en el store
    store.saveOrder({
      id: 'ped-verificado-01',
      codigoReferencia: 'PED-VERIFICADO-01',
      clienteNombre: NOMBRE_COMPRADOR,
      clienteEmail: EMAIL_COMPRADOR,
      cuentaId: USUARIO_COMPRADOR,
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
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

    // Paso 2: Comprobar elegibilidad positiva
    const resEleg = await request(`/api/resenas/elegibilidad/${PRODUCTO_ID}`, {
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      }
    });
    assert.equal(resEleg.status, 200);
    assert.equal(resEleg.body.puedeValorar, true);
    assert.equal(resEleg.body.motivo, 'COMPRA_VERIFICADA');

    // Paso 3: Enviar la reseña
    const resPost = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-nombre': NOMBRE_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 5,
        comentario: 'Excelente calidad de gres y esmalte, exactamente lo que buscaba.'
      })
    });

    assert.equal(resPost.status, 201);
    assert.equal(resPost.body.mensaje, CONSTANTS.REVIEWS.MESSAGES.SUCCESS);
    assert.equal(resPost.body.resena.productoId, PRODUCTO_ID);
    assert.equal(resPost.body.resena.puntuacion, 5);
    assert.equal(resPost.body.resena.usuarioNombre, NOMBRE_COMPRADOR);
    assert.equal(resPost.body.resumen.media, 5);
    assert.equal(resPost.body.resumen.total, 1);
  });

  it('Escenario 3: Límite Estricto de Única Valoración por Producto (FR-007, FR-008, US-2)', async () => {
    // Preparar compra
    store.saveOrder({
      id: 'ped-verificado-02',
      clienteNombre: NOMBRE_COMPRADOR,
      clienteEmail: EMAIL_COMPRADOR,
      cuentaId: USUARIO_COMPRADOR,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
    });

    // Publicar primera valoración
    const primera = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR,
        'x-usuario-nombre': NOMBRE_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 5,
        comentario: 'Primera reseña válida.'
      })
    });
    assert.equal(primera.status, 201);

    // Intentar segunda valoración (duplicada)
    const segunda = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR,
        'x-usuario-nombre': NOMBRE_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 4,
        comentario: 'Segundo comentario duplicado.'
      })
    });

    assert.equal(segunda.status, 409);
    assert.equal(segunda.body.codigo, 'VALORACION_DUPLICADA');
    assert.equal(segunda.body.mensaje, CONSTANTS.REVIEWS.MESSAGES.ALREADY_REVIEWED);

    // Comprobar elegibilidad post-publicación
    const elegPost = await request(`/api/resenas/elegibilidad/${PRODUCTO_ID}`, {
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      }
    });

    assert.equal(elegPost.status, 200);
    assert.equal(elegPost.body.puedeValorar, false);
    assert.equal(elegPost.body.motivo, 'YA_VALORADO');
    assert.ok(elegPost.body.resenaPrevia);
    assert.equal(elegPost.body.resenaPrevia.puntuacion, 5);
  });

  it('Escenario 4: Validación de Campos Obligatorios y Rango de Estrellas (FR-004, FR-005, FR-006)', async () => {
    store.saveOrder({
      id: 'ped-verificado-03',
      clienteEmail: EMAIL_COMPRADOR,
      cuentaId: USUARIO_COMPRADOR,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
    });

    // Caso A: Comentario vacío
    const resVacio = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 5,
        comentario: '   '
      })
    });
    assert.equal(resVacio.status, 400);
    assert.equal(resVacio.body.codigo, 'COMENTARIO_OBLIGATORIO');

    // Caso B: Puntuación menor que 1
    const resMenor = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 0,
        comentario: 'Comentario válido'
      })
    });
    assert.equal(resMenor.status, 400);
    assert.equal(resMenor.body.codigo, 'PUNTUACION_INVALIDA');

    // Caso C: Puntuación mayor que 5
    const resMayor = await request('/api/resenas', {
      method: 'POST',
      headers: {
        'x-usuario-id': USUARIO_COMPRADOR,
        'x-usuario-email': EMAIL_COMPRADOR
      },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 6,
        comentario: 'Comentario válido'
      })
    });
    assert.equal(resMayor.status, 400);
    assert.equal(resMayor.body.codigo, 'PUNTUACION_INVALIDA');
  });

  it('Escenario 5: Visualización Pública y Recálculo Inmediato de Nota Media (FR-011, FR-012, FR-013, US-4)', async () => {
    // 1. Estado inicial sin reseñas
    const resInicial = await request(`/api/resenas/producto/${PRODUCTO_ID}`);
    assert.equal(resInicial.status, 200);
    assert.equal(resInicial.body.media, 0);
    assert.equal(resInicial.body.total, 0);
    assert.equal(resInicial.body.items.length, 0);

    // 2. Comprador 1 publica reseña con 5 estrellas
    store.saveOrder({
      id: 'ped-c1',
      clienteEmail: 'c1@example.com',
      cuentaId: 'usr-c1',
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
      lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
    });

    await request('/api/resenas', {
      method: 'POST',
      headers: { 'x-usuario-id': 'usr-c1', 'x-usuario-email': 'c1@example.com' },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 5,
        comentario: 'Excelente pieza de barro cocido.'
      })
    });

    // 3. Comprador 2 publica reseña con 4 estrellas
    store.saveOrder({
      id: 'ped-c2',
      clienteEmail: 'c2@example.com',
      cuentaId: 'usr-c2',
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
      lineas: [{ productoId: PRODUCTO_ID, cantidad: 1, precioUnitario: 45 }]
    });

    await request('/api/resenas', {
      method: 'POST',
      headers: { 'x-usuario-id': 'usr-c2', 'x-usuario-email': 'c2@example.com' },
      body: JSON.stringify({
        productoId: PRODUCTO_ID,
        puntuacion: 4,
        comentario: 'Muy buena compra, llegó puntual.'
      })
    });

    // 4. Comprobar recálculo de media: (5 + 4) / 2 = 4.5
    const resFinal = await request(`/api/resenas/producto/${PRODUCTO_ID}`);
    assert.equal(resFinal.status, 200);
    assert.equal(resFinal.body.media, 4.5);
    assert.equal(resFinal.body.total, 2);
    assert.equal(resFinal.body.distribucion['5'], 1);
    assert.equal(resFinal.body.distribucion['4'], 1);
    assert.equal(resFinal.body.items.length, 2);
    assert.equal(resFinal.body.items[0].puntuacion, 4); // Más reciente primero
    assert.equal(resFinal.body.items[1].puntuacion, 5);
  });
});
