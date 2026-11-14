import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';
import { DatosExpedicion } from '../models/shipment.model.js';

export class AccountOrderService {
  /**
   * Obtiene la lista cronológica de pedidos pertenecientes al cliente
   */
  static getCustomerOrders(cuentaId, email = null) {
    const orders = store.getOrdersByAccountId(cuentaId, email);

    return orders.map(order => this.formatOrderResponse(order));
  }

  /**
   * Obtiene el detalle de un pedido específico validando rigurosamente la propiedad (aislamiento IDOR)
   */
  static getOrderForCustomer(cuentaId, email, codigoReferencia) {
    if (!codigoReferencia) {
      throw new AppError('El código de referencia es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const order = store.getOrderByCode(codigoReferencia);
    if (!order) {
      throw new AppError(`Pedido con referencia "${codigoReferencia}" no encontrado.`, 404, 'PEDIDO_NO_ENCONTRADO');
    }

    // Comprobar pertenencia por cuentaId o correo del comprador
    const normalizedEmail = email ? email.toLowerCase() : null;
    const isOwnerByAccountId = Boolean(cuentaId && order.cuentaId && order.cuentaId === cuentaId);
    const isOwnerByEmail = Boolean(normalizedEmail && order.clienteEmail && order.clienteEmail.toLowerCase() === normalizedEmail);

    if (!isOwnerByAccountId && !isOwnerByEmail) {
      throw new AppError('Acceso denegado. No tiene permisos para consultar este pedido.', 403, 'ACCESO_DENEGADO');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Permite al administrador actualizar manualmente la fase y tracking del pedido
   */
  static updateOrderPhase({ codigoReferencia, fase, numeroSeguimiento, transportista, notas = null }) {
    if (!codigoReferencia) {
      throw new AppError('El código de referencia es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const order = store.getOrderByCode(codigoReferencia);
    if (!order) {
      throw new AppError(`Pedido con referencia "${codigoReferencia}" no encontrado.`, 404, 'PEDIDO_NO_ENCONTRADO');
    }

    // Normalizar fase ('salido de la tienda' -> 'salido_tienda')
    let normalizedFase = fase;
    if (fase === 'salido de la tienda') {
      normalizedFase = CONSTANTS.ORDER_STATUS?.SHIPPED || 'salido_tienda';
    }

    const validPhases = [
      CONSTANTS.ORDER_STATUS?.PENDING || 'pendiente',
      CONSTANTS.ORDER_STATUS?.PAID || 'pagado',
      CONSTANTS.ORDER_STATUS?.IN_PREPARATION || 'en_preparacion',
      CONSTANTS.ORDER_STATUS?.SHIPPED || 'salido_tienda',
      CONSTANTS.ORDER_STATUS?.DELIVERED || 'entregado'
    ];

    if (!normalizedFase || !validPhases.includes(normalizedFase)) {
      throw new AppError(`La fase "${fase}" no es válida.`, 400, 'FASE_INVALIDA');
    }

    // Si la fase es 'salido_tienda', se requiere número de seguimiento
    if (normalizedFase === (CONSTANTS.ORDER_STATUS?.SHIPPED || 'salido_tienda')) {
      const tracking = numeroSeguimiento || order.envio?.numeroSeguimiento;
      if (!tracking) {
        throw new AppError('El código de seguimiento es obligatorio para pedidos despachados.', 400, 'TRACKING_REQUERIDO');
      }

      const carrierName = (transportista || order.envio?.transportista || 'Correos de España').trim();

      // Reutiliza las validaciones oficiales de expedición (6 a 32 caracteres alfanuméricos, FR-006)
      try {
        DatosExpedicion.validar({ transportista: carrierName, numeroSeguimiento: tracking });
      } catch (errValidacion) {
        throw new AppError(errValidacion.message, 400, errValidacion.codigo || 'TRACKING_INVALIDO');
      }

      const datosEnvio = new DatosExpedicion({
        transportista: carrierName,
        numeroSeguimiento: tracking.trim(),
        notas: notas ? String(notas).trim() : null
      });

      store.updateOrderShipment(codigoReferencia, datosEnvio);
    } else if (numeroSeguimiento) {
      // Si se proporcionó tracking para otra fase (ej. entregado)
      const carrierName = (transportista || order.envio?.transportista || 'Correos de España').trim();

      try {
        DatosExpedicion.validar({ transportista: carrierName, numeroSeguimiento });
      } catch (errValidacion) {
        throw new AppError(errValidacion.message, 400, errValidacion.codigo || 'TRACKING_INVALIDO');
      }

      const datosEnvio = new DatosExpedicion({
        transportista: carrierName,
        numeroSeguimiento: String(numeroSeguimiento).trim(),
        notas: notas ? String(notas).trim() : null
      });
      store.updateOrderShipment(codigoReferencia, datosEnvio);
    }

    store.updateOrderStatus(codigoReferencia, normalizedFase);

    // Registrar en historial de fases inmutable
    if (!Array.isArray(order.historialFases)) {
      order.historialFases = [];
    }

    order.historialFases.push({
      fase: normalizedFase,
      fecha: new Date().toISOString(),
      responsable: 'admin',
      notas: notas ? String(notas).trim() : null
    });

    return this.formatOrderResponse(order);
  }

  /**
   * Helper de formateo de respuesta para el contrato del cliente (PedidoResumen / PedidoDetalle)
   */
  static formatOrderResponse(order) {
    const raw = typeof order.toJSON === 'function' ? order.toJSON() : { ...order };
    const lineas = Array.isArray(raw.lineas) ? raw.lineas : [];

    return {
      ...raw,
      fase: raw.estado,
      moneda: CONSTANTS.CURRENCY,
      numeroArticulos: lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0),
      numeroSeguimiento: raw.envio?.numeroSeguimiento || null,
      transportista: raw.envio?.transportista || null
    };
  }
}
