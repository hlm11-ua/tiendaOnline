/**
 * Servicio cliente para interactuar con la API REST de Reseñas y Valoraciones (/api/resenas/*)
 * Cumple con la constitución del proyecto (es-ES)
 */
export class ReviewApiService {
  constructor(baseUrl = '/api/resenas') {
    this.baseUrl = baseUrl;
  }

  /**
   * Obtiene el resumen de calificaciones y las reseñas verificadas de un producto
   * @param {string} productoId
   * @returns {Promise<{ productoId: string, media: number, total: number, distribucion: Object, items: Array }>}
   */
  async getReviewsByProduct(productoId) {
    if (!productoId) {
      throw new Error('El identificador del producto es obligatorio.');
    }

    const res = await fetch(`${this.baseUrl}/producto/${encodeURIComponent(productoId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      let msg = 'No se han podido cargar las valoraciones del producto.';
      try {
        const errorData = await res.json();
        if (errorData?.mensaje) msg = errorData.mensaje;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Comprueba si el usuario autenticado es elegible para valorar el producto
   * @param {string} productoId
   * @param {Object} [userInfo] - { usuarioId, usuarioEmail }
   * @returns {Promise<{ productoId: string, puedeValorar: boolean, motivo: string, mensaje: string, resenaPrevia: Object|null }>}
   */
  async checkReviewEligibility(productoId, userInfo = {}) {
    if (!productoId) {
      throw new Error('El identificador del producto es obligatorio.');
    }

    const headers = { 'Accept': 'application/json' };
    if (userInfo.usuarioId) headers['x-usuario-id'] = String(userInfo.usuarioId).trim();
    if (userInfo.usuarioEmail) headers['x-usuario-email'] = String(userInfo.usuarioEmail).trim();
    if (userInfo.usuarioNombre) headers['x-usuario-nombre'] = String(userInfo.usuarioNombre).trim();

    const res = await fetch(`${this.baseUrl}/elegibilidad/${encodeURIComponent(productoId)}`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      let msg = 'No se ha podido comprobar la elegibilidad de compra.';
      try {
        const err = await res.json();
        if (err?.mensaje) msg = err.mensaje;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Publica una valoración y comentario verificado
   * @param {Object} reviewData - { productoId, puntuacion, comentario, usuarioId, usuarioNombre, usuarioEmail }
   * @returns {Promise<{ mensaje: string, resena: Object, resumen: Object }>}
   */
  async createReview(reviewData = {}) {
    const {
      productoId,
      puntuacion,
      comentario,
      usuarioId,
      usuarioNombre,
      usuarioEmail
    } = reviewData;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (usuarioId) headers['x-usuario-id'] = String(usuarioId).trim();
    if (usuarioEmail) headers['x-usuario-email'] = String(usuarioEmail).trim();
    if (usuarioNombre) headers['x-usuario-nombre'] = String(usuarioNombre).trim();

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productoId,
        puntuacion: Number(puntuacion),
        comentario,
        usuarioId,
        usuarioNombre,
        usuarioEmail
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.mensaje || data?.error || 'No se ha podido enviar la valoración.';
      const err = new Error(errorMsg);
      err.status = res.status;
      err.codigo = data?.codigo || 'ERROR_VALORACION';
      throw err;
    }

    return data;
  }
}
