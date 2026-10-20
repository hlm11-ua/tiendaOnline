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

  // Puerto por defecto
  PORT: process.env.PORT || 3000
};
