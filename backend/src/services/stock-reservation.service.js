import crypto from 'node:crypto';
import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';
import { StockReservation } from '../models/stock-reservation.model.js';

export class StockReservationService {
  /**
   * Valida stock disponible y crea una reserva temporal de 10 minutos
   */
  static reserveCartItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('La cesta de la compra no contiene artículos para tramitar el pago.', 400, 'CESTA_VACIA');
    }

    // 1. Validar disponibilidad previa para todos los artículos
    for (const item of items) {
      const available = store.getAvailableStock(item.varianteId);
      if (item.cantidad > available) {
        throw new AppError(
          `No hay existencias suficientes para "${item.titulo || item.varianteId}". Disponibles: ${available}, solicitadas: ${item.cantidad}.`,
          409,
          'STOCK_INSUFICIENTE'
        );
      }
    }

    // 2. Crear las reservas vinculadas a una nueva sesión de checkout
    const sesionPagoId = crypto.randomUUID();
    const reservations = [];

    for (const item of items) {
      const rawRes = store.addReservation({
        sesionPagoId,
        varianteId: item.varianteId,
        cantidad: item.cantidad
      });
      reservations.push(new StockReservation(rawRes));
    }

    const firstRes = reservations[0];
    const minutesRemaining = Math.max(
      0,
      Math.round((new Date(firstRes.expiresAt).getTime() - Date.now()) / 60000)
    );

    return {
      sesionPagoId,
      expiresAt: firstRes.expiresAt,
      minutosRestantes: minutesRemaining || CONSTANTS.RESERVATION_TIMEOUT_MINUTES,
      reservations
    };
  }

  /**
   * Comprueba si una sesión de pago tiene reserva activa y no expirada
   */
  static validateActiveReservation(sesionPagoId) {
    const list = store.getReservationsBySession(sesionPagoId);
    if (!list || list.length === 0) {
      throw new AppError('No se ha encontrado ninguna reserva de existencias asociada a esta sesión.', 404, 'RESERVA_NO_ENCONTRADA');
    }

    const now = new Date();
    for (const res of list) {
      if (res.estado === CONSTANTS.RESERVATION_STATUS.EXPIRED || new Date(res.expiresAt) <= now) {
        res.estado = CONSTANTS.RESERVATION_STATUS.EXPIRED;
        throw new AppError(
          'La sesión de reserva de stock ha expirado (10 minutos superados). Por favor, revisa tu cesta para continuar.',
          410,
          'RESERVA_EXPIRADA'
        );
      }
      if (res.estado !== CONSTANTS.RESERVATION_STATUS.ACTIVE) {
        throw new AppError('La reserva de stock ya no está activa.', 400, 'RESERVA_INACTIVA');
      }
    }

    return list;
  }

  /**
   * Consolida la reserva tras confirmación del pago
   */
  static consolidateReservation(sesionPagoId) {
    const list = store.getReservationsBySession(sesionPagoId);
    for (const res of list) {
      res.estado = CONSTANTS.RESERVATION_STATUS.CONSOLIDATED;
    }
  }

  /**
   * Libera la reserva si el pago se cancela o falla definitivamente
   */
  static releaseReservation(sesionPagoId) {
    const list = store.getReservationsBySession(sesionPagoId);
    for (const res of list) {
      if (res.estado === CONSTANTS.RESERVATION_STATUS.ACTIVE) {
        res.estado = CONSTANTS.RESERVATION_STATUS.RELEASED;
      }
    }
  }
}
