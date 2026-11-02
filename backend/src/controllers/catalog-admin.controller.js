import { CatalogAdminService } from '../services/catalog-admin.service.js';

/**
 * Controlador REST para el panel administrativo de catálogo e inventario
 */
export class CatalogAdminController {
  // === CATEGORÍAS ===

  static listCategories(req, res, next) {
    try {
      const categorias = CatalogAdminService.listCategories(req.query.estado);
      res.json({ categorias });
    } catch (err) {
      next(err);
    }
  }

  static createCategory(req, res, next) {
    try {
      const categoria = CatalogAdminService.createCategory(req.body || {});
      res.status(201).json({ categoria });
    } catch (err) {
      next(err);
    }
  }

  static updateCategory(req, res, next) {
    try {
      const categoria = CatalogAdminService.updateCategory(req.params.id, req.body || {});
      res.json({ categoria });
    } catch (err) {
      next(err);
    }
  }

  static archiveCategory(req, res, next) {
    try {
      const categoria = CatalogAdminService.archiveCategory(req.params.id);
      res.json({
        categoria,
        mensaje: 'Categoría archivada correctamente.'
      });
    } catch (err) {
      next(err);
    }
  }

  // === PRODUCTOS ===

  static listProducts(req, res, next) {
    try {
      const soloAlertas = req.query.soloAlertas === 'true' || req.query.soloAlertas === true;
      const productos = CatalogAdminService.listProducts({
        categoriaId: req.query.categoriaId,
        estado: req.query.estado,
        soloAlertas
      });
      res.json({ productos });
    } catch (err) {
      next(err);
    }
  }

  static getProductById(req, res, next) {
    try {
      const producto = CatalogAdminService.getProductById(req.params.id);
      res.json({ producto });
    } catch (err) {
      next(err);
    }
  }

  static createProduct(req, res, next) {
    try {
      const producto = CatalogAdminService.createProduct(req.body || {});
      res.status(201).json({ producto });
    } catch (err) {
      next(err);
    }
  }

  static updateProduct(req, res, next) {
    try {
      const producto = CatalogAdminService.updateProduct(req.params.id, req.body || {});
      res.json({ producto });
    } catch (err) {
      next(err);
    }
  }

  static deleteOrArchiveProduct(req, res, next) {
    try {
      const result = CatalogAdminService.deleteOrArchiveProduct(req.params.id);
      if (result.accion === 'eliminado') {
        return res.status(204).end();
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // === VARIANTES Y STOCK ===

  static updateVariantStock(req, res, next) {
    try {
      const result = CatalogAdminService.updateVariantStock(req.params.id, req.body || {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static listStockAlerts(req, res, next) {
    try {
      const result = CatalogAdminService.listStockAlerts();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
