import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Modelo para las categorías de productos artesanales (FR-002)
 */
export class Categoria {
  constructor({
    id = null,
    nombre,
    descripcion = '',
    slug = null,
    estado = CONSTANTS.CATALOG.CATEGORY_STATUS.ACTIVE,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id || `cat-${Categoria.generarSlug(nombre)}-${crypto.randomBytes(3).toString('hex')}`;
    this.nombre = String(nombre).trim();
    this.descripcion = descripcion ? String(descripcion).trim() : '';
    this.slug = slug || Categoria.generarSlug(nombre);
    this.estado = estado;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Genera un slug simplificado en español
   */
  static generarSlug(texto) {
    if (!texto) return 'categoria';
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'categoria';
  }

  /**
   * Valida los datos de una categoría
   * @throws {Error} si los datos no cumplen las reglas
   */
  static validar({ nombre, descripcion }) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      const err = new Error('El nombre de la categoría es obligatorio y debe tener al menos 2 caracteres.');
      err.codigo = 'CATEGORIA_NOMBRE_INVALIDO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (nombre.trim().length > 80) {
      const err = new Error('El nombre de la categoría no puede superar los 80 caracteres.');
      err.codigo = 'CATEGORIA_NOMBRE_DEMASIADO_LARGO';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    if (descripcion && typeof descripcion === 'string' && descripcion.trim().length > 300) {
      const err = new Error('La descripción de la categoría no puede exceder los 300 caracteres.');
      err.codigo = 'CATEGORIA_DESCRIPCION_DEMASIADO_LARGA';
      err.statusCode = 400;
      err.status = 400;
      throw err;
    }

    return true;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      slug: this.slug,
      estado: this.estado,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
