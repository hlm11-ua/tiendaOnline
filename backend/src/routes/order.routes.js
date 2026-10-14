import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';

export const orderRoutes = Router();

// Consultar todos los pedidos confirmados
orderRoutes.get('/', OrderController.listAll);

// Consultar un pedido específico por su código de referencia
orderRoutes.get('/:codigoReferencia', OrderController.getByReference);
