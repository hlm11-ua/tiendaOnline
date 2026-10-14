import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

export class OrderLine {
  constructor({ id, productoId, varianteId, titulo, precioUnitario, cantidad, subtotal }) {
    this.id = id || crypto.randomUUID();
    this.productoId = productoId;
    this.varianteId = varianteId;
    this.titulo = titulo;
    this.precioUnitario = Number(precioUnitario);
    this.cantidad = Number(cantidad);
    this.subtotal = Number(subtotal !== undefined ? subtotal : this.precioUnitario * this.cantidad);
  }
}

export class Order {
  constructor({
    id,
    codigoReferencia,
    clienteNombre,
    clienteEmail,
    cuentaId = null,
    total,
    estado = CONSTANTS.ORDER_STATUS.PAID,
    transaccionId,
    fechaCreacion,
    lineas = [],
    reciboTarjeta = null
  }) {
    this.id = id || crypto.randomUUID();
    this.codigoReferencia = codigoReferencia || Order.generateReferenceCode();
    this.clienteNombre = clienteNombre;
    this.clienteEmail = clienteEmail;
    this.cuentaId = cuentaId;
    this.total = Number(total);
    this.estado = estado; // Siempre "pagado" en creación
    this.transaccionId = transaccionId;
    this.fechaCreacion = fechaCreacion || new Date().toISOString();
    this.lineas = lineas.map(line => line instanceof OrderLine ? line : new OrderLine(line));
    this.reciboTarjeta = reciboTarjeta;
  }

  static generateReferenceCode() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `PED-${dateStr}-${randomHex}`;
  }
}
