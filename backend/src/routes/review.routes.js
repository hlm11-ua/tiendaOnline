import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller.js';

export const reviewRoutes = Router();

// Consultar valoraciones y resumen de un producto
reviewRoutes.get('/producto/:productoId', ReviewController.getReviews);

// Comprobar elegibilidad de valoración de un usuario
reviewRoutes.get('/elegibilidad/:productoId', ReviewController.checkEligibility);

// Publicar una nueva valoración y comentario
reviewRoutes.post('/', ReviewController.createReview);
