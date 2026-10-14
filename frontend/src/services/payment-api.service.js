/**
 * Cliente HTTP frontend para interactuar con la API de checkout y pagos
 */
export class PaymentApiService {
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
      throw error;
    }

    return data;
  }

  static async getCatalog() {
    return this.request('/api/pagos/catalogo');
  }

  static async iniciarPago(items) {
    return this.request('/api/pagos/iniciar', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  }

  static async procesarPago(payload) {
    return this.request('/api/pagos/procesar', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async verificar3DS(payload) {
    return this.request('/api/pagos/verificar-3ds', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async obtenerPedido(codigoReferencia) {
    return this.request(`/api/pedidos/${codigoReferencia}`);
  }
}
