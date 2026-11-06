import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';

export const cartRoutes = Router();

// Endpoints del carrito de compras (Feature 002)
cartRoutes.get('/', CartController.getCart);
cartRoutes.delete('/', CartController.clearCart);

cartRoutes.post('/items', CartController.addItem);
cartRoutes.put('/items/:varianteId', CartController.updateQuantity);
cartRoutes.delete('/items/:varianteId', CartController.removeItem);

cartRoutes.post('/validar-stock', CartController.validarStock);
cartRoutes.post('/fusionar', CartController.fusionarCarritos);
