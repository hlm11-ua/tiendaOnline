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
    const orderData = {
      ...order,
      envio: order.envio || null,
      avisosEnvio: Array.isArray(order.avisosEnvio) ? [...order.avisosEnvio] : []
    };
    this.orders.set(order.id, orderData);
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

  // === MÉTODOS LOGÍSTICOS Y EXPEDICIONES (007) ===

  /**
   * Obtiene la lista de pedidos con filtrado opcional por estado y orden cronológico
   * @param {string} [estado='todos']
   */
  getOrdersByStatus(estado = 'todos') {
    const all = Array.from(this.orders.values());
    const filtered = estado && estado !== 'todos'
      ? all.filter(o => o.estado === estado)
      : all;

    // Ordenar de más reciente a más antiguo por fechaCreacion
    return filtered.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
  }

  /**
   * Actualiza el estado de un pedido por su código de referencia
   * @param {string} codigoReferencia
   * @param {string} nuevoEstado
   */
  updateOrderStatus(codigoReferencia, nuevoEstado) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return null;

    order.estado = nuevoEstado;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  /**
   * Asigna o actualiza los datos de envío de un pedido
   * @param {string} codigoReferencia
   * @param {object} datosExpedicion
   */
  updateOrderShipment(codigoReferencia, datosExpedicion) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return null;

    order.envio = datosExpedicion;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  /**
   * Registra una notificación de envío emitida para el pedido
   * @param {string} codigoReferencia
   * @param {object} aviso
   */
  addOrderNotification(codigoReferencia, aviso) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return null;

    if (!Array.isArray(order.avisosEnvio)) {
      order.avisosEnvio = [];
    }
    order.avisosEnvio.push(aviso);
    order.updatedAt = new Date().toISOString();
    return aviso;
  }

  /**
   * Obtiene todas las notificaciones emitidas de un pedido
   * @param {string} codigoReferencia
   */
  getOrderNotifications(codigoReferencia) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return [];
    return order.avisosEnvio || [];
  }
}

export const store = new MemoryStore();
