import { store } from '../models/store.js';
import { Order, OrderLine } from '../models/order.model.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';
import { StockReservationService } from './stock-reservation.service.js';

export class OrderService {
  /**
   * Formaliza y persiste de forma atómica el pedido tras cobro autorizado
   * Garantiza SC-001 (0% pedidos sin cobro) y SC-002 (descuento inmediato)
   */
  static createPaidOrder({ sesionPagoId, transaccionId, clienteNombre, clienteEmail, cuentaId = null }) {
    // 1. Idempotencia: Verificar si el pedido ya fue creado previamente por webhook o retorno síncrono
    const existingOrder = store.getOrderByTransactionId(transaccionId);
    if (existingOrder) {
      return existingOrder;
    }

    // 2. Verificar que la transacción existe y está AUTORIZADA
    const transaction = store.getTransaction(transaccionId);
    if (!transaction || transaction.estado !== CONSTANTS.TRANSACTION_STATUS.AUTHORIZED) {
      throw new AppError('No se puede confirmar el pedido sin una autorización bancaria efectiva.', 400, 'PAGO_NO_AUTORIZADO');
    }

    // 3. Obtener las reservas activas asociadas a la sesión
    const reservations = store.getReservationsBySession(sesionPagoId);
    if (!reservations || reservations.length === 0) {
      throw new AppError('No se han encontrado reservas de existencias para generar el pedido.', 404, 'RESERVA_NO_ENCONTRADA');
    }

    // 4. Construir las líneas de pedido y descontar el inventario permanente
    const lineas = [];
    let totalCalculado = 0;

    for (const res of reservations) {
      const invItem = store.getInventoryItem(res.varianteId);
      if (!invItem) continue;

      const subtotal = invItem.precioUnitario * res.cantidad;
      totalCalculado += subtotal;

      lineas.push(
        new OrderLine({
          productoId: invItem.productoId,
          varianteId: invItem.varianteId,
          titulo: invItem.titulo,
          precioUnitario: invItem.precioUnitario,
          cantidad: res.cantidad,
          subtotal
        })
      );

      // Descuento definitivo del stock físico
      invItem.stockTotal = Math.max(0, invItem.stockTotal - res.cantidad);
    }

    // 5. Consolidar la reserva
    StockReservationService.consolidateReservation(sesionPagoId);

    // 6. Crear el pedido inmutable con estado "pagado"
    const order = new Order({
      clienteNombre,
      clienteEmail,
      cuentaId,
      total: transaction.importe || totalCalculado,
      estado: CONSTANTS.ORDER_STATUS.PAID,
      transaccionId: transaction.id,
      lineas,
      reciboTarjeta: {
        marca: transaction.marcaTarjeta,
        ultimosCuatro: transaction.ultimosCuatro
      }
    });

    store.saveOrder(order);
    return order;
  }

  /**
   * Obtiene un pedido por su código de referencia único
   */
  static getOrderByReference(codigoReferencia) {
    const order = store.getOrderByCode(codigoReferencia);
    if (!order) {
      throw new AppError(`Pedido con referencia "${codigoReferencia}" no encontrado.`, 404, 'PEDIDO_NO_ENCONTRADO');
    }
    return order;
  }
}
