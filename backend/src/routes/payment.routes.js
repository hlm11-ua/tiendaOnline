import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller.js';
import { WebhookController } from '../controllers/webhook.controller.js';

export const paymentRoutes = Router();

// Catálogo para demo y pruebas
paymentRoutes.get('/catalogo', CheckoutController.getCatalog);

// Flujo de pago
paymentRoutes.post('/iniciar', CheckoutController.iniciar);
paymentRoutes.post('/procesar', CheckoutController.procesar);
paymentRoutes.post('/verificar-3ds', CheckoutController.verificar3ds);

// Liberación de la reserva de stock de un checkout abandonado sin pagar
paymentRoutes.post('/:sesionPagoId/liberar', CheckoutController.liberar);

// Webhook bancario asíncrono server-to-server
paymentRoutes.post('/webhook', WebhookController.handleNotification);
