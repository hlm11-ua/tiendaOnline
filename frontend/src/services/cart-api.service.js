/**
 * Cliente HTTP frontend para interactuar con la API del carrito (Feature 002)
 * Contrato: specs/002-carrito-persistente/contracts/cart-api.yaml
 * Si existe una sesión de usuario (Feature 004), envía el token para que el
 * carrito quede vinculado a esa cuenta en el servidor.
 */
import { SESSION_TOKEN_KEY } from './account-api.service.js';

export class CartApiService {
  static getSessionToken() {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  static async request(endpoint, options = {}) {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.mensaje || 'Error al comunicarse con el servidor.');
      error.codigo = data.codigo || 'ERROR_PETICION';
      error.status = res.status;
      error.varianteId = data.varianteId || null;
      error.stockDisponible = data.stockDisponible;
      error.cantidadSolicitada = data.cantidadSolicitada;
      throw error;
    }

    return data;
  }

  static async getCarrito(usuarioId = null) {
    return this.request('/api/carrito', {
      headers: this.buildSessionHeaders(usuarioId)
    });
  }

  static async addItem({ varianteId, cantidad }, usuarioId = null) {
    return this.request('/api/carrito/items', {
      method: 'POST',
      headers: this.buildSessionHeaders(usuarioId),
      body: JSON.stringify({ varianteId, cantidad })
    });
  }

  static async actualizarCantidad(varianteId, cantidad, usuarioId = null) {
    return this.request(`/api/carrito/items/${encodeURIComponent(varianteId)}`, {
      method: 'PUT',
      headers: this.buildSessionHeaders(usuarioId),
      body: JSON.stringify({ cantidad })
    });
  }

  static async eliminarItem(varianteId, usuarioId = null) {
    return this.request(`/api/carrito/items/${encodeURIComponent(varianteId)}`, {
      method: 'DELETE',
      headers: this.buildSessionHeaders(usuarioId)
    });
  }

  static async vaciarCarrito(usuarioId = null) {
    return this.request('/api/carrito', {
      method: 'DELETE',
      headers: this.buildSessionHeaders(usuarioId)
    });
  }

  static async validarStock(items) {
    return this.request('/api/carrito/validar-stock', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  }

  static async fusionarCarritos({ usuarioId, itemsLocales }) {
    return this.request('/api/carrito/fusionar', {
      method: 'POST',
      body: JSON.stringify({ usuarioId, itemsLocales })
    });
  }

  static buildSessionHeaders(usuarioId) {
    const headers = {};
    if (usuarioId) {
      headers['x-usuario-id'] = String(usuarioId);
    }
    const token = this.getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
    }
    return headers;
  }
}
