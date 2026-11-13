import { CONSTANTS } from './constants.service.js';
import { CartApiService } from './cart-api.service.js';

/**
 * Servicio de persistencia dual del carrito (Feature 002)
 * - Visitantes anónimos: LocalStorage (clave tienda_online_cart_v1), persistencia indefinida.
 * - Usuarios autenticados: sincronización con la API (/api/carrito).
 * Si LocalStorage no está disponible, degrada graciosamente a memoria de sesión.
 */
export class CartStorageService {
  static usuarioId = null;

  static localAvailable = (() => {
    try {
      const probe = '__tienda_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  })();

  static memoryFallback = null;

  /**
   * Establece el usuario autenticado de la sesión (null para anónimos)
   */
  static setUsuarioId(usuarioId) {
    this.usuarioId = usuarioId || null;
  }

  static getStorageKey() {
    return CONSTANTS.CART.STORAGE_KEY;
  }

  /**
   * Lee el carrito guardado localmente (o de memoria si LocalStorage no está disponible)
   */
  static readLocal() {
    if (!this.localAvailable) {
      return this.memoryFallback ? JSON.parse(JSON.stringify(this.memoryFallback)) : null;
    }
    try {
      const raw = window.localStorage.getItem(this.getStorageKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Guarda el carrito localmente (o en memoria si LocalStorage no está disponible)
   */
  static writeLocal(carrito) {
    if (carrito && Array.isArray(carrito.items)) {
      const persistible = {
        id: carrito.id,
        usuarioId: carrito.usuarioId || null,
        items: carrito.items.map(it => ({
          varianteId: it.varianteId,
          productoId: it.productoId,
          titulo: it.titulo,
          precioUnitario: it.precioUnitario,
          cantidad: it.cantidad,
          stockDisponible: it.stockDisponible,
          estado: it.estado
        })),
        gastosEnvioEstimados: carrito.gastosEnvioEstimados ?? 0.00,
        fechaActualizacion: carrito.fechaActualizacion || new Date().toISOString()
      };

      if (!this.localAvailable) {
        this.memoryFallback = persistible;
        return persistible;
      }

      try {
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(persistible));
      } catch {
        this.memoryFallback = persistible;
      }
      return persistible;
    }
    return null;
  }

  /**
   * Elimina la clave del carrito del almacenamiento local
   */
  static removeLocal() {
    this.memoryFallback = null;
    if (!this.localAvailable) return;
    try {
      window.localStorage.removeItem(this.getStorageKey());
    } catch {
      // Sin operación: el almacenamiento no está disponible
    }
  }

  /**
   * Obtiene la cesta activa: remota (autenticado) o local (anónimo)
   */
  static async getCart() {
    if (this.usuarioId) {
      const carrito = await CartApiService.getCarrito(this.usuarioId);
      return carrito;
    }
    const local = this.readLocal();
    if (local && Array.isArray(local.items)) {
      return local;
    }
    return { items: [], subtotal: 0.00, gastosEnvioEstimados: 0.00, total: 0.00 };
  }

  /**
   * Sincroniza el carrito (autenticado) y devuelve la versión actualizada
   */
  static async syncCart(carrito) {
    if (this.usuarioId) {
      return carrito;
    }
    return this.writeLocal(carrito) || carrito;
  }

  /**
   * Persiste un carrito recuperado del servidor (autenticados)
   */
  static async saveRemote(carrito) {
    if (this.usuarioId) {
      return carrito;
    }
    return this.writeLocal(carrito) || carrito;
  }

  /**
   * Vaciado de cesta: elimina almacenamiento local y remoto
   * Se invoca tras formalizar la compra o vaciado manual
   */
  static async clearCart() {
    this.removeLocal();
    if (this.usuarioId) {
      try {
        await CartApiService.vaciarCarrito(this.usuarioId);
      } catch {
        // El vaciado local ya se ha completado; se ignora fallo remoto
      }
    }
  }

  /**
   * FR-007 (Feature 002): fusiona la cesta anónima de LocalStorage con el
   * carrito de la cuenta al iniciar sesión, sumando cantidades coincidentes
   * hasta el límite de existencias y notificando los reajustes.
   * Devuelve { carrito, avisosReajuste } o null si no había nada que fusionar.
   */
  static async fusionarConCuenta(usuarioId) {
    if (!usuarioId) return null;

    const local = this.readLocal();
    const itemsLocales = (local?.items || [])
      .filter(it => it.varianteId && Number(it.cantidad) > 0)
      .map(it => ({
        varianteId: it.varianteId,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario
      }));

    if (itemsLocales.length === 0) return null;

    try {
      const resultado = await CartApiService.fusionarCarritos({ usuarioId, itemsLocales });
      // La cesta anónima ya vive en la cuenta: se limpia la persistencia local
      this.removeLocal();
      return resultado;
    } catch {
      // Sin fusión posible: se conserva la cesta local y continúa el flujo normal
      return null;
    }
  }
}
