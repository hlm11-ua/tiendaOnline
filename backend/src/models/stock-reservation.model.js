import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Modelo de Reserva Temporal de Stock (FR-005)
 */
export class StockReservation {
  constructor({ id, sesionPagoId, varianteId, cantidad, creadaEn, expiresAt, estado }) {
    this.id = id || crypto.randomUUID();
    this.sesionPagoId = sesionPagoId;
    this.varianteId = varianteId;
    this.cantidad = Number(cantidad);
    this.creadaEn = creadaEn || new Date().toISOString();
    this.expiresAt = expiresAt || new Date(Date.now() + CONSTANTS.RESERVATION_TIMEOUT_MS).toISOString();
    this.estado = estado || CONSTANTS.RESERVATION_STATUS.ACTIVE;
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  consolidate() {
    this.estado = CONSTANTS.RESERVATION_STATUS.CONSOLIDATED;
  }

  release() {
    this.estado = CONSTANTS.RESERVATION_STATUS.RELEASED;
  }

  markExpired() {
    this.estado = CONSTANTS.RESERVATION_STATUS.EXPIRED;
  }
}
