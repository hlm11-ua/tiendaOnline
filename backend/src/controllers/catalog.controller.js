import { catalogService } from '../services/catalog.service.js';

/**
 * Controlador para la API pública de catálogo y filtros
 */
export class CatalogController {
  /**
   * GET /api/catalogo/productos
   * Devuelve los productos filtrados según los parámetros de consulta
   */
  static async listarProductos(req, res, next) {
    try {
      const { categoria, minPrecio, maxPrecio, productor, enStock } = req.query;

      const resultado = catalogService.filtrarProductos({
        categoria,
        minPrecio,
        maxPrecio,
        productor,
        enStock
      });

      res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/catalogo/filtros
   * Devuelve metadatos para inicializar los controles de filtro
   */
  static async obtenerFiltros(req, res, next) {
    try {
      const metadatos = catalogService.obtenerMetadatosFiltros();
      res.status(200).json(metadatos);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/catalogo/productos/:id
   * Devuelve el detalle público de un producto
   */
  static async obtenerProducto(req, res, next) {
    try {
      const { id } = req.params;
      const producto = catalogService.obtenerProductoPorId(id);
      res.status(200).json(producto);
    } catch (err) {
      next(err);
    }
  }
}
