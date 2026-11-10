import { store } from '../models/store.js';
import { Review } from '../models/review.model.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Servicio de negocio para la gestión de reseñas y valoraciones (Feature 005)
 * Cumple con la constitución del proyecto (Simplicidad v1, es-ES)
 */
export class ReviewService {
  /**
   * Obtiene el resumen de calificaciones y la colección de reseñas verificadas de un producto
   * @param {string} productoId
   * @returns {Object} { productoId, media, total, distribucion, items }
   */
  static getReviewsByProduct(productoId) {
    if (!productoId) {
      throw new AppError('El identificador de producto es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const producto = store.getProductById(productoId);
    if (!producto) {
      throw new AppError('El producto solicitado no existe en el catálogo.', 404, 'PRODUCTO_NO_ENCONTRADO');
    }

    const reviews = store.getReviewsByProductId(productoId);
    const total = reviews.length;

    const distribucion = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0
    };

    let sumaPuntuaciones = 0;
    for (const rev of reviews) {
      const p = Math.floor(rev.puntuacion);
      if (distribucion[p] !== undefined) {
        distribucion[p]++;
      }
      sumaPuntuaciones += rev.puntuacion;
    }

    const media = total > 0
      ? Math.round((sumaPuntuaciones / total) * 10) / 10
      : 0;

    // Ordenar de más reciente a más antigua
    const items = [...reviews].sort((a, b) => {
      const dateA = new Date(a.fechaCreacion || 0);
      const dateB = new Date(b.fechaCreacion || 0);
      return dateB - dateA;
    });

    return {
      productoId,
      media,
      total,
      distribucion,
      items
    };
  }

  /**
   * Comprueba si el usuario autenticado tiene permiso para publicar una reseña
   * @param {string} productoId
   * @param {Object} [userInfo] - { usuarioId, usuarioEmail }
   * @returns {Object} { productoId, puedeValorar, motivo, mensaje, resenaPrevia }
   */
  static checkReviewEligibility(productoId, userInfo = {}) {
    if (!productoId) {
      throw new AppError('El identificador de producto es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const producto = store.getProductById(productoId);
    if (!producto) {
      throw new AppError('El producto solicitado no existe en el catálogo.', 404, 'PRODUCTO_NO_ENCONTRADO');
    }

    const usuarioId = userInfo.usuarioId ? String(userInfo.usuarioId).trim() : null;
    const usuarioEmail = userInfo.usuarioEmail ? String(userInfo.usuarioEmail).trim().toLowerCase() : null;

    // 1. Comprobación de usuario autenticado / identificado
    if (!usuarioId && !usuarioEmail) {
      return {
        productoId,
        usuarioId: null,
        puedeValorar: false,
        motivo: CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.UNAUTHENTICATED,
        mensaje: CONSTANTS.REVIEWS.MESSAGES.AUTH_REQUIRED,
        resenaPrevia: null
      };
    }

    // 2. Comprobación de valoración ya existente (Unicidad estricta)
    if (usuarioId) {
      const resenaPrevia = store.getReviewByUserAndProduct(usuarioId, productoId);
      if (resenaPrevia) {
        return {
          productoId,
          usuarioId,
          puedeValorar: false,
          motivo: CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.ALREADY_REVIEWED,
          mensaje: CONSTANTS.REVIEWS.MESSAGES.ALREADY_REVIEWED,
          resenaPrevia
        };
      }
    }

    // 3. Comprobación de compra previa (pedido completado/entregado)
    const tieneCompra = store.hasUserPurchasedProduct(usuarioId, usuarioEmail, productoId);
    if (!tieneCompra) {
      return {
        productoId,
        usuarioId,
        puedeValorar: false,
        motivo: CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.NO_PURCHASE,
        mensaje: CONSTANTS.REVIEWS.MESSAGES.PURCHASE_REQUIRED,
        resenaPrevia: null
      };
    }

    // 4. Usuario con compra verificada y sin reseña previa
    return {
      productoId,
      usuarioId,
      puedeValorar: true,
      motivo: CONSTANTS.REVIEWS.ELIGIBILITY_STATUS.VERIFIED_PURCHASE,
      mensaje: 'Puedes valorar este producto porque tu compra ha sido confirmada.',
      resenaPrevia: null
    };
  }

  /**
   * Crea y persiste una nueva valoración de un comprador verificado
   * @param {Object} reviewData
   * @returns {Object} { mensaje, resena, resumen }
   */
  static createReview(reviewData = {}) {
    const {
      productoId,
      puntuacion,
      comentario,
      usuarioId,
      usuarioNombre,
      usuarioEmail
    } = reviewData;

    if (!productoId) {
      throw new AppError('El identificador de producto es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const producto = store.getProductById(productoId);
    if (!producto) {
      throw new AppError('El producto solicitado no existe en el catálogo.', 404, 'PRODUCTO_NO_ENCONTRADO');
    }

    const uId = usuarioId ? String(usuarioId).trim() : null;
    const uEmail = usuarioEmail ? String(usuarioEmail).trim().toLowerCase() : null;

    if (!uId && !uEmail) {
      throw new AppError(CONSTANTS.REVIEWS.MESSAGES.AUTH_REQUIRED, 401, 'AUTENTICACION_REQUERIDA');
    }

    // Verificar si el usuario ya valoró previamente este producto
    if (uId) {
      const previa = store.getReviewByUserAndProduct(uId, productoId);
      if (previa) {
        throw new AppError(CONSTANTS.REVIEWS.MESSAGES.ALREADY_REVIEWED, 409, 'VALORACION_DUPLICADA');
      }
    }

    // Verificar compra en el historial de pedidos
    const tieneCompra = store.hasUserPurchasedProduct(uId, uEmail, productoId);
    if (!tieneCompra) {
      throw new AppError(CONSTANTS.REVIEWS.MESSAGES.PURCHASE_REQUIRED, 403, 'COMPRA_REQUERIDA');
    }

    // Crear y validar la entidad Review (valida puntuación 1-5 y comentario)
    const review = new Review({
      productoId,
      usuarioId: uId || `usr-${uEmail}`,
      usuarioNombre: usuarioNombre || 'Comprador verificado',
      usuarioEmail: uEmail,
      puntuacion,
      comentario
    });

    const guardada = store.saveReview(review);
    const resumen = this.getReviewsByProduct(productoId);

    return {
      mensaje: CONSTANTS.REVIEWS.MESSAGES.SUCCESS,
      resena: guardada,
      resumen
    };
  }
}
