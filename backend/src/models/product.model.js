import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Modelo para las fichas de productos artesanales (FR-003)
 */
export class Producto {
  constructor({
    id = null,
    titulo,
    descripcion = '',
    categoriaId,
    artesano,
    precioBase,
    moneda = CONSTANTS.CURRENCY,
    imagenes = [],
    estado = CONSTANTS.CATALOG.PRODUCT_STATUS.ACTIVE,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id || `art-${crypto.randomBytes(4).toString('hex')}`;
    this.titulo = String(titulo).trim();
    this.descripcion = descripcion ? String(descripcion).trim() : '';
    this.categoriaId = String(categoriaId).trim();
    this.artesano = String(artesano).trim();
    this.precioBase = Number(Number(precioBase).toFixed(2));
    this.moneda = moneda;
    this.imagenes = Array.isArray(imagenes) ? imagenes.map(img => Producto.normalizarImagen(img)) : [];
    this.estado = estado;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Normaliza la estructura de un recurso de imagen
   */
  static normalizarImagen(img) {
    if (typeof img === 'string') {
      return {
        url: img,
        nombreArchivo: img.split('/').pop() || 'imagen.webp',
        mimeType: 'image/webp',
        tamanoBytes: 1024,
        esPrincipal: false
      };
    }

    return {
      url: String(img.url || '').trim(),
      nombreArchivo: String(img.nombreArchivo || img.url || '').split('/').pop() || 'imagen.webp',
      mimeType: String(img.mimeType || 'image/webp').toLowerCase(),
      tamanoBytes: Number(img.tamanoBytes || 0),
      esPrincipal: Boolean(img.esPrincipal)
    };
  }

  /**
   * Valida la ficha general de un producto
   */
  static validar({ titulo, descripcion, categoriaId, artesano, precioBase, imagenes }) {
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
      const err = new Error('El título del producto es obligatorio y debe tener al menos 3 caracteres.');
      err.codigo = 'PRODUCTO_TITULO_INVALIDO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (titulo.trim().length > 150) {
      const err = new Error('El título del producto no puede exceder los 150 caracteres.');
      err.codigo = 'PRODUCTO_TITULO_DEMASIADO_LARGO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (!categoriaId || typeof categoriaId !== 'string' || categoriaId.trim() === '') {
      const err = new Error('Debe asignar una categoría obligatoriamente al producto.');
      err.codigo = 'PRODUCTO_CATEGORIA_REQUERIDA';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (!artesano || typeof artesano !== 'string' || artesano.trim() === '') {
      const err = new Error('El nombre del artesano o taller es obligatorio.');
      err.codigo = 'PRODUCTO_ARTESANO_REQUERIDO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    const numPrecio = Number(precioBase);
    if (isNaN(numPrecio) || numPrecio <= 0) {
      const err = new Error('El precio base debe ser un valor numérico estrictamente mayor que cero.');
      err.codigo = 'PRODUCTO_PRECIO_INVALIDO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (imagenes && Array.isArray(imagenes)) {
      if (imagenes.length > CONSTANTS.CATALOG.IMAGE_LIMITS.MAX_COUNT) {
        const err = new Error(`No se pueden asociar más de ${CONSTANTS.CATALOG.IMAGE_LIMITS.MAX_COUNT} imágenes por producto.`);
        err.codigo = 'PRODUCTO_DEMASIADAS_IMAGENES';
        err.statusCode = 400;
        err.status = 400;
        throw err;
      }

      for (const img of imagenes) {
        if (!img || !img.url) {
          const err = new Error('Cada recurso de imagen debe contener una URL válida.');
          err.codigo = 'IMAGEN_URL_INVALIDA';
          err.statusCode = 400;
          err.status = 400;
          throw err;
        }

        if (img.tamanoBytes && img.tamanoBytes > CONSTANTS.CATALOG.IMAGE_LIMITS.MAX_SIZE_BYTES) {
          const err = new Error(`El archivo de imagen "${img.nombreArchivo || img.url}" supera el límite máximo permitido de 5 MB.`);
          err.codigo = 'IMAGEN_TAMANO_EXCEDIDO';
          err.statusCode = 400;
          err.status = 400;
          throw err;
        }

        if (img.mimeType && !CONSTANTS.CATALOG.IMAGE_LIMITS.ALLOWED_MIME_TYPES.includes(img.mimeType)) {
          const err = new Error(`El formato "${img.mimeType}" no está permitido. Solo se admiten JPG, PNG y WebP.`);
          err.codigo = 'IMAGEN_FORMATO_NO_PERMITIDO';
          err.statusCode = 400;
          err.status = 400;
          throw err;
        }
      }
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      categoriaId: this.categoriaId,
      artesano: this.artesano,
      precioBase: this.precioBase,
      moneda: this.moneda,
      imagenes: this.imagenes,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

/**
 * Modelo para las variantes de un producto artesanal (FR-004)
 */
export class Variante {
  constructor({
    id = null,
    productoId,
    nombre,
    sku = null,
    stockTotal = 0,
    umbralAlerta = CONSTANTS.CATALOG.DEFAULT_ALERT_THRESHOLD,
    estado = CONSTANTS.CATALOG.VARIANT_STATUS.ACTIVE,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id || `var-${crypto.randomBytes(4).toString('hex')}`;
    this.productoId = String(productoId).trim();
    this.nombre = String(nombre || CONSTANTS.CATALOG.DEFAULT_VARIANT_NAME).trim();
    this.sku = sku ? String(sku).trim() : null;
    this.stockTotal = Math.max(0, parseInt(stockTotal, 10) || 0);
    this.umbralAlerta = Math.max(0, parseInt(umbralAlerta, 10) >= 0 ? parseInt(umbralAlerta, 10) : CONSTANTS.CATALOG.DEFAULT_ALERT_THRESHOLD);
    this.estado = estado;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Valida los datos de una variante
   */
  static validar({ nombre, stockTotal, umbralAlerta }) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      const err = new Error('El nombre de la variante es obligatorio.');
      err.codigo = 'VARIANTE_NOMBRE_REQUERIDO';
      err.status = 400;
      throw err;
    }

    if (nombre.trim().length > 60) {
      const err = new Error('El nombre de la variante no puede exceder los 60 caracteres.');
      err.codigo = 'VARIANTE_NOMBRE_DEMASIADO_LARGO';
      err.status = 400;
      throw err;
    }

    if (stockTotal !== undefined && stockTotal !== null) {
      const numStock = Number(stockTotal);
      if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
        const err = new Error('La cantidad de stock de la variante debe ser un número entero mayor o igual a 0.');
        err.codigo = 'VARIANTE_STOCK_INVALIDO';
        err.status = 400;
        throw err;
      }
    }

    if (umbralAlerta !== undefined && umbralAlerta !== null) {
      const numUmbral = Number(umbralAlerta);
      if (isNaN(numUmbral) || numUmbral < 0 || !Number.isInteger(numUmbral)) {
        const err = new Error('El umbral de aviso debe ser un número entero mayor o igual a 0.');
        err.codigo = 'VARIANTE_UMBRAL_INVALIDO';
        err.status = 400;
        throw err;
      }
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      productoId: this.productoId,
      nombre: this.nombre,
      sku: this.sku,
      stockTotal: this.stockTotal,
      umbralAlerta: this.umbralAlerta,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
