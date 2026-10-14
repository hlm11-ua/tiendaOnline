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
    PAID: 'pagado'
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
