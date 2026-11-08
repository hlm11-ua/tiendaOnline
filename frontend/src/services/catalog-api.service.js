/**
 * Servicio cliente para interactuar con los endpoints públicos del catálogo (/api/catalogo/*)
 * Cumple con la constitución del proyecto (es-ES, EUR)
 */
export class CatalogApiService {
  constructor(baseUrl = '/api/catalogo') {
    this.baseUrl = baseUrl;
  }

  /**
   * Consulta productos del catálogo aplicando filtros combinados
   * @param {Object} filtros - { categoria, minPrecio, maxPrecio, productor, enStock }
   * @returns {Promise<{ total: number, filtrosAplicados: Object, productos: Array }>}
   */
  async getProductos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.categoria && filtros.categoria !== 'todas') {
      params.set('categoria', String(filtros.categoria).trim());
    }

    if (filtros.minPrecio !== undefined && filtros.minPrecio !== null && filtros.minPrecio !== '') {
      const min = Number(filtros.minPrecio);
      if (!isNaN(min) && min >= 0) {
        params.set('minPrecio', min.toFixed(2));
      }
    }

    if (filtros.maxPrecio !== undefined && filtros.maxPrecio !== null && filtros.maxPrecio !== '') {
      const max = Number(filtros.maxPrecio);
      if (!isNaN(max) && max >= 0) {
        params.set('maxPrecio', max.toFixed(2));
      }
    }

    if (filtros.productor && String(filtros.productor).trim() !== '') {
      params.set('productor', String(filtros.productor).trim());
    }

    if (filtros.enStock === true || filtros.enStock === 'true') {
      params.set('enStock', 'true');
    }

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/productos?${queryString}` : `${this.baseUrl}/productos`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      let msg = 'No se ha podido cargar el catálogo de productos.';
      try {
        const data = await res.json();
        if (data && data.error) msg = data.error;
      } catch (err) {
        // Ignorar error de parsing
      }
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Obtiene los metadatos globales para inicializar los controles de filtro
   * @returns {Promise<{ categorias: Array, productores: Array, rangoPrecio: { min: number, max: number } }>}
   */
  async getFiltros() {
    const res = await fetch(`${this.baseUrl}/filtros`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error('No se han podido cargar los filtros del catálogo.');
    }

    return await res.json();
  }

  /**
   * Obtiene la ficha de un producto por su identificador
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getProductoPorId(id) {
    if (!id) throw new Error('El identificador del producto es requerido.');
    const res = await fetch(`${this.baseUrl}/productos/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('El producto solicitado no existe.');
      }
      throw new Error('Error al consultar el producto.');
    }

    return await res.json();
  }
}

export const catalogApiService = new CatalogApiService();
