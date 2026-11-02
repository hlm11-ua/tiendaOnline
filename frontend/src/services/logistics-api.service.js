/**
 * Cliente HTTP frontend para interactuar con la API de logística y seguimiento de envíos
 * Cumple con los principios de idioma español y comunicación REST
 */
export class LogisticsApiService {
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
      const error = new Error(data.mensaje || 'Error al comunicarse con el servicio logístico.');
      error.codigo = data.codigo || 'ERROR_LOGISTICA';
      error.status = res.status;
      throw error;
    }

    return data;
  }

  /**
   * Obtiene la lista de empresas de mensajería disponibles (FR-003)
   */
  static async getTransportistas() {
    return this.request('/api/logistica/transportistas');
  }

  /**
   * Lista los pedidos con opción de filtrado por estado (FR-001, FR-002)
   * @param {string} estado - 'todos', 'pagado', 'en_preparacion', 'salido_tienda', 'entregado'
   */
  static async listarPedidos(estado = 'todos') {
    const query = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
    return this.request(`/api/logistica/pedidos${query}`);
  }

  /**
   * Obtiene la información detallada y seguimiento de un pedido por su código de referencia
   * @param {string} codigoReferencia
   */
  static async obtenerPedido(codigoReferencia) {
    try {
      return await this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}`);
    } catch (err) {
      // Fallback a la API general de pedidos si la ruta específica no estuviera montada
      return await this.request(`/api/pedidos/${encodeURIComponent(codigoReferencia)}`);
    }
  }

  /**
   * Inicia la preparación y empaquetado del pedido en taller (FR-002)
   * @param {string} codigoReferencia
   */
  static async iniciarPreparacion(codigoReferencia) {
    return this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}/preparar`, {
      method: 'POST'
    });
  }

  /**
   * Registra el despacho del pedido con transportista y tracking (FR-003, FR-004)
   * @param {string} codigoReferencia
   * @param {{ transportista: string, numeroSeguimiento: string, notas?: string }} payload
   */
  static async despacharPedido(codigoReferencia, payload) {
    return this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}/despachar`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Rectifica una errata en el código de seguimiento o transportista (Edge Case 2)
   * @param {string} codigoReferencia
   * @param {{ transportista: string, numeroSeguimiento: string, motivo?: string }} payload
   */
  static async rectificarTracking(codigoReferencia, payload) {
    return this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}/rectificar-tracking`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Confirma la entrega definitiva del pedido (FR-005)
   * @param {string} codigoReferencia
   * @param {'admin'|'cliente'} origen
   */
  static async confirmarEntrega(codigoReferencia, origen = 'admin') {
    return this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}/entregar`, {
      method: 'POST',
      body: JSON.stringify({ origen })
    });
  }

  /**
   * Obtiene el registro de avisos y notificaciones de envío emitidas para el pedido (Principio IV)
   * @param {string} codigoReferencia
   */
  static async obtenerAvisos(codigoReferencia) {
    return this.request(`/api/logistica/pedidos/${encodeURIComponent(codigoReferencia)}/avisos`);
  }
}
