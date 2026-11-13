import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';
import { resolveCartIdentity } from '../middleware/cart-identity.js';

export const cartRoutes = Router();

// Endpoints del carrito de compras (Feature 002)
// La identidad del comprador se resuelve del token de sesión (Feature 004)
// o, en su defecto, de la cabecera de prueba x-usuario-id.
cartRoutes.get('/', resolveCartIdentity, CartController.getCart);
cartRoutes.delete('/', resolveCartIdentity, CartController.clearCart);

cartRoutes.post('/items', resolveCartIdentity, CartController.addItem);
cartRoutes.put('/items/:varianteId', resolveCartIdentity, CartController.updateQuantity);
cartRoutes.delete('/items/:varianteId', resolveCartIdentity, CartController.removeItem);

cartRoutes.post('/validar-stock', CartController.validarStock);
cartRoutes.post('/fusionar', CartController.fusionarCarritos);
