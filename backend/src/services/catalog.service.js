import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';

/**
 * Servicio de negocio para el catálogo público de productos artesanales
 * Cumple estrictamente con la Constitución del Proyecto (es-ES, EUR, simplicidad)
 */
export class CatalogService {
  /**
   * Formatea un importe numérico en euros según las convenciones de España
   * @param {number} importe
   * @returns {string} Ejemplo: "45,00 €"
   */
  static formatearPrecio(importe) {
    const num = Number(importe) || 0;
    return new Intl.NumberFormat(CONSTANTS.LOCALE, {
      style: 'currency',
      currency: CONSTANTS.CURRENCY
    }).format(num);
  }

  /**
   * Obtiene los metadatos necesarios para inicializar los controles de filtro
   * @returns {Object} { categorias, productores, rangoPrecio }
   */
  obtenerMetadatosFiltros() {
    const categoriasActivas = store.getAllCategories(CONSTANTS.CATALOG.CATEGORY_STATUS.ACTIVE);
    const productosActivos = store.getAllProducts({ estado: CONSTANTS.CATALOG.PRODUCT_STATUS.ACTIVE });

    // Categorías con conteo de productos
    const categorias = categoriasActivas.map(c => ({
      id: c.id,
      nombre: c.nombre,
      slug: c.slug || c.id,
      totalProductos: store.countActiveProductsByCategory(c.id)
    }));

    // Lista de artesanos o productores únicos ordenados alfabéticamente
    const artesanosSet = new Set();
    let minPrecio = Infinity;
    let maxPrecio = 0;

    for (const prod of productosActivos) {
      if (prod.artesano) {
        artesanosSet.add(prod.artesano.trim());
      }
      const precio = Number(prod.precioBase) || 0;
      if (precio < minPrecio) minPrecio = precio;
      if (precio > maxPrecio) maxPrecio = precio;
    }

    const productores = Array.from(artesanosSet).sort((a, b) => a.localeCompare(b, 'es'));

    return {
      categorias,
      productores,
      rangoPrecio: {
        min: minPrecio === Infinity ? 0 : Number(minPrecio.toFixed(2)),
        max: Number(maxPrecio.toFixed(2))
      }
    };
  }

