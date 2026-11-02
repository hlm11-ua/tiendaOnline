/**
 * Cliente HTTP frontend para interactuar con la API de administración de catálogo e inventario
 * Cumple con los principios de la Constitución (idioma español es-ES, manejo de errores descriptivo)
 */
export class CatalogAdminApiService {
  static defaultRole = 'admin';

  static async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-role': options.role || this.defaultRole,
      ...(options.headers || {})
    };

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const isNoContent = res.status === 204;
    const data = isNoContent ? {} : await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.mensaje || data.error || 'Error al comunicarse con la administración del catálogo.');
      error.codigo = data.error || 'ERROR_CATALOGO';
      error.status = res.status;
      error.detalles = data;
      throw error;
    }

    return data;
  }

  // === CATEGORÍAS ===

  /**
   * Lista categorías de productos (FR-002)
   * @param {string} [estado='activa'] - 'todas', 'activa', 'archivada'
   */
  static async listarCategorias(estado = 'todas') {
    const query = estado && estado !== 'todas' ? `?estado=${encodeURIComponent(estado)}` : '';
    return this.request(`/api/admin/categorias${query}`);
  }

  /**
   * Crea una nueva categoría de productos (FR-002)
   */
  static async crearCategoria({ nombre, descripcion }) {
    return this.request('/api/admin/categorias', {
      method: 'POST',
      body: JSON.stringify({ nombre, descripcion })
    });
  }

  /**
   * Actualiza los datos de una categoría existente (FR-002)
   */
  static async actualizarCategoria(id, { nombre, descripcion }) {
    return this.request(`/api/admin/categorias/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, descripcion })
    });
  }

  /**
   * Archiva una categoría si no tiene productos activos asociados (FR-002, Clarificación Q3)
   */
  static async archivarCategoria(id) {
    return this.request(`/api/admin/categorias/${encodeURIComponent(id)}/archivar`, {
      method: 'PATCH'
    });
  }

  // === PRODUCTOS ===

  /**
   * Lista los productos del catálogo con filtros opcionales (FR-003, FR-006)
   */
  static async listarProductos({ categoriaId, estado = 'todos', soloAlertas = false } = {}) {
    const params = new URLSearchParams();
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (estado && estado !== 'todos') params.append('estado', estado);
    if (soloAlertas) params.append('soloAlertas', 'true');

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/admin/productos${qs}`);
  }

  /**
   * Da de alta un nuevo producto con fotos y variantes (FR-003, FR-004, SC-001)
   */
  static async crearProducto(producto) {
    return this.request('/api/admin/productos', {
      method: 'POST',
      body: JSON.stringify(producto)
    });
  }

  /**
   * Obtiene la ficha detallada de un producto con sus variantes e inventario
   */
  static async obtenerProducto(id) {
    return this.request(`/api/admin/productos/${encodeURIComponent(id)}`);
  }

  /**
   * Actualiza la ficha de un producto existente (FR-003)
   */
  static async actualizarProducto(id, producto) {
    return this.request(`/api/admin/productos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(producto)
    });
  }

  /**
   * Elimina físicamente o archiva lógicamente un producto si tiene pedidos históricos (Edge Cases)
   */
  static async eliminarOArchivarProducto(id) {
    return this.request(`/api/admin/productos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // === VARIANTES Y STOCK ===

  /**
   * Actualiza el stock total y/o umbral de una variante (FR-005, FR-007)
   */
  static async actualizarStockVariante(id, { stockTotal, umbralAlerta }) {
    return this.request(`/api/admin/variantes/${encodeURIComponent(id)}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stockTotal, umbralAlerta })
    });
  }

  /**
   * Consulta las alertas activas de stock bajo o agotado en tiempo real (FR-006, SC-002)
   */
  static async listarAlertasStock() {
    return this.request('/api/admin/alertas-stock');
  }
}
