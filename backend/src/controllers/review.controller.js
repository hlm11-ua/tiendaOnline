import { ReviewService } from '../services/review.service.js';

/**
 * Controlador de Endpoints REST para Reseñas y Valoraciones (Feature 005)
 */
export class ReviewController {
  /**
   * GET /api/resenas/producto/:productoId
   */
  static getReviews(req, res, next) {
    try {
      const { productoId } = req.params;
      const data = ReviewService.getReviewsByProduct(productoId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/resenas/elegibilidad/:productoId
   */
  static checkEligibility(req, res, next) {
    try {
      const { productoId } = req.params;
      const usuarioId = req.headers['x-usuario-id'] || req.query?.usuarioId || null;
      const usuarioEmail = req.headers['x-usuario-email'] || req.query?.usuarioEmail || null;
      const usuarioNombre = req.headers['x-usuario-nombre'] || req.query?.usuarioNombre || null;

      const data = ReviewService.checkReviewEligibility(productoId, {
        usuarioId,
        usuarioEmail,
        usuarioNombre
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/resenas
   */
  static createReview(req, res, next) {
    try {
      const { productoId, puntuacion, comentario } = req.body || {};
      const usuarioId = req.headers['x-usuario-id'] || req.body?.usuarioId || null;
      const usuarioEmail = req.headers['x-usuario-email'] || req.body?.usuarioEmail || null;
      const usuarioNombre = req.headers['x-usuario-nombre'] || req.body?.usuarioNombre || null;

      const result = ReviewService.createReview({
        productoId,
        puntuacion,
        comentario,
        usuarioId,
        usuarioNombre,
        usuarioEmail
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}
