/**
 * Servicio cliente para interactuar con los endpoints de autenticación y compras privadas (Feature 004)
 * Gestiona el token de sesión en localStorage para mantener sesión persistente durante 30 días (SC-002)
 */
export const SESSION_TOKEN_KEY = 'tienda_online_session_token';
export const USER_DATA_KEY = 'tienda_online_user_data';

export class AccountApiService {
  constructor({ authBaseUrl = '/api/auth', orderBaseUrl = '/api/pedidos' } = {}) {
    this.authBaseUrl = authBaseUrl;
    this.orderBaseUrl = orderBaseUrl;
  }

  getToken() {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // Ignorar restricciones locales de almacenamiento
    }
  }

  getUser() {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    try {
      if (user) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_DATA_KEY);
      }
    } catch {
      // Ignorar restricciones locales
    }
  }

  clearSession() {
    this.setToken(null);
    this.setUser(null);
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
    }

    return headers;
  }

  async handleResponse(res) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { mensaje: 'Error al interpretar respuesta del servidor.' };
    }

    if (!res.ok) {
      const error = new Error(data.mensaje || data.error || 'Error en la petición.');
      error.status = res.status;
      error.codigo = data.codigo || 'ERROR_PETICION';
      error.detalles = data;
      throw error;
    }

    return data;
  }

  /**
   * Registra una nueva cuenta de usuario (FR-001)
   */
  async registro({ nombre, email, password }) {
    const res = await fetch(`${this.authBaseUrl}/registro`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ nombre, email, password })
    });

    const data = await this.handleResponse(res);
    if (data.sesion?.token) {
      this.setToken(data.sesion.token);
    }
    if (data.usuario) {
      this.setUser(data.usuario);
    }
    return data;
  }

  /**
   * Inicia sesión con credenciales (FR-002)
   */
  async login({ email, password }) {
    const res = await fetch(`${this.authBaseUrl}/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });

    const data = await this.handleResponse(res);
    if (data.sesion?.token) {
      this.setToken(data.sesion.token);
    }
    if (data.usuario) {
      this.setUser(data.usuario);
    }
    return data;
  }

  /**
   * Obtiene la cuenta asociada a la sesión activa
   */
  async getMe() {
    const res = await fetch(`${this.authBaseUrl}/me`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const data = await this.handleResponse(res);
    // El contrato define el perfil de usuario directamente en el cuerpo
    const usuario = data.usuario || data;
    this.setUser(usuario);
    return usuario;
  }

  /**
   * Cierra la sesión activa (FR-002)
   */
  async logout() {
    try {
      await fetch(`${this.authBaseUrl}/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } finally {
      this.clearSession();
    }
  }

  /**
   * Obtiene la lista cronológica de compras del usuario autenticado (FR-003, FR-004)
   */
  async getMisCompras() {
    const res = await fetch(`${this.orderBaseUrl}/mis-compras`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(res);
  }

  /**
   * Obtiene el detalle de un pedido del usuario autenticado
   */
  async getDetallePedido(codigoReferencia) {
    const res = await fetch(`${this.orderBaseUrl}/mis-compras/${encodeURIComponent(codigoReferencia)}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(res);
  }

  /**
   * Modifica manualmente la fase de un pedido (Administrador) (FR-006, FR-007)
   */
  async actualizarFase(codigoReferencia, { fase, numeroSeguimiento, transportista, notas }) {
    const res = await fetch(`${this.orderBaseUrl}/${encodeURIComponent(codigoReferencia)}/fase`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ fase, numeroSeguimiento, transportista, notas })
    });

    return this.handleResponse(res);
  }
}
