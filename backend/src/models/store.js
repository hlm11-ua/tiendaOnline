import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Catálogo inicial de artesanías para pruebas y demostración
 */
const INITIAL_INVENTORY = [
  {
    productoId: 'art-001',
    varianteId: 'var-001-azul',
    titulo: 'Jarrón de Cerámica Esmaltada Azul',
    precioUnitario: 45.00,
    stockTotal: 5
  },
  {
    productoId: 'art-002',
    varianteId: 'var-002-natural',
    titulo: 'Manta de Lana Merina Tejida a Mano',
    precioUnitario: 140.00,
    stockTotal: 3
  },
  {
    productoId: 'art-003',
    varianteId: 'var-003-olivo',
    titulo: 'Tabla de Corte en Madera de Olivo',
    precioUnitario: 28.50,
    stockTotal: 10
  },
  {
    productoId: 'art-004',
    varianteId: 'var-004-unico',
    titulo: 'Pieza Única de Orfebrería en Cobre',
    precioUnitario: 220.00,
    stockTotal: 1
  }
];

class MemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Inventario: varianteId -> Objeto Inventario
    this.inventory = new Map();
    for (const item of INITIAL_INVENTORY) {
      this.inventory.set(item.varianteId, { ...item });
    }

    // Reservas temporales de stock: id -> Reserva
    this.reservations = new Map();

    // Transacciones de cobro: id -> Transaccion
    this.transactions = new Map();

    // Pedidos formalizados: id -> Pedido
    this.orders = new Map();

    // Pedidos indexados por código de referencia para búsqueda rápida
    this.ordersByCode = new Map();
  }

  // === MÉTODOS DE INVENTARIO Y RESERVAS ===

  getInventoryItem(varianteId) {
    return this.inventory.get(varianteId) || null;
  }

  getAllInventory() {
    return Array.from(this.inventory.values()).map(item => ({
      ...item,
      stockDisponible: this.getAvailableStock(item.varianteId)
    }));
  }

  getAvailableStock(varianteId) {
    const item = this.inventory.get(varianteId);
    if (!item) return 0;

    const now = new Date();
    let reservedActiveUnits = 0;

    for (const res of this.reservations.values()) {
      if (res.varianteId === varianteId && res.estado === CONSTANTS.RESERVATION_STATUS.ACTIVE) {
        if (new Date(res.expiresAt) > now) {
          reservedActiveUnits += res.cantidad;
        } else {
          // Expiración perezosa
          res.estado = CONSTANTS.RESERVATION_STATUS.EXPIRED;
        }
      }
    }

    const available = item.stockTotal - reservedActiveUnits;
    return Math.max(0, available);
  }

  addReservation({ sesionPagoId, varianteId, cantidad }) {
    const id = crypto.randomUUID();
    const creadaEn = new Date();
    const expiresAt = new Date(creadaEn.getTime() + CONSTANTS.RESERVATION_TIMEOUT_MS);

    const reservation = {
      id,
      sesionPagoId,
      varianteId,
      cantidad,
      creadaEn: creadaEn.toISOString(),
      expiresAt: expiresAt.toISOString(),
      estado: CONSTANTS.RESERVATION_STATUS.ACTIVE
    };

    this.reservations.set(id, reservation);
    return reservation;
  }

  getReservationsBySession(sesionPagoId) {
    const list = [];
    for (const res of this.reservations.values()) {
      if (res.sesionPagoId === sesionPagoId) {
        list.push(res);
      }
    }
    return list;
  }

  // === MÉTODOS DE TRANSACCIONES ===

  saveTransaction(transaction) {
    this.transactions.set(transaction.id, { ...transaction });
    return this.transactions.get(transaction.id);
  }

  getTransaction(id) {
    return this.transactions.get(id) || null;
  }

  // === MÉTODOS DE PEDIDOS ===

  saveOrder(order) {
    this.orders.set(order.id, { ...order });
    this.ordersByCode.set(order.codigoReferencia, order.id);
    return this.orders.get(order.id);
  }

  getOrderById(id) {
    return this.orders.get(id) || null;
  }

  getOrderByCode(codigoReferencia) {
    const id = this.ordersByCode.get(codigoReferencia);
    if (!id) return null;
    return this.orders.get(id) || null;
  }

  getOrderByTransactionId(transaccionId) {
    for (const order of this.orders.values()) {
      if (order.transaccionId === transaccionId) {
        return order;
      }
    }
    return null;
  }

  getAllOrders() {
    return Array.from(this.orders.values());
  }
}

export const store = new MemoryStore();
