import crypto from 'node:crypto';
import { store } from '../models/store.js';
import { Categoria } from '../models/category.model.js';
import { Producto, Variante } from '../models/product.model.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Servicio de lógica de negocio para la administración de catálogo, categorías, productos y alertas de stock
 */
export class CatalogAdminService {
  // === CATEGORÍAS ===

  static listCategories(estado = 'todas') {
    return store.getAllCategories(estado);
  }

  static createCategory({ nombre, descripcion }) {
    Categoria.validar({ nombre, descripcion });

    let slug = Categoria.generarSlug(nombre);
    const existing = store.getCategoryBySlug(slug);
    if (existing) {
      slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const cat = new Categoria({ nombre, descripcion, slug });
    return store.saveCategory(cat);
  }

  static updateCategory(id, { nombre, descripcion }) {
    const cat = store.getCategoryById(id);
    if (!cat) {
      throw new AppError(`Categoría con identificador "${id}" no encontrada.`, 404, 'NOT_FOUND');
    }

    if (nombre) {
      Categoria.validar({ nombre, descripcion: descripcion || cat.descripcion });
      cat.nombre = String(nombre).trim();
      cat.slug = Categoria.generarSlug(nombre);
    }

    if (descripcion !== undefined) {
      cat.descripcion = String(descripcion).trim();
    }

    cat.updatedAt = new Date().toISOString();
    return store.saveCategory(cat);
  }

  static archiveCategory(id) {
    const cat = store.getCategoryById(id);
    if (!cat) {
      throw new AppError(`Categoría con identificador "${id}" no encontrada.`, 404, 'NOT_FOUND');
    }

    const activeCount = store.countActiveProductsByCategory(id);
    if (activeCount > 0) {
      const err = new Error('No se puede archivar la categoría porque contiene productos activos. Reasigne o descatalogue los productos primero.');
      err.codigo = 'CONFLICT_ACTIVE_PRODUCTS';
      err.statusCode = 409;
      err.status = 409;
      throw err;
    }

    cat.estado = CONSTANTS.CATALOG.CATEGORY_STATUS.ARCHIVED;
    cat.updatedAt = new Date().toISOString();
    return store.saveCategory(cat);
  }

  // === PRODUCTOS ===

  static listProducts(filtros = {}) {
    return store.getAllProducts(filtros);
  }

  static getProductById(id) {
    const prod = store.getProductById(id);
    if (!prod) {
      throw new AppError(`Producto con identificador "${id}" no encontrado.`, 404, 'NOT_FOUND');
    }

    const cat = store.getCategoryById(prod.categoriaId);
    const variantes = store.getVariantsByProductId(id);
    const tieneAlertas = variantes.some(v => v.estadoAlerta !== CONSTANTS.CATALOG.STOCK_ALERT_STATUS.NORMAL);

    return {
      ...prod,
      categoriaNombre: cat ? cat.nombre : 'Sin categoría',
      variantes,
      alertaActiva: tieneAlertas
    };
  }

  static createProduct(datos) {
    Producto.validar(datos);

    const cat = store.getCategoryById(datos.categoriaId);
    if (!cat || cat.estado === CONSTANTS.CATALOG.CATEGORY_STATUS.ARCHIVED) {
      throw new AppError('La categoría seleccionada no existe o se encuentra archivada.', 400, 'CATEGORIA_INVALIDA');
    }

    const prod = new Producto(datos);
    store.saveProduct(prod);

    const variantesCreadas = [];

    // Si no se envían variantes, crear la variante estándar "Única" por defecto (FR-004, Clarificación Q4)
    if (!Array.isArray(datos.variantes) || datos.variantes.length === 0) {
      const v = new Variante({
        productoId: prod.id,
        nombre: CONSTANTS.CATALOG.DEFAULT_VARIANT_NAME,
        stockTotal: datos.stockTotal !== undefined ? datos.stockTotal : 0,
        umbralAlerta: datos.umbralAlerta !== undefined ? datos.umbralAlerta : CONSTANTS.CATALOG.DEFAULT_ALERT_THRESHOLD
      });
      store.saveVariant(v);
      variantesCreadas.push(v);
    } else {
      for (const vData of datos.variantes) {
        Variante.validar(vData);
        const v = new Variante({
          ...vData,
          productoId: prod.id
        });
        store.saveVariant(v);
        variantesCreadas.push(v);
      }
    }

    return this.getProductById(prod.id);
  }

  static updateProduct(id, datos) {
    const prod = store.getProductById(id);
    if (!prod) {
      throw new AppError(`Producto con identificador "${id}" no encontrado.`, 404, 'NOT_FOUND');
    }

    if (datos.categoriaId) {
      const cat = store.getCategoryById(datos.categoriaId);
      if (!cat || cat.estado === CONSTANTS.CATALOG.CATEGORY_STATUS.ARCHIVED) {
        throw new AppError('La categoría seleccionada no existe o está archivada.', 400, 'CATEGORIA_INVALIDA');
      }
      prod.categoriaId = datos.categoriaId;
    }

    if (datos.titulo !== undefined) prod.titulo = String(datos.titulo).trim();
    if (datos.descripcion !== undefined) prod.descripcion = String(datos.descripcion).trim();
    if (datos.artesano !== undefined) prod.artesano = String(datos.artesano).trim();
    if (datos.precioBase !== undefined) prod.precioBase = Number(Number(datos.precioBase).toFixed(2));
    if (Array.isArray(datos.imagenes)) {
      prod.imagenes = datos.imagenes.map(Producto.normalizarImagen);
    }

    Producto.validar(prod);
    prod.updatedAt = new Date().toISOString();
    store.saveProduct(prod);

    if (Array.isArray(datos.variantes) && datos.variantes.length > 0) {
      for (const vData of datos.variantes) {
        if (vData.id && store.getVariantById(vData.id)) {
          store.updateVariantStock(vData.id, vData);
        } else {
          Variante.validar(vData);
          const v = new Variante({ ...vData, productoId: prod.id });
          store.saveVariant(v);
        }
      }
    }

    return this.getProductById(id);
  }

  static deleteOrArchiveProduct(id) {
    const prod = store.getProductById(id);
    if (!prod) {
      throw new AppError(`Producto con identificador "${id}" no encontrado.`, 404, 'NOT_FOUND');
    }

    const hasOrders = store.hasProductPriorOrders(id);
    if (hasOrders) {
      store.archiveProduct(id);
      return {
        accion: 'archivado',
        mensaje: 'El producto tiene pedidos históricos asociados; ha sido archivado y desactivado del catálogo público.'
      };
    }

    store.deleteProduct(id);
    return {
      accion: 'eliminado',
      mensaje: 'Producto eliminado permanentemente de memoria.'
    };
  }

  // === VARIANTES Y STOCK ===

  static updateVariantStock(varianteId, { stockTotal, umbralAlerta }) {
    const v = store.getVariantById(varianteId);
    if (!v) {
      throw new AppError(`Variante con identificador "${varianteId}" no encontrada.`, 404, 'NOT_FOUND');
    }

    Variante.validar({
      nombre: v.nombre,
      stockTotal: stockTotal !== undefined ? stockTotal : v.stockTotal,
      umbralAlerta: umbralAlerta !== undefined ? umbralAlerta : v.umbralAlerta
    });

    const actualizada = store.updateVariantStock(varianteId, { stockTotal, umbralAlerta });
    const alerta = store.getVariantAlert(varianteId);

    return {
      variante: actualizada,
      alerta
    };
  }

  static listStockAlerts() {
    const alertas = store.getAllStockAlerts();
    return {
      totalAlertas: alertas.length,
      alertas
    };
  }
}
