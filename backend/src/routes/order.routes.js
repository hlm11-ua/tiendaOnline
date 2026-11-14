import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { AccountOrderController } from '../controllers/account-order.controller.js';
import { requireAuth } from '../middleware/account-auth.js';
import { requireAdminRole } from '../middleware/auth.js';

export const orderRoutes = Router();

// Rutas privadas de cliente (Feature 004) - Se registran PRIMERO para evitar sombreado de ruta
orderRoutes.get('/mis-compras', requireAuth, AccountOrderController.listMyOrders);
orderRoutes.get('/mis-compras/:codigoReferencia', requireAuth, AccountOrderController.getMyOrderDetails);

// Modificación manual de fase por Administrador (Feature 004)
orderRoutes.put('/:codigoReferencia/fase', requireAdminRole, AccountOrderController.updatePhase);

// Consultar todos los pedidos confirmados
orderRoutes.get('/', OrderController.listAll);

// Consultar un pedido específico por su código de referencia
orderRoutes.get('/:codigoReferencia', OrderController.getByReference);
