import { Cart, CartItem } from '../models/cart.model.js';
import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

export class CartService {
  /**
   * Obtiene o crea una instancia de Cart para el usuario o sesión
   */
  static getOrCreateCart(usuarioId = null) {
    if (!usuarioId) {
      return new Cart();
    }

    const rawCart = store.getCart(usuarioId);
    if (!rawCart) {
      const newCart = new Cart({ usuarioId });
      store.saveCart(usuarioId, newCart);
      return newCart;
    }

    if (rawCart instanceof Cart) {
      rawCart.recalcular();
      return rawCart;
    }

    const cartInstance = new Cart(rawCart);
    store.saveCart(usuarioId, cartInstance);
    return cartInstance;
  }

  /**
   * Añade un producto o variante al carrito validando stock disponible
   */
  static addItem(cart, { varianteId, cantidad = 1, precioUnitario = null }) {
    if (!varianteId || typeof varianteId !== 'string') {
      throw new AppError('El identificador de variante es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const cantNum = typeof cantidad === 'number' ? cantidad : (typeof cantidad === 'string' && cantidad.trim() !== '' ? Number(cantidad) : NaN);
    if (!Number.isInteger(cantNum) || cantNum < 1) {
      throw new AppError('La cantidad debe ser un número entero mayor que 0.', 400, 'PARAMETROS_INVALIDOS');
    }

    const itemInv = store.getInventoryItem(varianteId);
    const variant = store.getVariantById(varianteId);
    const prod = store.getProductById(variant?.productoId || itemInv?.productoId);

    if ((!itemInv && !variant) || variant?.estado === 'archivada' || prod?.estado === 'archivado') {
      throw new AppError('El producto solicitado no está disponible en el catálogo.', 400, 'PRODUCTO_NO_DISPONIBLE');
    }

    const stockDisponible = store.getAvailableStock(varianteId);
    const existing = cart.getItem(varianteId);
    const cantidadTotalPretendida = (existing ? existing.cantidad : 0) + cantNum;

    if (cantidadTotalPretendida > stockDisponible) {
      const err = new AppError('Existencias insuficientes para la cantidad solicitada.', 409, 'STOCK_INSUFICIENTE');
      err.varianteId = varianteId;
      err.stockDisponible = stockDisponible;
      err.cantidadSolicitada = cantidadTotalPretendida;
      throw err;
    }

    const precioVigente = prod ? prod.precioBase : (itemInv?.precioUnitario || precioUnitario || 0);
    const titulo = itemInv?.titulo || prod?.titulo || variant?.nombre || 'Pieza Artesanal';
    const productoId = prod?.id || itemInv?.productoId || variant?.productoId || '';

    cart.addItem({
      varianteId,
      productoId,
      titulo,
      precioUnitario: precioVigente,
      cantidad: cantNum,
      stockDisponible
    });

    if (cart.usuarioId) {
      store.saveCart(cart.usuarioId, cart);
    }

    return cart;
  }

  /**
   * Actualiza la cantidad de una línea del carrito
   */
  static updateQuantity(cart, varianteId, cantidad) {
    const cantNum = typeof cantidad === 'number' ? cantidad : (typeof cantidad === 'string' && cantidad.trim() !== '' ? Number(cantidad) : NaN);
    if (!Number.isInteger(cantNum) || cantNum < 0) {
      throw new AppError('La cantidad debe ser un número entero mayor o igual a 0.', 400, 'PARAMETROS_INVALIDOS');
    }

    if (cantNum === 0) {
      return this.removeItem(cart, varianteId);
    }

    const stockDisponible = store.getAvailableStock(varianteId);
    cart.updateQuantity(varianteId, cantNum, stockDisponible);

    if (cart.usuarioId) {
      store.saveCart(cart.usuarioId, cart);
    }

    return cart;
  }

  /**
   * Elimina una línea del carrito
   */
  static removeItem(cart, varianteId) {
    cart.removeItem(varianteId);
    if (cart.usuarioId) {
      store.saveCart(cart.usuarioId, cart);
    }
    return cart;
  }

  /**
   * Vacía el carrito por completo
   */
  static clearCart(cart) {
    cart.clear();
    if (cart.usuarioId) {
      store.deleteCart(cart.usuarioId);
    }
    return cart;
  }

  /**
   * Valida stock en tiempo real y sincroniza precios con el catálogo
   */
  static validarStock(items = []) {
    const itemsValidados = [];
    const avisos = [];

    for (const item of items) {
      const varianteId = item.varianteId;
      const cantidadDeseada = typeof item.cantidad === 'number' ? item.cantidad : (parseInt(item.cantidad, 10) || 1);
      const itemInv = store.getInventoryItem(varianteId);
      const variant = store.getVariantById(varianteId);
      const prod = store.getProductById(variant?.productoId || itemInv?.productoId);
      const titulo = itemInv?.titulo || prod?.titulo || variant?.nombre || 'Pieza Artesanal';
      const precioVigente = prod ? prod.precioBase : (itemInv?.precioUnitario || Number(item.precioUnitario) || 0);

      // Comprobar si está despublicado o archivado
      if ((!itemInv && !variant) || variant?.estado === 'archivada' || prod?.estado === 'archivado') {
        itemsValidados.push({
          varianteId,
          titulo,
          cantidadDeseada,
          cantidadAjustada: 0,
          stockDisponible: 0,
          precioVigente,
          estado: CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
        });
        avisos.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.PRODUCT_UNAVAILABLE,
          mensaje: `El producto '${titulo}' ya no está disponible en el catálogo.`
        });
        continue;
      }

      const stockDisponible = store.getAvailableStock(varianteId);

      if (stockDisponible <= 0) {
        itemsValidados.push({
          varianteId,
          titulo,
          cantidadDeseada,
          cantidadAjustada: 0,
          stockDisponible: 0,
          precioVigente,
          estado: CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK
        });
        avisos.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_EXHAUSTED,
          mensaje: `El artículo '${titulo}' se ha agotado.`
        });
      } else if (cantidadDeseada > stockDisponible) {
        itemsValidados.push({
          varianteId,
          titulo,
          cantidadDeseada,
          cantidadAjustada: stockDisponible,
          stockDisponible,
          precioVigente,
          estado: CONSTANTS.CART.ITEM_STATUS.ADJUSTED
        });
        avisos.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
          mensaje: `El artículo '${titulo}' ha sido reajustado a ${stockDisponible} unidades por compras recientes.`,
          cantidadPrevia: cantidadDeseada,
          cantidadNueva: stockDisponible
        });
      } else {
        itemsValidados.push({
          varianteId,
          titulo,
          cantidadDeseada,
          cantidadAjustada: cantidadDeseada,
          stockDisponible,
          precioVigente,
          estado: CONSTANTS.CART.ITEM_STATUS.AVAILABLE
        });
      }

      // Comprobación de precio modificado en catálogo
      const precioAnterior = item.precioUnitario !== undefined && item.precioUnitario !== null
        ? Number(item.precioUnitario)
        : (itemInv && itemInv.precioUnitario !== undefined ? Number(itemInv.precioUnitario) : null);

      if (
        precioAnterior !== null &&
        !isNaN(precioAnterior) &&
        Math.abs(precioAnterior - Number(precioVigente)) > 0.001
      ) {
        avisos.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.PRICE_UPDATED,
          mensaje: `El precio de '${titulo}' se ha actualizado de ${precioAnterior.toFixed(2)} € a ${Number(precioVigente).toFixed(2)} € en catálogo.`,
          precioPrevio: precioAnterior,
          precioNuevo: Number(precioVigente)
        });
      }
    }

    const valido = itemsValidados.every(it => it.estado === CONSTANTS.CART.ITEM_STATUS.AVAILABLE);
    const bloqueaTramitacion = itemsValidados.some(
      it => it.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK || it.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
    );

    return {
      valido,
      bloqueaTramitacion,
      items: itemsValidados,
      avisos
    };
  }

  /**
   * Fusiona el carrito local del comprador con el carrito en su cuenta de usuario
   */
  static fusionarCarritos(usuarioId, itemsLocales = []) {
    if (!usuarioId) {
      throw new AppError('El identificador de usuario es obligatorio para la fusión.', 400, 'PARAMETROS_INVALIDOS');
    }

    const carrito = this.getOrCreateCart(usuarioId);
    const avisosReajuste = [];

    for (const localItem of itemsLocales) {
      const varianteId = localItem.varianteId;
      const cantLocal = typeof localItem.cantidad === 'number' ? localItem.cantidad : (parseInt(localItem.cantidad, 10) || 1);

      const itemInv = store.getInventoryItem(varianteId);
      const variant = store.getVariantById(varianteId);
      const prod = store.getProductById(variant?.productoId || itemInv?.productoId);
      const titulo = itemInv?.titulo || prod?.titulo || variant?.nombre || 'Pieza Artesanal';
      const precioVigente = prod ? prod.precioBase : (itemInv?.precioUnitario || Number(localItem.precioUnitario) || 0);

      // Si está archivado o despublicado
      if ((!itemInv && !variant) || variant?.estado === 'archivada' || prod?.estado === 'archivado') {
        const itemExistente = carrito.getItem(varianteId);
        if (itemExistente) {
          itemExistente.estado = CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE;
          itemExistente.stockDisponible = 0;
          itemExistente.recalcular();
        } else {
          carrito.items.push(new CartItem({
            varianteId,
            productoId: prod?.id || '',
            titulo,
            precioUnitario: precioVigente,
            cantidad: cantLocal,
            stockDisponible: 0,
            estado: CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
          }));
        }
        avisosReajuste.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.PRODUCT_UNAVAILABLE,
          mensaje: `El producto '${titulo}' ya no está disponible en catálogo.`
        });
        continue;
      }

      const stockDisponible = store.getAvailableStock(varianteId);

      if (stockDisponible <= 0) {
        const itemExistente = carrito.getItem(varianteId);
        if (itemExistente) {
          itemExistente.estado = CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK;
          itemExistente.stockDisponible = 0;
          itemExistente.recalcular();
        } else {
          carrito.items.push(new CartItem({
            varianteId,
            productoId: prod?.id || '',
            titulo,
            precioUnitario: precioVigente,
            cantidad: cantLocal,
            stockDisponible: 0,
            estado: CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK
          }));
        }
        avisosReajuste.push({
          varianteId,
          titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_EXHAUSTED,
          mensaje: `El artículo '${titulo}' está agotado.`
        });
        continue;
      }

      const existing = carrito.getItem(varianteId);
      if (existing) {
        const suma = existing.cantidad + cantLocal;
        if (suma <= stockDisponible) {
          existing.cantidad = suma;
        } else {
          existing.cantidad = stockDisponible;
          avisosReajuste.push({
            varianteId,
            titulo,
            tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
            mensaje: `El artículo '${titulo}' ha sido reajustado a ${stockDisponible} unidades para respetar el inventario disponible.`,
            cantidadPrevia: suma,
            cantidadNueva: stockDisponible
          });
        }
        existing.stockDisponible = stockDisponible;
        existing.precioUnitario = precioVigente;
        existing.estado = CONSTANTS.CART.ITEM_STATUS.AVAILABLE;
        existing.recalcular();
      } else {
        let cantidadFinal = cantLocal;
        if (cantLocal > stockDisponible) {
          cantidadFinal = stockDisponible;
          avisosReajuste.push({
            varianteId,
            titulo,
            tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
            mensaje: `El artículo '${titulo}' ha sido reajustado a ${stockDisponible} unidades para respetar el inventario disponible.`,
            cantidadPrevia: cantLocal,
            cantidadNueva: stockDisponible
          });
        }
        carrito.addItem({
          varianteId,
          productoId: prod?.id || '',
          titulo,
          precioUnitario: precioVigente,
          cantidad: cantidadFinal,
          stockDisponible
        });
      }
    }

    carrito.recalcular();
    store.saveCart(usuarioId, carrito);

    return {
      carrito,
      avisosReajuste
    };
  }
}
