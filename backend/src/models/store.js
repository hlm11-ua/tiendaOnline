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

const INITIAL_CATEGORIES = [
  {
    id: 'cat-ceramica',
    nombre: 'Cerámica',
    descripcion: 'Piezas artesanales torneadas a mano en torno de alfarero y esmaltadas.',
    slug: 'ceramica',
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'cat-textil',
    nombre: 'Textil',
    descripcion: 'Tejidos tradicionales, lanas de oveja merina y confección manual.',
    slug: 'textil',
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'cat-madera',
    nombre: 'Madera',
    descripcion: 'Talla y ebanistería artesanal en maderas nobles sostenibles.',
    slug: 'madera',
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'cat-joyeria',
    nombre: 'Joyería y Metal',
    descripcion: 'Orfebrería en cobre y metales nobles con acabados a mano.',
    slug: 'joyeria-y-metal',
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  }
];

const INITIAL_PRODUCTS = [
  {
    id: 'art-001',
    titulo: 'Jarrón de Cerámica Esmaltada Azul',
    descripcion: 'Pieza de gres esmaltada a mano en torno alfarero tradicional.',
    categoriaId: 'cat-ceramica',
    artesano: 'Taller Hermanos Alfareros',
    precioBase: 45.00,
    moneda: 'EUR',
    imagenes: [
      {
        url: '/public/uploads/jarron-ceramica-1.webp',
        nombreArchivo: 'jarron-ceramica-1.webp',
        mimeType: 'image/webp',
        tamanoBytes: 524288,
        esPrincipal: true
      }
    ],
    estado: 'activo',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'art-002',
    titulo: 'Manta de Lana Merina Tejida a Mano',
    descripcion: 'Manta artesanal de pura lana merina española hilada en telar bajo.',
    categoriaId: 'cat-textil',
    artesano: 'Hilanderas de la Sierra',
    precioBase: 140.00,
    moneda: 'EUR',
    imagenes: [
      {
        url: '/public/uploads/manta-lana-1.webp',
        nombreArchivo: 'manta-lana-1.webp',
        mimeType: 'image/webp',
        tamanoBytes: 610000,
        esPrincipal: true
      }
    ],
    estado: 'activo',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'art-003',
    titulo: 'Tabla de Corte en Madera de Olivo',
    descripcion: 'Tabla rústica tallada a mano de una única pieza maciza de madera de olivo centenario.',
    categoriaId: 'cat-madera',
    artesano: 'Ebanistería Tradicional',
    precioBase: 28.50,
    moneda: 'EUR',
    imagenes: [
      {
        url: '/public/uploads/tabla-olivo-1.webp',
        nombreArchivo: 'tabla-olivo-1.webp',
        mimeType: 'image/webp',
        tamanoBytes: 420000,
        esPrincipal: true
      }
    ],
    estado: 'activo',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'art-004',
    titulo: 'Pieza Única de Orfebrería en Cobre',
    descripcion: 'Escultura forjada y cincelada a mano en cobre envejecido.',
    categoriaId: 'cat-joyeria',
    artesano: 'Maestro Forjador',
    precioBase: 220.00,
    moneda: 'EUR',
    imagenes: [
      {
        url: '/public/uploads/cobre-artesanal-1.webp',
        nombreArchivo: 'cobre-artesanal-1.webp',
        mimeType: 'image/webp',
        tamanoBytes: 730000,
        esPrincipal: true
      }
    ],
    estado: 'activo',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  }
];

const INITIAL_VARIANTS = [
  {
    id: 'var-001-azul',
    productoId: 'art-001',
    nombre: 'Azul Cobalto',
    sku: 'JAR-AZU-01',
    stockTotal: 5,
    umbralAlerta: 3,
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'var-002-natural',
    productoId: 'art-002',
    nombre: 'Blanco Natural',
    sku: 'MAN-NAT-01',
    stockTotal: 3,
    umbralAlerta: 3,
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'var-003-olivo',
    productoId: 'art-003',
    nombre: 'Estándar',
    sku: 'TAB-OLI-01',
    stockTotal: 10,
    umbralAlerta: 2,
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  },
  {
    id: 'var-004-unico',
    productoId: 'art-004',
    nombre: 'Única',
    sku: 'COB-UNI-01',
    stockTotal: 1,
    umbralAlerta: 2,
    estado: 'activa',
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z'
  }
];

class MemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Inventario tradicional de variantes: varianteId -> Objeto Inventario
    this.inventory = new Map();
    for (const item of INITIAL_INVENTORY) {
      this.inventory.set(item.varianteId, { ...item });
    }

    // Categorías del catálogo: categoriaId -> Objeto Categoria
    this.categories = new Map();
    for (const cat of INITIAL_CATEGORIES) {
      this.categories.set(cat.id, { ...cat });
    }

    // Productos del catálogo: productoId -> Objeto Producto
    this.products = new Map();
    for (const prod of INITIAL_PRODUCTS) {
      this.products.set(prod.id, { ...prod });
    }

    // Variantes de productos: varianteId -> Objeto Variante
    this.variants = new Map();
    for (const v of INITIAL_VARIANTS) {
      this.variants.set(v.id, { ...v });
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
    if (!item) {
      const variant = this.variants.get(varianteId);
      if (!variant) return 0;
      return variant.stockTotal || 0;
    }

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

  // === MÉTODOS DE CATEGORÍAS (FR-002) ===

  saveCategory(category) {
    const data = typeof category.toJSON === 'function' ? category.toJSON() : { ...category };
    this.categories.set(data.id, data);
    return this.categories.get(data.id);
  }

  getCategoryById(id) {
    return this.categories.get(id) || null;
  }

  getCategoryBySlug(slug) {
    for (const cat of this.categories.values()) {
      if (cat.slug === slug) {
        return cat;
      }
    }
    return null;
  }

  getAllCategories(estado = 'todas') {
    const all = Array.from(this.categories.values());
    const filtered = estado && estado !== 'todas'
      ? all.filter(c => c.estado === estado)
      : all;

    return filtered.map(c => ({
      ...c,
      totalProductosActivos: this.countActiveProductsByCategory(c.id)
    }));
  }

  deleteCategory(id) {
    return this.categories.delete(id);
  }

  countActiveProductsByCategory(categoriaId) {
    let count = 0;
    for (const prod of this.products.values()) {
      if (prod.categoriaId === categoriaId && prod.estado === CONSTANTS.CATALOG.PRODUCT_STATUS.ACTIVE) {
        count++;
      }
    }
    return count;
  }

  // === MÉTODOS DE PRODUCTOS (FR-003, FR-004) ===

  saveProduct(product) {
    const data = typeof product.toJSON === 'function' ? product.toJSON() : { ...product };
    this.products.set(data.id, data);
    return this.products.get(data.id);
  }

  getProductById(id) {
    return this.products.get(id) || null;
  }

  getAllProducts({ categoriaId, estado = 'todos', soloAlertas = false } = {}) {
    let prods = Array.from(this.products.values());

    if (categoriaId) {
      prods = prods.filter(p => p.categoriaId === categoriaId);
    }

    if (estado && estado !== 'todos') {
      prods = prods.filter(p => p.estado === estado);
    }

    return prods.map(p => {
      const cat = this.categories.get(p.categoriaId);
      const variants = this.getVariantsByProductId(p.id);
      const tieneAlertas = variants.some(v => {
        const alt = this.getVariantAlert(v.id);
        return alt && alt.estadoAlerta !== CONSTANTS.CATALOG.STOCK_ALERT_STATUS.NORMAL;
      });

      return {
        ...p,
        categoriaNombre: cat ? cat.nombre : 'Sin categoría',
        variantes: variants,
        alertaActiva: tieneAlertas
      };
    }).filter(p => {
      if (soloAlertas) {
        return p.alertaActiva;
      }
      return true;
    });
  }

  deleteProduct(id) {
    // Si tiene pedidos asociados, no borra físicamente
    if (this.hasProductPriorOrders(id)) {
      return this.archiveProduct(id);
    }

    // Borrado físico de producto y sus variantes
    const variants = this.getVariantsByProductId(id);
    for (const v of variants) {
      this.variants.delete(v.id);
      this.inventory.delete(v.id);
    }
    return this.products.delete(id);
  }

  archiveProduct(id) {
    const prod = this.products.get(id);
    if (!prod) return null;
    prod.estado = CONSTANTS.CATALOG.PRODUCT_STATUS.ARCHIVED;
    prod.updatedAt = new Date().toISOString();
    return prod;
  }

  hasProductPriorOrders(productoId) {
    const variants = this.getVariantsByProductId(productoId);
    const variantIds = new Set(variants.map(v => v.id));

    for (const order of this.orders.values()) {
      if (Array.isArray(order.lineas)) {
        for (const linea of order.lineas) {
          if (linea.productoId === productoId || variantIds.has(linea.varianteId)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // === MÉTODOS DE VARIANTES Y STOCK (FR-004, FR-005, FR-007) ===

  saveVariant(variant) {
    const data = typeof variant.toJSON === 'function' ? variant.toJSON() : { ...variant };
    this.variants.set(data.id, data);

    // Sincronizar con el inventario de la pasarela y pedidos
    const prod = this.products.get(data.productoId);
    const existingInv = this.inventory.get(data.id);

    this.inventory.set(data.id, {
      productoId: data.productoId,
      varianteId: data.id,
      titulo: prod ? `${prod.titulo} (${data.nombre})` : data.nombre,
      precioUnitario: prod ? prod.precioBase : (existingInv?.precioUnitario || 0),
      stockTotal: data.stockTotal
    });

    return this.variants.get(data.id);
  }

  getVariantById(id) {
    const v = this.variants.get(id);
    if (!v) return null;

    // Sincronizar stockTotal con inventory si hubo venta
    const inv = this.inventory.get(id);
    if (inv) {
      v.stockTotal = inv.stockTotal;
    }
    return v;
  }

  getVariantsByProductId(productoId) {
    const list = [];
    for (const v of this.variants.values()) {
      if (v.productoId === productoId && v.estado !== CONSTANTS.CATALOG.VARIANT_STATUS.ARCHIVED) {
        const inv = this.inventory.get(v.id);
        const stockActual = inv ? inv.stockTotal : v.stockTotal;
        const disponible = this.getAvailableStock(v.id);
        const alerta = this.getVariantAlert(v.id);

        list.push({
          ...v,
          stockTotal: stockActual,
          stockDisponible: disponible,
          estadoAlerta: alerta ? alerta.estadoAlerta : CONSTANTS.CATALOG.STOCK_ALERT_STATUS.NORMAL
        });
      }
    }
    return list;
  }

  deleteVariant(id) {
    this.variants.delete(id);
    return this.inventory.delete(id);
  }

  updateVariantStock(varianteId, { stockTotal, umbralAlerta }) {
    const v = this.getVariantById(varianteId);
    if (!v) return null;

    if (stockTotal !== undefined && stockTotal !== null) {
      v.stockTotal = Math.max(0, parseInt(stockTotal, 10));
      const inv = this.inventory.get(varianteId);
      if (inv) {
        inv.stockTotal = v.stockTotal;
      }
    }

    if (umbralAlerta !== undefined && umbralAlerta !== null) {
      v.umbralAlerta = Math.max(0, parseInt(umbralAlerta, 10));
    }

    v.updatedAt = new Date().toISOString();
    return v;
  }

  // === MÉTODOS DE ALERTAS DE STOCK (FR-006, SC-002) ===

  getVariantAlert(varianteId) {
    const variant = this.variants.get(varianteId);
    if (!variant || variant.estado === CONSTANTS.CATALOG.VARIANT_STATUS.ARCHIVED) return null;

    const product = this.products.get(variant.productoId);
    if (!product || product.estado === CONSTANTS.CATALOG.PRODUCT_STATUS.ARCHIVED) return null;

    const category = this.categories.get(product.categoriaId);
    const categoryNombre = category ? category.nombre : 'Sin categoría';

    const stockDisponible = this.getAvailableStock(varianteId);
    const inv = this.inventory.get(varianteId);
    const stockTotal = inv ? inv.stockTotal : variant.stockTotal;
    const umbral = variant.umbralAlerta !== undefined ? variant.umbralAlerta : CONSTANTS.CATALOG.DEFAULT_ALERT_THRESHOLD;

    let estadoAlerta = CONSTANTS.CATALOG.STOCK_ALERT_STATUS.NORMAL;
    let mensajeAlerta = 'Stock suficiente';

    if (stockDisponible === 0) {
      estadoAlerta = CONSTANTS.CATALOG.STOCK_ALERT_STATUS.OUT_OF_STOCK;
      mensajeAlerta = 'Agotada';
    } else if (stockDisponible <= umbral) {
      estadoAlerta = CONSTANTS.CATALOG.STOCK_ALERT_STATUS.LOW;
      const plural = stockDisponible === 1 ? 'unidad restante' : 'unidades restantes';
      mensajeAlerta = `Stock bajo (${stockDisponible} ${plural})`;
    }

    return {
      productoId: product.id,
      productoTitulo: product.titulo,
      varianteId: variant.id,
      varianteNombre: variant.nombre,
      sku: variant.sku,
      artesano: product.artesano,
      categoriaId: product.categoriaId,
      categoriaNombre: categoryNombre,
      precioBase: product.precioBase,
      stockTotal,
      stockDisponible,
      umbralAlerta: umbral,
      estadoAlerta,
      mensajeAlerta
    };
  }

  getAllStockAlerts() {
    const alerts = [];
    for (const v of this.variants.values()) {
      const alert = this.getVariantAlert(v.id);
      if (alert && (alert.estadoAlerta === CONSTANTS.CATALOG.STOCK_ALERT_STATUS.LOW || alert.estadoAlerta === CONSTANTS.CATALOG.STOCK_ALERT_STATUS.OUT_OF_STOCK)) {
        alerts.push(alert);
      }
    }
    return alerts;
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

  getOrdersByStatus(estado = 'todos') {
    const all = Array.from(this.orders.values());
    const filtered = estado && estado !== 'todos'
      ? all.filter(o => o.estado === estado)
      : all;

    return filtered.sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
  }

  updateOrderStatus(codigoReferencia, nuevoEstado) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return null;

    order.estado = nuevoEstado;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  updateOrderShipment(codigoReferencia, datosExpedicion) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return null;

    order.envio = datosExpedicion;
    order.updatedAt = new Date().toISOString();
    return order;
  }

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

  getOrderNotifications(codigoReferencia) {
    const order = this.getOrderByCode(codigoReferencia);
    if (!order) return [];
    return order.avisosEnvio || [];
  }
}

export const store = new MemoryStore();
