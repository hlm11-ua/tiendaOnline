import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Modelo de Línea de Carrito (CartItem)
 */
export class CartItem {
  constructor({
    varianteId,
    productoId,
    titulo,
    precioUnitario,
    cantidad = 1,
    stockDisponible = 0,
    estado = CONSTANTS.CART.ITEM_STATUS.AVAILABLE
  }) {
    if (!varianteId || typeof varianteId !== 'string') {
      throw new AppError('El identificador de variante es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    this.varianteId = varianteId;
    this.productoId = productoId || '';
    this.titulo = titulo || '';
    this.precioUnitario = Number(Number(precioUnitario || 0).toFixed(2));
    this.stockDisponible = Math.max(0, parseInt(stockDisponible, 10) || 0);

    // Cantidad debe ser entero positivo
    const cantNum = typeof cantidad === 'number' ? cantidad : (typeof cantidad === 'string' && cantidad.trim() !== '' ? Number(cantidad) : NaN);
    if (!Number.isInteger(cantNum) || cantNum < 1) {
      throw new AppError('La cantidad debe ser un número entero mayor que 0.', 400, 'PARAMETROS_INVALIDOS');
    }
    this.cantidad = cantNum;
    this.estado = estado;
    this.recalcular();
  }

  recalcular() {
    if (
      this.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK ||
      this.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
    ) {
      this.subtotalLinea = 0.00;
    } else {
      this.subtotalLinea = Number((this.precioUnitario * this.cantidad).toFixed(2));
    }
  }

  toJSON() {
    return {
      varianteId: this.varianteId,
      productoId: this.productoId,
      titulo: this.titulo,
      precioUnitario: this.precioUnitario,
      cantidad: this.cantidad,
      stockDisponible: this.stockDisponible,
      subtotalLinea: this.subtotalLinea,
      estado: this.estado
    };
  }
}

/**
 * Modelo del Contenedor de Compra (Cart)
 */
export class Cart {
  constructor({
    id = crypto.randomUUID(),
    usuarioId = null,
    items = [],
    gastosEnvioEstimados = CONSTANTS.CART.DEFAULT_SHIPPING_ESTIMATE_EUR,
    fechaActualizacion = new Date().toISOString()
  } = {}) {
    this.id = id;
    this.usuarioId = usuarioId || null;
    this.items = Array.isArray(items)
      ? items.map(it => (it instanceof CartItem ? it : new CartItem(it)))
      : [];
    this.gastosEnvioEstimados = Number(Number(gastosEnvioEstimados || 0).toFixed(2));
    this.moneda = CONSTANTS.CURRENCY;
    this.fechaActualizacion = fechaActualizacion;
    this.recalcular();
  }

  recalcular() {
    let subtotal = 0;
    let tieneBloqueo = false;

    for (const item of this.items) {
      item.recalcular();
      if (
        item.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK ||
        item.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
      ) {
        tieneBloqueo = true;
      } else {
        subtotal += item.subtotalLinea;
      }
    }

    this.subtotal = Number(subtotal.toFixed(2));
    this.total = Number((this.subtotal + this.gastosEnvioEstimados).toFixed(2));

    if (this.items.length === 0) {
      this.estado = CONSTANTS.CART.STATUS.EMPTY;
      this.subtotal = 0.00;
      this.total = 0.00;
    } else if (tieneBloqueo) {
      this.estado = CONSTANTS.CART.STATUS.BLOCKED;
    } else {
      this.estado = CONSTANTS.CART.STATUS.READY;
    }

    this.fechaActualizacion = new Date().toISOString();
  }

  getItem(varianteId) {
    return this.items.find(it => it.varianteId === varianteId) || null;
  }

  addItem(itemData) {
    if (this.items.length >= CONSTANTS.CART.MAX_ITEMS) {
      throw new AppError(
        `El carrito no puede superar el límite de ${CONSTANTS.CART.MAX_ITEMS} líneas de producto.`,
        400,
        'LIMITE_LINEAS_SUPERADO'
      );
    }

    const existing = this.getItem(itemData.varianteId);
    if (existing) {
      existing.cantidad += itemData.cantidad;
      if (itemData.precioUnitario !== undefined) {
        existing.precioUnitario = Number(Number(itemData.precioUnitario).toFixed(2));
      }
      if (itemData.stockDisponible !== undefined) {
        existing.stockDisponible = itemData.stockDisponible;
      }
      if (itemData.estado !== undefined) {
        existing.estado = itemData.estado;
      }
      existing.recalcular();
    } else {
      this.items.push(itemData instanceof CartItem ? itemData : new CartItem(itemData));
    }

    this.recalcular();
    return this;
  }

  updateQuantity(varianteId, cantidad, stockDisponible = null) {
    const cantNum = typeof cantidad === 'number' ? cantidad : (typeof cantidad === 'string' && cantidad.trim() !== '' ? Number(cantidad) : NaN);
    if (!Number.isInteger(cantNum) || cantNum < 0) {
      throw new AppError('La cantidad debe ser un número entero mayor o igual a 0.', 400, 'PARAMETROS_INVALIDOS');
    }

    if (cantNum === 0) {
      return this.removeItem(varianteId);
    }

    const item = this.getItem(varianteId);
    if (!item) {
      throw new AppError(`El artículo con varianteId "${varianteId}" no está en el carrito.`, 404, 'ARTICULO_NO_ENCONTRADO');
    }

    if (stockDisponible !== null) {
      item.stockDisponible = stockDisponible;
    }

    if (cantNum > item.stockDisponible) {
      const err = new AppError('La cantidad solicitada supera las existencias disponibles.', 409, 'STOCK_INSUFICIENTE');
      err.varianteId = varianteId;
      err.stockDisponible = item.stockDisponible;
      err.cantidadSolicitada = cantNum;
      throw err;
    }

    item.cantidad = cantNum;
    item.estado = CONSTANTS.CART.ITEM_STATUS.AVAILABLE;
    item.recalcular();
    this.recalcular();
    return this;
  }

  removeItem(varianteId) {
    const index = this.items.findIndex(it => it.varianteId === varianteId);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.recalcular();
    }
    return this;
  }

  clear() {
    this.items = [];
    this.recalcular();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      usuarioId: this.usuarioId,
      items: this.items.map(it => it.toJSON()),
      subtotal: this.subtotal,
      gastosEnvioEstimados: this.gastosEnvioEstimados,
      total: this.total,
      moneda: this.moneda,
      estado: this.estado,
      fechaActualizacion: this.fechaActualizacion
    };
  }
}
