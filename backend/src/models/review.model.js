import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Modelo de Entidad Reseña / Valoración (Feature 005)
 * Representa la opinión verificada de un comprador sobre un producto artesanal.
 */
export class Review {
  constructor({
    id,
    productoId,
    usuarioId,
    usuarioNombre = 'Cliente verificado',
    usuarioEmail = '',
    puntuacion,
    comentario,
    fechaCreacion
  }) {
    this.id = id || `res-${crypto.randomUUID()}`;
    this.productoId = productoId ? String(productoId).trim() : '';
    this.usuarioId = usuarioId ? String(usuarioId).trim() : '';
    this.usuarioNombre = usuarioNombre ? String(usuarioNombre).trim() : 'Cliente verificado';
    this.usuarioEmail = usuarioEmail ? String(usuarioEmail).trim().toLowerCase() : '';
    this.puntuacion = Number(puntuacion);
    this.comentario = comentario ? String(comentario).trim() : '';
    this.fechaCreacion = fechaCreacion || new Date().toISOString();

    this.validate();
  }

  /**
   * Valida exhaustivamente las restricciones del modelo de datos
   */
  validate() {
    if (!this.productoId) {
      throw new AppError('El identificador del producto es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    if (!this.usuarioId) {
      throw new AppError('El identificador del usuario es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    if (
      isNaN(this.puntuacion) ||
      !Number.isInteger(this.puntuacion) ||
      this.puntuacion < CONSTANTS.REVIEWS.MIN_RATING ||
      this.puntuacion > CONSTANTS.REVIEWS.MAX_RATING
    ) {
      throw new AppError(
        CONSTANTS.REVIEWS.MESSAGES.INVALID_RATING,
        400,
        'PUNTUACION_INVALIDA'
      );
    }

    if (
      !this.comentario ||
      this.comentario.length < CONSTANTS.REVIEWS.MIN_COMMENT_LENGTH
    ) {
      throw new AppError(
        CONSTANTS.REVIEWS.MESSAGES.EMPTY_COMMENT,
        400,
        'COMENTARIO_OBLIGATORIO'
      );
    }

    if (this.comentario.length > CONSTANTS.REVIEWS.MAX_COMMENT_LENGTH) {
      throw new AppError(
        `El comentario no puede exceder los ${CONSTANTS.REVIEWS.MAX_COMMENT_LENGTH} caracteres.`,
        400,
        'COMENTARIO_DEMASIADO_LARGO'
      );
    }
  }

  /**
   * Convierte la instancia en un objeto plano para serialización JSON
   */
  toJSON() {
    return {
      id: this.id,
      productoId: this.productoId,
      usuarioId: this.usuarioId,
      usuarioNombre: this.usuarioNombre,
      usuarioEmail: this.usuarioEmail,
      puntuacion: this.puntuacion,
      comentario: this.comentario,
      fechaCreacion: this.fechaCreacion
    };
  }
}
