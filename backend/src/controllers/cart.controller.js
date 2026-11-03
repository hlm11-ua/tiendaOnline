import { CartService } from '../services/cart.service.js';
import { AppError } from '../middleware/error-handler.js';

export class CartController {
  static getCart(req, res, next) {
    try {
      const usuarioId = req.headers['x-usuario-id'] || null;
      const cart = CartService.getOrCreateCart(usuarioId);
      res.json(cart.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static addItem(req, res, next) {
    try {
      const usuarioId = req.headers['x-usuario-id'] || null;
      const { varianteId, cantidad, precioUnitario } = req.body || {};

      if (!varianteId || typeof varianteId !== 'string') {
        throw new AppError('El identificador de variante es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
      }

      const cart = CartService.getOrCreateCart(usuarioId);
      CartService.addItem(cart, { varianteId, cantidad, precioUnitario });
      res.json(cart.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static updateQuantity(req, res, next) {
    try {
      const usuarioId = req.headers['x-usuario-id'] || null;
      const { varianteId } = req.params;
      const { cantidad } = req.body || {};

      if (!varianteId) {
        throw new AppError('El identificador de variante es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
      }

      if (cantidad === undefined || cantidad === null) {
        throw new AppError('La cantidad es obligatoria.', 400, 'PARAMETROS_INVALIDOS');
      }

      const cart = CartService.getOrCreateCart(usuarioId);
      CartService.updateQuantity(cart, varianteId, cantidad);
      res.json(cart.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static removeItem(req, res, next) {
    try {
      const usuarioId = req.headers['x-usuario-id'] || null;
      const { varianteId } = req.params;

      if (!varianteId) {
        throw new AppError('El identificador de variante es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
      }

      const cart = CartService.getOrCreateCart(usuarioId);
      CartService.removeItem(cart, varianteId);
      res.json(cart.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static clearCart(req, res, next) {
    try {
      const usuarioId = req.headers['x-usuario-id'] || null;
      const cart = CartService.getOrCreateCart(usuarioId);
      CartService.clearCart(cart);
      res.json(cart.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static validarStock(req, res, next) {
    try {
      const { items } = req.body || {};
      if (!Array.isArray(items)) {
        throw new AppError('La lista de artículos es obligatoria.', 400, 'PARAMETROS_INVALIDOS');
      }

      const resultado = CartService.validarStock(items);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static fusionarCarritos(req, res, next) {
    try {
      const { usuarioId, itemsLocales } = req.body || {};

      if (!usuarioId || typeof usuarioId !== 'string') {
        throw new AppError('El identificador de usuario (usuarioId) es obligatorio para la fusión.', 400, 'PARAMETROS_INVALIDOS');
      }

      if (!Array.isArray(itemsLocales)) {
        throw new AppError('itemsLocales debe ser una lista de artículos.', 400, 'PARAMETROS_INVALIDOS');
      }

      const resultado = CartService.fusionarCarritos(usuarioId, itemsLocales);
      res.json({
        carrito: resultado.carrito.toJSON(),
        avisosReajuste: resultado.avisosReajuste
      });
    } catch (err) {
      next(err);
    }
  }
}
