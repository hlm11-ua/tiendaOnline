import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/src/server.js';
import { store } from '../../backend/src/models/store.js';
import { Order, OrderLine } from '../../backend/src/models/order.model.js';
import { CONSTANTS } from '../../backend/src/config/constants.js';

// Helper de peticiones HTTP
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

describe('Contratos de API Cuentas y Seguimiento (Feature 004)', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('Autenticación (/api/auth)', () => {
    it('POST /api/auth/registro debe registrar un usuario con éxito y devolver token (201)', async () => {
      const res = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.usuario);
      assert.strictEqual(res.body.usuario.nombre, 'Elena Artesana');
      assert.strictEqual(res.body.usuario.email, 'elena@artesania.es');
      assert.strictEqual(res.body.usuario.rol, 'cliente');
      assert.strictEqual(res.body.usuario.passwordHash, undefined);
      assert.ok(res.body.sesion);
      assert.ok(res.body.sesion.token);
      assert.strictEqual(typeof res.body.sesion.token, 'string');
    });

    it('POST /api/auth/registro debe rechazar contraseñas de menos de 8 caracteres (400)', async () => {
      const res = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'corta'
        })
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.codigo, 'CONTRASENA_CORTA');
    });

    it('POST /api/auth/registro debe rechazar emails duplicados (409)', async () => {
      await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      const res = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Otra',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.codigo, 'EMAIL_DUPLICADO');
    });

    it('POST /api/auth/login debe iniciar sesión y emitir sesión de 30 días (200)', async () => {
      await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.sesion.token);
      assert.strictEqual(res.body.usuario.email, 'elena@artesania.es');
    });

    it('POST /api/auth/login debe rechazar credenciales erróneas (401)', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'inexistente@artesania.es',
          password: 'password123'
        })
      });

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.codigo, 'CREDENCIALES_INVALIDAS');
    });

    it('GET /api/auth/me debe devolver el usuario autenticado (200)', async () => {
      const regRes = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      const token = regRes.body.sesion.token;

      const res = await request('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.usuario.email, 'elena@artesania.es');
    });

    it('POST /api/auth/logout debe invalidar la sesión (200)', async () => {
      const regRes = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });

      const token = regRes.body.sesion.token;

      const logoutRes = await request('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.strictEqual(logoutRes.status, 200);

      // Ahora /api/auth/me debe ser rechazado
      const meRes = await request('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.strictEqual(meRes.status, 401);
    });
  });

  describe('Historial y Fases de Pedidos (/api/pedidos)', () => {
    it('GET /api/pedidos/mis-compras debe rechazar accesos sin autenticación (401)', async () => {
      const res = await request('/api/pedidos/mis-compras', {
        method: 'GET'
      });

      assert.strictEqual(res.status, 401);
    });

    it('GET /api/pedidos/mis-compras debe listar únicamente pedidos propios del comprador (200)', async () => {
      const regElena = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });
      const tokenElena = regElena.body.sesion.token;
      const cuentaIdElena = regElena.body.usuario.id;

      // Crear pedido para Elena
      const pedidoElena = new Order({
        codigoReferencia: 'PED-ELENA-001',
        clienteNombre: 'Elena Artesana',
        clienteEmail: 'elena@artesania.es',
        cuentaId: cuentaIdElena,
        total: 45.00,
        estado: CONSTANTS.ORDER_STATUS.PAID,
        lineas: [
          new OrderLine({
            titulo: 'Plato Cerámico Decorativo',
            precioUnitario: 45.00,
            cantidad: 1,
            subtotal: 45.00
          })
        ]
      });
      store.saveOrder(pedidoElena);

      // Crear pedido para otro cliente
      const pedidoOtro = new Order({
        codigoReferencia: 'PED-OTRO-002',
        clienteNombre: 'Juan Otro',
        clienteEmail: 'juan@otro.com',
        cuentaId: 'otra-cuenta-id',
        total: 80.00,
        estado: CONSTANTS.ORDER_STATUS.PAID,
        lineas: []
      });
      store.saveOrder(pedidoOtro);

      const res = await request('/api/pedidos/mis-compras', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenElena}`
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.total, 1);
      assert.strictEqual(res.body.pedidos[0].codigoReferencia, 'PED-ELENA-001');
    });

    it('GET /api/pedidos/mis-compras/:ref debe prevenir IDOR ante pedidos ajenos (403)', async () => {
      const regElena = await request('/api/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Elena Artesana',
          email: 'elena@artesania.es',
          password: 'password123'
        })
      });
      const tokenElena = regElena.body.sesion.token;

      // Pedido de otro cliente
      const pedidoAjeno = new Order({
        codigoReferencia: 'PED-AJENO-999',
        clienteNombre: 'Carlos Ajeno',
        clienteEmail: 'carlos@ajeno.es',
        cuentaId: 'cuenta-ajena-123',
        total: 120.00,
        estado: CONSTANTS.ORDER_STATUS.PAID,
        lineas: []
      });
      store.saveOrder(pedidoAjeno);

      const res = await request('/api/pedidos/mis-compras/PED-AJENO-999', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenElena}`
        }
      });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.codigo, 'ACCESO_DENEGADO');
    });

    it('PUT /api/pedidos/:ref/fase debe actualizar la fase y tracking con rol admin (200)', async () => {
      const pedido = new Order({
        codigoReferencia: 'PED-FASE-001',
        clienteNombre: 'Elena Artesana',
        clienteEmail: 'elena@artesania.es',
        total: 45.00,
        estado: CONSTANTS.ORDER_STATUS.PAID,
        lineas: []
      });
      store.saveOrder(pedido);

      const res = await request('/api/pedidos/PED-FASE-001/fase', {
        method: 'PUT',
        headers: {
          'x-user-role': 'admin'
        },
        body: JSON.stringify({
          fase: 'salido_tienda',
          numeroSeguimiento: 'CORREOS-ES-123456',
          transportista: 'Correos de España'
        })
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.estado, 'salido_tienda');
      assert.strictEqual(res.body.envio.numeroSeguimiento, 'CORREOS-ES-123456');
    });

    it('PUT /api/pedidos/:ref/fase debe rechazar peticiones no autorizadas (403)', async () => {
      const res = await request('/api/pedidos/PED-FASE-001/fase', {
        method: 'PUT',
        headers: {
          'x-user-role': 'cliente'
        },
        body: JSON.stringify({
          fase: 'salido_tienda',
          numeroSeguimiento: 'CORREOS-ES-123456'
        })
      });

      assert.strictEqual(res.status, 403);
    });
  });
});
