import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';
import { DatosExpedicion, AvisoEnvio } from '../models/shipment.model.js';
import { AppError } from '../middleware/error-handler.js';

export class LogisticsService {
  /**
   * Obtiene la lista de transportistas admitidos
   */
  static getTransportistas() {
    return CONSTANTS.CARRIERS;
  }

  /**
   * Obtiene la lista de pedidos gestionables por el taller con filtrado opcional por estado
   * @param {string} estado
   */
  static listOrders(estado = 'todos') {
    return store.getOrdersByStatus(estado);
  }

  /**
   * Obtiene un pedido por su código de referencia
   * @param {string} codigoReferencia
   */
  static getOrderByReference(codigoReferencia) {
    const order = store.getOrderByCode(codigoReferencia);
    if (!order) {
      throw new AppError(`Pedido con referencia "${codigoReferencia}" no encontrado.`, 404, 'PEDIDO_NO_ENCONTRADO');
    }
    return order;
  }

  /**
   * Avanza el pedido al estado "en_preparacion" al iniciar su empaquetado (FR-002)
   * @param {string} codigoReferencia
   */
  static iniciarPreparacion(codigoReferencia) {
    const order = this.getOrderByReference(codigoReferencia);

    if (order.estado !== CONSTANTS.ORDER_STATUS.PAID) {
      throw new AppError(
        `No se puede iniciar preparación: el pedido está en estado "${order.estado}". Se requiere estado "pagado".`,
        400,
        'TRANSICION_ESTADO_INVALIDA'
      );
    }

    const updated = store.updateOrderStatus(codigoReferencia, CONSTANTS.ORDER_STATUS.IN_PREPARATION);
    return updated;
  }

  /**
   * Despacha el pedido con transportista y tracking, avanzando a "salido_tienda" y emitiendo aviso (FR-003, FR-004)
   * @param {string} codigoReferencia
   * @param {{ transportista: string, numeroSeguimiento: string, notas?: string }} param1
   */
  static despacharPedido(codigoReferencia, { transportista, numeroSeguimiento, notas = null }) {
    const order = this.getOrderByReference(codigoReferencia);

    // El pedido debe estar en preparación o pagado para poder despacharse
    if (order.estado !== CONSTANTS.ORDER_STATUS.IN_PREPARATION && order.estado !== CONSTANTS.ORDER_STATUS.PAID) {
      throw new AppError(
        `No se puede despachar: el pedido se encuentra en estado "${order.estado}". Debe estar en preparación.`,
        400,
        'TRANSICION_ESTADO_INVALIDA'
      );
    }

    // Validación de datos de expedición (FR-003)
    try {
      DatosExpedicion.validar({ transportista, numeroSeguimiento });
    } catch (err) {
      throw new AppError(err.message, err.status || 400, err.codigo || 'DATOS_EXPEDICION_INVALIDOS');
    }

    const envio = new DatosExpedicion({
      transportista: transportista.trim(),
      numeroSeguimiento: numeroSeguimiento.trim(),
      notas: notas ? String(notas).trim() : null
    });

    // Actualizar estado a "salido_tienda" y asociar datos de envío
    store.updateOrderShipment(codigoReferencia, envio);
    const updatedOrder = store.updateOrderStatus(codigoReferencia, CONSTANTS.ORDER_STATUS.SHIPPED);

    // Generar y almacenar aviso automático observable (FR-004)
    const aviso = AvisoEnvio.crearAvisoSalida({
      pedido: updatedOrder,
      transportista: envio.transportista,
      numeroSeguimiento: envio.numeroSeguimiento
    });
    store.addOrderNotification(codigoReferencia, aviso);

    return {
      pedido: updatedOrder,
      aviso
    };
  }

  /**
   * Rectifica una errata en el tracking antes de que el pedido sea entregado (Edge Case 2)
   * @param {string} codigoReferencia
   * @param {{ transportista?: string, numeroSeguimiento: string, motivo?: string }} param1
   */
  static rectificarTracking(codigoReferencia, { transportista, numeroSeguimiento, motivo = '' }) {
    const order = this.getOrderByReference(codigoReferencia);

    if (order.estado === CONSTANTS.ORDER_STATUS.DELIVERED) {
      throw new AppError(
        'No se puede rectificar el código de seguimiento de un pedido que ya ha sido entregado.',
        400,
        'TRANSICION_ESTADO_INVALIDA'
      );
    }

    if (!order.envio) {
      throw new AppError(
        'El pedido no cuenta con datos de expedición previos para rectificar.',
        400,
        'ENVIO_NO_EXISTE'
      );
    }

    const nuevoTransportista = (transportista || order.envio.transportista).trim();
    const nuevoNumero = String(numeroSeguimiento || '').trim();

    try {
      DatosExpedicion.validar({ transportista: nuevoTransportista, numeroSeguimiento: nuevoNumero });
    } catch (err) {
      throw new AppError(err.message, err.status || 400, err.codigo || 'DATOS_EXPEDICION_INVALIDOS');
    }

    // Instancia o reconstrucción de DatosExpedicion si viniera de POJO
    const envioInstancia = order.envio instanceof DatosExpedicion
      ? order.envio
      : new DatosExpedicion(order.envio);

    envioInstancia.rectificar({
      nuevoNumero,
      nuevoTransportista,
      motivo
    });

    store.updateOrderShipment(codigoReferencia, envioInstancia);
    const updatedOrder = store.getOrderByCode(codigoReferencia);

    // Generar y registrar aviso de rectificación
    const avisoRectificacion = AvisoEnvio.crearAvisoRectificacion({
      pedido: updatedOrder,
      transportista: envioInstancia.transportista,
      numeroSeguimiento: envioInstancia.numeroSeguimiento,
      motivo
    });
    store.addOrderNotification(codigoReferencia, avisoRectificacion);

    return {
      pedido: updatedOrder,
      avisoRectificacion
    };
  }

  /**
   * Marca el pedido como entregado definitivamente (FR-005)
   * @param {string} codigoReferencia
   * @param {'admin'|'cliente'} origen
   */
  static confirmarEntrega(codigoReferencia, origen = 'admin') {
    const order = this.getOrderByReference(codigoReferencia);

    if (order.estado !== CONSTANTS.ORDER_STATUS.SHIPPED) {
      throw new AppError(
        `No se puede marcar como entregado: el pedido está en estado "${order.estado}". Debe haber salido de la tienda previamente.`,
        400,
        'TRANSICION_ESTADO_INVALIDA'
      );
    }

    if (order.envio) {
      const envioInstancia = order.envio instanceof DatosExpedicion
        ? order.envio
        : new DatosExpedicion(order.envio);
      envioInstancia.marcarEntregado();
      store.updateOrderShipment(codigoReferencia, envioInstancia);
    }

    const updatedOrder = store.updateOrderStatus(codigoReferencia, CONSTANTS.ORDER_STATUS.DELIVERED);

    // Registrar aviso de confirmación de entrega
    const avisoEntrega = AvisoEnvio.crearAvisoEntrega({ pedido: updatedOrder });
    store.addOrderNotification(codigoReferencia, avisoEntrega);

    return {
      estado: CONSTANTS.ORDER_STATUS.DELIVERED,
      pedido: updatedOrder,
      origen
    };
  }

  /**
   * Consulta las notificaciones emitidas para un pedido (Principio IV)
   * @param {string} codigoReferencia
   */
  static getAvisos(codigoReferencia) {
    this.getOrderByReference(codigoReferencia);
    return store.getOrderNotifications(codigoReferencia);
  }
}
