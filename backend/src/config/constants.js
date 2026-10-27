/**
 * Constantes compartidas del sistema de pago y pedidos
 * Cumple con la constitución del proyecto (Moneda EUR, idioma es-ES)
 */
export const CONSTANTS = {
  // Parámetros de Reserva Temporal de Stock (FR-005)
  RESERVATION_TIMEOUT_MINUTES: 10,
  RESERVATION_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutos = 600.000 ms

  // Parámetros de Autenticación 3D Secure (FR-002)
  THREE_DS_THRESHOLD_EUR: 100.00,
  THREE_DS_TEST_VALID_OTP: '1234',

  // Configuración de Mercado e Idioma (Principio II)
  CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',
  LOCALE: 'es-ES',

  // Estados de Entidades (Data Model)
  ORDER_STATUS: {
    PENDING: 'pendiente',
    PAID: 'pagado',
    IN_PREPARATION: 'en_preparacion',
    SHIPPED: 'salido_tienda',
    DELIVERED: 'entregado'
  },

  // Transportistas habituales en España (FR-003)
  CARRIERS: [
    'Correos de España',
    'SEUR',
    'MRW',
    'GLS',
    'DHL Express',
    'Otro'
  ],

  // Validación de número de seguimiento (FR-003, Edge Cases)
  TRACKING: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 32,
    PATTERN: /^[A-Za-z0-9\-_]{6,32}$/
  },

  // Tipos de avisos automáticos al cliente (FR-004)
  NOTICE_TYPES: {
    DISPATCH: 'salida_almacen',
    RECTIFICATION: 'rectificacion_tracking',
    DELIVERY: 'confirmacion_entrega'
  },

  RESERVATION_STATUS: {
    ACTIVE: 'activa',
    CONSOLIDATED: 'consolidada',
    EXPIRED: 'expirada',
    RELEASED: 'liberada'
  },

  TRANSACTION_STATUS: {
    INITIATED: 'iniciada',
    PENDING_3DS: 'pendiente_3ds',
    AUTHORIZED: 'autorizada',
    DENIED: 'denegada',
    TECHNICAL_ERROR: 'error_tecnico'
  },

  // Firma fija de prueba para Webhook bancario en local (FR-007, SC-004)
  WEBHOOK_TEST_SIGNATURE: 'firma_segura_banco_prueba',

  // Configuración de Catálogo, Alertas e Imágenes (Feature 006)
  CATALOG: {
    DEFAULT_ALERT_THRESHOLD: 3,
    DEFAULT_VARIANT_NAME: 'Única',
    CATEGORY_STATUS: {
      ACTIVE: 'activa',
      ARCHIVED: 'archivada'
    },
    PRODUCT_STATUS: {
      ACTIVE: 'activo',
      ARCHIVED: 'archivado'
    },
    VARIANT_STATUS: {
      ACTIVE: 'activa',
      ARCHIVED: 'archivada'
    },
    STOCK_ALERT_STATUS: {
      NORMAL: 'normal',
      LOW: 'stock_bajo',
      OUT_OF_STOCK: 'agotado'
    },
    IMAGE_LIMITS: {
      MAX_COUNT: 5,
      MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
      ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp']
    }
  },

  // Roles de usuario (FR-001)
  ROLES: {
    ADMIN: 'admin',
    CUSTOMER: 'cliente'
  },

  // Configuración de Resumen de Ventas y Exportación (Feature 008)
  SALES_REPORT: {
    PERIODS: {
      SEVEN_DAYS: '7_dias',
      THIRTY_DAYS: '30_dias',
      ONE_YEAR: '1_ano',
      CUSTOM: 'personalizado'
    },
    PERIOD_LABELS: {
      '7_dias': 'Últimos 7 días',
      '30_dias': 'Último mes (30 días)',
      '1_ano': 'Último año (365 días)',
      'personalizado': 'Rango personalizado'
    },
    TOP_RANKING_LIMIT: 5,
    CSV: {
      DELIMITER: ';',
      DECIMAL_SEPARATOR: ',',
      HEADER: 'Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)',
      BOM: '\uFEFF',
      MIME_TYPE: 'text/csv; charset=utf-8'
    }
  },

  // Puerto por defecto
  PORT: process.env.PORT || 3000
};