  /**
   * Filtra y formatea los productos del catálogo público
   * @param {Object} criterios - { categoria, minPrecio, maxPrecio, productor, enStock }
   * @returns {Object} { total, filtrosAplicados, productos }
   */
  filtrarProductos(criterios = {}) {
    const { categoria, minPrecio, maxPrecio, productor, enStock } = criterios;

    // Normalizar precios y sanear si min > max
    let min = minPrecio !== undefined && minPrecio !== null && minPrecio !== '' ? Number(minPrecio) : null;
    let max = maxPrecio !== undefined && maxPrecio !== null && maxPrecio !== '' ? Number(maxPrecio) : null;

    if (min !== null && isNaN(min)) min = null;
    if (max !== null && isNaN(max)) max = null;

    if (min !== null && min < 0) min = 0;
    if (max !== null && max < 0) max = 0;

    if (min !== null && max !== null && min > max) {
      const temp = min;
      min = max;
      max = temp;
    }

    const soloEnStock = enStock === true || enStock === 'true' || enStock === '1';

    // Obtener todas las categorías para mapeo de slug
    const todasCategorias = store.getAllCategories();
    const mapaCategoriasPorId = new Map(todasCategorias.map(c => [c.id, c]));
    const mapaCategoriasPorSlug = new Map(todasCategorias.map(c => [c.slug, c]));

    let categoriaFiltroId = null;
    let categoriaFiltroSlug = null;

    if (categoria && categoria !== 'todas' && String(categoria).trim() !== '') {
      const slugBuscado = String(categoria).trim().toLowerCase();
      if (mapaCategoriasPorSlug.has(slugBuscado)) {
        const cat = mapaCategoriasPorSlug.get(slugBuscado);
        categoriaFiltroId = cat.id;
        categoriaFiltroSlug = cat.slug;
      } else if (mapaCategoriasPorId.has(categoria)) {
        const cat = mapaCategoriasPorId.get(categoria);
        categoriaFiltroId = cat.id;
        categoriaFiltroSlug = cat.slug;
      } else {
        // Categoría inexistente solicitada -> no hay resultados
        return {
          total: 0,
          filtrosAplicados: {
            categoria,
            minPrecio: min,
            maxPrecio: max,
            productor: productor || null,
            enStock: soloEnStock
          },
          productos: []
        };
      }
    }

    // Obtener productos activos
    const productosBase = store.getAllProducts({ estado: CONSTANTS.CATALOG.PRODUCT_STATUS.ACTIVE });

    // Filtrar productos
    const productosFiltrados = productosBase.filter(prod => {
      // 1. Filtro por categoría
      if (categoriaFiltroId && prod.categoriaId !== categoriaFiltroId) {
        return false;
      }

      // 2. Filtro por precio mínimo
      if (min !== null && prod.precioBase < min) {
        return false;
      }

      // 3. Filtro por precio máximo
      if (max !== null && prod.precioBase > max) {
        return false;
      }

      // 4. Filtro por productor / artesano
      if (productor && String(productor).trim() !== '') {
        const prodBuscado = String(productor).trim().toLowerCase();
        const artesanoProd = String(prod.artesano || '').trim().toLowerCase();
        if (artesanoProd !== prodBuscado) {
          return false;
        }
      }

      // 5. Filtro por disponibilidad en stock
      const variants = store.getVariantsByProductId(prod.id);
      const stockTotalDisponible = variants.reduce((acc, v) => acc + (store.getAvailableStock(v.id) || 0), 0);
      const tieneStock = stockTotalDisponible > 0;

      if (soloEnStock && !tieneStock) {
        return false;
      }

      return true;
    });

    // Mapear productos al DTO de salida público
    const productosDTO = productosFiltrados.map(prod => {
      const cat = mapaCategoriasPorId.get(prod.categoriaId);
      const variants = store.getVariantsByProductId(prod.id);
      const stockDisponible = variants.reduce((acc, v) => acc + (store.getAvailableStock(v.id) || 0), 0);
      const reviews = typeof store.getReviewsByProductId === 'function' ? store.getReviewsByProductId(prod.id) : [];
      const ratingTotal = reviews.length;
      const ratingMedia = ratingTotal > 0
        ? Math.round((reviews.reduce((acc, r) => acc + r.puntuacion, 0) / ratingTotal) * 10) / 10
        : 0;

      return {
        id: prod.id,
        titulo: prod.titulo,
        descripcion: prod.descripcion || '',
        categoriaId: prod.categoriaId,
        categoriaNombre: cat ? cat.nombre : 'Sin categoría',
        categoriaSlug: cat ? (cat.slug || cat.id) : '',
        artesano: prod.artesano,
        precioBase: prod.precioBase,
        precioFormateado: CatalogService.formatearPrecio(prod.precioBase),
        moneda: prod.moneda || CONSTANTS.CURRENCY,
        imagenes: prod.imagenes || [],
        enStock: stockDisponible > 0,
        stockDisponible,
        ratingMedia,
        ratingTotal
      };
    });

    return {
      total: productosDTO.length,
      filtrosAplicados: {
        categoria: categoriaFiltroSlug || categoriaFiltroId || null,
        minPrecio: min,
        maxPrecio: max,
        productor: productor || null,
        enStock: soloEnStock
      },
      productos: productosDTO
    };
  }

  /**
   * Obtiene el detalle de un producto por su identificador
   * @param {string} id
   * @returns {Object}
   */
  obtenerProductoPorId(id) {
    const prod = store.getProductById(id);
    if (!prod || prod.estado !== CONSTANTS.CATALOG.PRODUCT_STATUS.ACTIVE) {
      const err = new Error('No se ha encontrado el producto solicitado.');
      err.codigo = 'PRODUCTO_NO_ENCONTRADO';
      err.statusCode = 404;
      err.status = 404;
      throw err;
    }

    const cat = store.getCategoryById(prod.categoriaId);
    const variants = store.getVariantsByProductId(prod.id);
    const stockDisponible = variants.reduce((acc, v) => acc + (store.getAvailableStock(v.id) || 0), 0);
    const reviews = typeof store.getReviewsByProductId === 'function' ? store.getReviewsByProductId(prod.id) : [];
    const ratingTotal = reviews.length;
    const ratingMedia = ratingTotal > 0
      ? Math.round((reviews.reduce((acc, r) => acc + r.puntuacion, 0) / ratingTotal) * 10) / 10
      : 0;

    return {
      id: prod.id,
      titulo: prod.titulo,
      descripcion: prod.descripcion || '',
      categoriaId: prod.categoriaId,
      categoriaNombre: cat ? cat.nombre : 'Sin categoría',
      categoriaSlug: cat ? (cat.slug || cat.id) : '',
      artesano: prod.artesano,
      precioBase: prod.precioBase,
      precioFormateado: CatalogService.formatearPrecio(prod.precioBase),
      moneda: prod.moneda || CONSTANTS.CURRENCY,
      imagenes: prod.imagenes || [],
      enStock: stockDisponible > 0,
      stockDisponible,
      ratingMedia,
      ratingTotal,
      variantes: variants.map(v => ({
        id: v.id,
        nombre: v.nombre,
        stockDisponible: store.getAvailableStock(v.id) || 0
      }))
    };
  }
}

export const catalogService = new CatalogService();
