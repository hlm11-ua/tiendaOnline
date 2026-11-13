/**
 * Constantes compartidas del frontend (Feature 002 - Carrito)
 * Cumple con la constitución del proyecto (Moneda EUR, idioma es-ES)
 */
export const CONSTANTS = {
  CURRENCY: 'EUR',
  CURRENCY_SYMBOL: '€',
  LOCALE: 'es-ES',

  CART: {
    STORAGE_KEY: 'tienda_online_cart_v1',
    MAX_ITEMS: 50,
    DEFAULT_SHIPPING_ESTIMATE_EUR: 0.00,
    STATUS: {
      EMPTY: 'vacio',
      READY: 'listo',
      BLOCKED: 'bloqueado'
    },
    ITEM_STATUS: {
      AVAILABLE: 'disponible',
      ADJUSTED: 'reajustado',
      OUT_OF_STOCK: 'agotado',
      UNAVAILABLE: 'no_disponible'
    },
    NOTICE_TYPES: {
      STOCK_ADJUSTED: 'stock_reajustado',
      STOCK_EXHAUSTED: 'stock_agotado',
      PRICE_UPDATED: 'precio_actualizado',
      PRODUCT_UNAVAILABLE: 'producto_no_disponible'
    }
  },

  // Catálogo de demostración sincronizado con el inventario del backend
  DEMO_CATALOG: [
    { varianteId: 'var-001-azul', titulo: 'Jarrón de Cerámica Esmaltada Azul', precioUnitario: 45.00 },
    { varianteId: 'var-002-natural', titulo: 'Manta de Lana Merina Tejida a Mano', precioUnitario: 140.00 },
    { varianteId: 'var-003-olivo', titulo: 'Tabla de Corte en Madera de Olivo', precioUnitario: 28.50 },
    { varianteId: 'var-004-unico', titulo: 'Pieza Única de Orfebrería en Cobre', precioUnitario: 220.00 }
  ]
};

/**
 * Formatea un importe en euros con la convención española (es-ES)
 */
export function formatEUR(importe) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    Number(importe) || 0
  );
}
