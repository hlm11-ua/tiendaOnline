import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Modelo de Transacción de Cobro
 * En ningún caso almacena números completos de tarjeta (PAN) ni códigos CVV (SC-003, Principio V)
 */
export class PaymentTransaction {
  constructor({
    id,
    pasarelaRef,
    importe,
    moneda = CONSTANTS.CURRENCY,
    ultimosCuatro = '****',
    marcaTarjeta = 'Tarjeta Bancaria',
    requiere3ds = false,
    estado = CONSTANTS.TRANSACTION_STATUS.INITIATED,
    codigoRespuesta = '0000',
    mensajeError = null,
    sesionPagoId,
    fecha
  }) {
    this.id = id || crypto.randomUUID();
    this.pasarelaRef = pasarelaRef || `REF-${Date.now()}`;
    this.importe = Number(importe);
    this.moneda = moneda;
    this.ultimosCuatro = ultimosCuatro;
    this.marcaTarjeta = marcaTarjeta;
    this.requiere3ds = Boolean(requiere3ds);
    this.estado = estado;
    this.codigoRespuesta = codigoRespuesta;
    this.mensajeError = mensajeError;
    this.sesionPagoId = sesionPagoId;
    this.fecha = fecha || new Date().toISOString();
  }

  isAuthorized() {
    return this.estado === CONSTANTS.TRANSACTION_STATUS.AUTHORIZED;
  }
}
