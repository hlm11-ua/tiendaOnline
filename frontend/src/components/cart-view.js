import { CartApiService } from '../services/cart-api.service.js';
import { CartStorageService } from '../services/cart-storage.service.js';
import { CONSTANTS, formatEUR } from '../services/constants.service.js';

/**
 * Componente: Vista Reactiva del Carrito de Compras (Feature 002)
 * Renderiza la tabla de artículos, el panel de avisos de reajuste, el selector
 * de cantidad con saneamiento de entradas no válidas y el estado de cesta vacía.
 */
export class CartView {
  constructor({ containerId, usuarioId = null, onNavigateCheckout }) {
    this.container = document.getElementById(containerId);
    this.usuarioId = usuarioId;
    this.onNavigateCheckout = onNavigateCheckout;
    this.carrito = { items: [], subtotal: 0.00, gastosEnvioEstimados: 0.00, total: 0.00, estado: 'vacio' };
    this.avisos = [];
    this.bloqueaTramitacion = false;
    this.avisosVisibles = new Set();
  }

  async init() {
    this.bindGlobalActions();
    await this.fusionarCarritoLocal();
    await this.cargarCarrito();
  }

  /**
   * FR-007: al iniciar sesión (usuarioId presente) fusiona la cesta anónima
   * guardada en LocalStorage con el carrito de la cuenta, muestra los avisos
   * de reajuste y vacía el almacenamiento local tras adoptar la cesta fusionada
   */
  async fusionarCarritoLocal() {
    if (!this.usuarioId) return;

    const local = CartStorageService.readLocal();
    const itemsLocales = (local?.items || [])
      .filter(it => it.varianteId && Number(it.cantidad) > 0)
      .map(it => ({
        varianteId: it.varianteId,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario
      }));

    if (itemsLocales.length === 0) return;

    try {
      const resultado = await CartApiService.fusionarCarritos({
        usuarioId: this.usuarioId,
        itemsLocales
      });

      // Adoptar la cesta fusionada y limpiar la persistencia local anónima
      CartStorageService.removeLocal();
      this.carrito = resultado.carrito;
      this.avisos = (resultado.avisosReajuste || []).map(aviso => ({ ...aviso }));
      this.render();
    } catch {
      // Sin fusión posible (ej. usuario inexistente): se continúa con la carga normal
    }
  }

  bindGlobalActions() {
    const btnCheckout = document.getElementById('btn-tramitar-pedido');
    if (btnCheckout) {
      btnCheckout.addEventListener('click', () => this.tramitarPedido());
    }

    const btnVaciar = document.getElementById('btn-vaciar-carrito');
    if (btnVaciar) {
      btnVaciar.addEventListener('click', async () => {
        await CartStorageService.clearCart();
        this.avisos = [];
        await this.cargarCarrito();
      });
    }
  }

  /**
   * Carga la cesta y ejecuta la verificación de stock y sincronización de precios
   */
  async cargarCarrito() {
    let carrito;
    if (this.usuarioId) {
      carrito = await CartApiService.getCarrito(this.usuarioId);
    } else {
      carrito = await CartStorageService.getCart();
    }

    this.carrito = carrito;
    this.render();

    await this.validarStock({ esCargaInicial: true });
  }

  /**
   * Verifica existencias y sincroniza precios con el catálogo en tiempo real
   */
  async validarStock({ esCargaInicial = false } = {}) {
    const items = (this.carrito.items || []).map(it => ({
      varianteId: it.varianteId,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario
    }));

    if (items.length === 0) {
      this.avisos = esCargaInicial ? [] : this.avisos;
      this.render();
      return;
    }

    let resultado;
    try {
      resultado = await CartApiService.validarStock(items);
    } catch {
      this.render();
      return;
    }

    this.aplicarResultadoValidacion(resultado, esCargaInicial);
  }

  /**
   * Aplica el resultado de validar-stock sobre el carrito local
   */
  aplicarResultadoValidacion(resultado, esCargaInicial) {
    const validadas = new Map(resultado.items.map(it => [it.varianteId, it]));

    for (const item of this.carrito.items || []) {
      const v = validadas.get(item.varianteId);
      if (!v) continue;

      const stockPrevio = item.stockDisponible;
      const cantidadPrevia = item.cantidad;
      const precioPrevio = item.precioUnitario;

      item.stockDisponible = v.stockDisponible;
      item.precioUnitario = v.precioVigente;
      item.titulo = v.titulo || item.titulo;
      item.estado = v.estado;
      item.cantidad = v.cantidadAjustada;
      item.recalcular?.();

      if (v.estado === CONSTANTS.CART.ITEM_STATUS.ADJUSTED && cantidadPrevia !== v.cantidadAjustada) {
        this.marcarAviso({
          varianteId: item.varianteId,
          titulo: item.titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
          mensaje: `El artículo '${item.titulo}' ha sido reajustado a ${v.cantidadAjustada} unidad(es) por compras recientes.`,
          cantidadPrevia,
          cantidadNueva: v.cantidadAjustada
        });
      }
      if (v.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK && esCargaInicial) {
        this.marcarAviso({
          varianteId: item.varianteId,
          titulo: item.titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_EXHAUSTED,
          mensaje: `El artículo '${item.titulo}' se ha agotado.`
        });
      }
      if (
        v.estado !== CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE &&
        precioPrevio !== undefined &&
        Number(precioPrevio) !== Number(v.precioVigente)
      ) {
        this.marcarAviso({
          varianteId: item.varianteId,
          titulo: item.titulo,
          tipo: CONSTANTS.CART.NOTICE_TYPES.PRICE_UPDATED,
          mensaje: `El precio de '${item.titulo}' se ha actualizado a ${formatEUR(v.precioVigente)}.`,
          precioPrevio,
          precioNuevo: v.precioVigente
        });
      }
      if (stockPrevio !== v.stockDisponible) {
        item.stockDisponible = v.stockDisponible;
      }
    }

    this.bloqueaTramitacion = Boolean(resultado.bloqueaTramitacion);
    this.recalcularTotales();
    this.persistirCarrito();
    this.render();
  }

  /**
   * Añade una cantidad deseada de una variante con validación de stock en tiempo real
   */
  async addItem({ varianteId, cantidad, titulo, precioUnitario }) {
    const cantidadNum = Number(cantidad) || 1;

    if (this.usuarioId) {
      try {
        const carritoActualizado = await CartApiService.addItem(
          { varianteId, cantidad: cantidadNum },
          this.usuarioId
        );
        this.carrito = carritoActualizado;
      } catch (err) {
        if (err.status === 409) {
          this.marcarAviso({
            varianteId,
            titulo: titulo || varianteId,
            tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
            mensaje: err.stockDisponible > 0
              ? `Solo quedan ${err.stockDisponible} unidad(es) de '${titulo || varianteId}'. No se puede añadir más cantidad.`
              : `El artículo '${titulo || varianteId}' está agotado.`
          });
          // Añadir hasta el límite de stock disponible
          if (err.stockDisponible > 0) {
            await this.actualizarCantidadInterna(varianteId, err.stockDisponible);
            this.refrescarDesdeStorageConStock(varianteId, titulo, precioUnitario, err.stockDisponible);
          }
        } else {
          this.mostrarError(err.message);
          return;
        }
      }
      await this.validarStock();
      return;
    }

    // Modo anónimo: la cesta vive en LocalStorage, por lo que se fusiona
    // localmente y se valida en bloque (el servidor no conserva carritos anónimos)
    const itemsActuales = (this.carrito.items || []).filter(it => it.varianteId);
    const existente = itemsActuales.find(it => it.varianteId === varianteId);
    const esNuevaLinea = !existente;

    if (existente) {
      existente.cantidad = Number(existente.cantidad) + cantidadNum;
    } else {
      itemsActuales.push({
        varianteId,
        productoId: '',
        titulo: titulo || varianteId,
        precioUnitario: precioUnitario || 0,
        cantidad: cantidadNum,
        stockDisponible: 0,
        estado: CONSTANTS.CART.ITEM_STATUS.AVAILABLE
      });
    }

    this.carrito.items = itemsActuales;
    this.recalcularTotales();
    await this.validarStock();

    // Si la pieza recién solicitada carece de existencias, no se incorpora a la cesta
    if (esNuevaLinea) {
      const linea = (this.carrito.items || []).find(it => it.varianteId === varianteId);
      if (linea && (linea.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK || linea.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE)) {
        this.carrito.items = this.carrito.items.filter(it => it.varianteId !== varianteId);
        this.marcarAviso({
          varianteId,
          titulo: linea.titulo,
          tipo: linea.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
            ? CONSTANTS.CART.NOTICE_TYPES.PRODUCT_UNAVAILABLE
            : CONSTANTS.CART.NOTICE_TYPES.STOCK_EXHAUSTED,
          mensaje: linea.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
            ? `El artículo '${linea.titulo}' ya no está disponible en el catálogo.`
            : `El artículo '${linea.titulo}' está agotado y no se ha podido añadir a la cesta.`
        });
        this.recalcularTotales();
      }
    }
    await this.persistirCarrito();
  }

  /**
   * Refresca la línea local con los datos de stock disponibles conocidos
   */
  refrescarDesdeStorageConStock(varianteId, titulo, precioUnitario, stockDisponible) {
    const item = (this.carrito.items || []).find(it => it.varianteId === varianteId);
    if (!item) {
      this.carrito.items = this.carrito.items || [];
      this.carrito.items.push({
        varianteId,
        productoId: '',
        titulo: titulo || varianteId,
        precioUnitario,
        cantidad: stockDisponible,
        stockDisponible,
        estado: CONSTANTS.CART.ITEM_STATUS.AVAILABLE
      });
    } else {
      item.stockDisponible = stockDisponible;
    }
    this.recalcularTotales();
    this.persistirCarrito();
    this.render();
  }

  /**
   * Modifica la cantidad de una línea con saneamiento de entradas no válidas
   */
  async actualizarCantidad(varianteId, cantidadBruta) {
    const item = (this.carrito.items || []).find(it => it.varianteId === varianteId);
    if (!item) return;

    // Saneamiento: solo enteros positivos; 0 elimina; valores inválidos restauran el anterior
    const valorLimpio = this.sanearCantidad(cantidadBruta, item);

    if (valorLimpio === null) {
      // Entrada inválida: restaurar el último valor válido
      this.render();
      return;
    }

    if (valorLimpio === 0) {
      await this.eliminarItem(varianteId);
      return;
    }

    if (valorLimpio > item.stockDisponible) {
      this.marcarAviso({
        varianteId,
        titulo: item.titulo,
        tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
        mensaje: `Cantidad máxima disponible alcanzada (${item.stockDisponible} unidad(es)).`
      });
      this.render();
      return;
    }

    await this.actualizarCantidadInterna(varianteId, valorLimpio);
    await this.validarStock();
  }

  /**
   * Sanea el valor bruto del selector: devuelve entero válido, 0, o null si es inválido
   */
  sanearCantidad(cantidadBruta, item) {
    if (typeof cantidadBruta === 'string') {
      const sinEspacios = cantidadBruta.trim();
      if (sinEspacios === '') return null;
      // Descarta decimales, negativos y caracteres no numéricos
      if (!/^\d+$/.test(sinEspacios)) return null;
      return parseInt(sinEspacios, 10);
    }
    if (typeof cantidadBruta === 'number') {
      if (!Number.isInteger(cantidadBruta) || cantidadBruta < 0) return null;
      return cantidadBruta;
    }
    return null;
  }

  async actualizarCantidadInterna(varianteId, cantidad) {
    if (this.usuarioId) {
      try {
        this.carrito = await CartApiService.actualizarCantidad(varianteId, cantidad, this.usuarioId);
      } catch (err) {
        if (err.status !== 404) {
          this.mostrarError(err.message);
        }
      }
      return;
    }

    const item = (this.carrito.items || []).find(it => it.varianteId === varianteId);
    if (item) {
      item.cantidad = cantidad;
      item.estado = CONSTANTS.CART.ITEM_STATUS.AVAILABLE;
      item.recalcular?.();
    }
    this.recalcularTotales();
    this.persistirCarrito();
  }

  async eliminarItem(varianteId) {
    if (this.usuarioId) {
      try {
        this.carrito = await CartApiService.eliminarItem(varianteId, this.usuarioId);
      } catch (err) {
        this.mostrarError(err.message);
        return;
      }
    } else {
      this.carrito.items = (this.carrito.items || []).filter(it => it.varianteId !== varianteId);
      this.recalcularTotales();
      this.persistirCarrito();
    }
    await this.validarStock();
  }

  /**
   * Tramita el pedido: valida stock y navega al checkout existente (003-pago-tarjeta)
   */
  async tramitarPedido() {
    if ((this.carrito.items || []).length === 0 || this.bloqueaTramitacion) return;

    await this.validarStock();
    if (this.bloqueaTramitacion) return;

    const itemsValidos = (this.carrito.items || []).filter(
      it => it.estado === CONSTANTS.CART.ITEM_STATUS.AVAILABLE
    );

    if (itemsValidos.length === 0) return;

    if (this.onNavigateCheckout) {
      this.onNavigateCheckout(itemsValidos);
      return;
    }
    window.location.href = '/checkout';
  }

  async persistirCarrito() {
    await CartStorageService.syncCart(this.carrito);
  }

  /**
   * Recalcula subtotal y total localmente (mismo criterio que el backend)
   */
  recalcularTotales() {
    let subtotal = 0;
    let tieneBloqueo = false;
    for (const item of this.carrito.items || []) {
      if (item.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK || item.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE) {
        item.subtotalLinea = 0.00;
        tieneBloqueo = true;
      } else {
        item.subtotalLinea = Number((Number(item.precioUnitario) * item.cantidad).toFixed(2));
        subtotal += item.subtotalLinea;
      }
    }
    this.carrito.subtotal = Number(subtotal.toFixed(2));
    this.carrito.gastosEnvioEstimados = CONSTANTS.CART.DEFAULT_SHIPPING_ESTIMATE_EUR;
    this.carrito.total = Number((this.carrito.subtotal + this.carrito.gastosEnvioEstimados).toFixed(2));
    this.carrito.estado = (this.carrito.items || []).length === 0
      ? CONSTANTS.CART.STATUS.EMPTY
      : (tieneBloqueo ? CONSTANTS.CART.STATUS.BLOCKED : CONSTANTS.CART.STATUS.READY);
    this.bloqueaTramitacion = tieneBloqueo;
  }

  marcarAviso(aviso) {
    const clave = `${aviso.varianteId}:${aviso.tipo}:${aviso.mensaje}`;
    if (!this.avisosVisibles.has(clave)) {
      this.avisosVisibles.add(clave);
      this.avisos.push(aviso);
    }
  }

  mostrarError(mensaje) {
    const cajaErrores = document.getElementById('cart-error-box');
    if (cajaErrores) {
      cajaErrores.textContent = mensaje;
      cajaErrores.classList.remove('hidden');
    }
  }

  /**
   * Renderizado reactivo de la vista completa
   */
  render() {
    this.renderAvisos();
    this.renderTabla();
    this.renderResumen();
  }

  renderAvisos() {
    const panel = document.getElementById('cart-avisos-panel');
    if (!panel) return;

    if (this.avisos.length === 0) {
      panel.innerHTML = '';
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    panel.innerHTML = this.avisos.map((aviso, idx) => `
      <div class="cart-aviso cart-aviso--${aviso.tipo}" role="status">
        <span class="cart-aviso-icono" aria-hidden="true">${this.iconoAviso(aviso.tipo)}</span>
        <span class="cart-aviso-mensaje">${aviso.mensaje}</span>
        <button type="button" class="cart-aviso-cerrar" data-aviso-index="${idx}" aria-label="Cerrar aviso">×</button>
      </div>
    `).join('');

    panel.querySelectorAll('.cart-aviso-cerrar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-aviso-index'), 10);
        this.avisos.splice(idx, 1);
        this.renderAvisos();
      });
    });
  }

  iconoAviso(tipo) {
    switch (tipo) {
      case CONSTANTS.CART.NOTICE_TYPES.STOCK_EXHAUSTED:
      case CONSTANTS.CART.NOTICE_TYPES.PRODUCT_UNAVAILABLE:
        return '⛔';
      case CONSTANTS.CART.NOTICE_TYPES.PRICE_UPDATED:
        return '💰';
      default:
        return '⚠️';
    }
  }

  renderTabla() {
    const contenedor = document.getElementById('cart-table-container');
    if (!contenedor) return;

    const items = this.carrito.items || [];

    if (items.length === 0) {
      contenedor.innerHTML = `
        <div class="cart-empty-state" id="cart-empty-state">
          <span class="cart-empty-icono" aria-hidden="true">🧺</span>
          <p class="cart-empty-mensaje">Tu cesta está vacía</p>
          <a href="/catalogo" class="cart-empty-enlace" id="link-explorar-catalogo">Explorar piezas artesanales</a>
        </div>
      `;
      return;
    }

    const filas = items.map(item => this.renderFila(item)).join('');
    contenedor.innerHTML = `
      <table class="cart-table" id="cart-table">
        <thead>
          <tr>
            <th scope="col">Artículo</th>
            <th scope="col">Precio</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Subtotal</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
    `;

    // Interacción de los selectores de cantidad
    contenedor.querySelectorAll('.cart-cantidad-input').forEach(input => {
      const varianteId = input.getAttribute('data-variante-id');
      input.addEventListener('keydown', (e) => {
        // Restringe a dígitos y teclas de control
        if (e.key.length === 1 && !/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      });
      input.addEventListener('blur', (e) => {
        this.actualizarCantidad(varianteId, e.currentTarget.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      });
    });

    contenedor.querySelectorAll('.cart-btn-menos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const varianteId = e.currentTarget.getAttribute('data-variante-id');
        const item = (this.carrito.items || []).find(it => it.varianteId === varianteId);
        if (item) {
          this.actualizarCantidad(varianteId, item.cantidad - 1);
        }
      });
    });

    contenedor.querySelectorAll('.cart-btn-mas').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const varianteId = e.currentTarget.getAttribute('data-variante-id');
        const item = (this.carrito.items || []).find(it => it.varianteId === varianteId);
        if (item && item.cantidad < item.stockDisponible) {
          this.actualizarCantidad(varianteId, item.cantidad + 1);
        } else if (item) {
          this.marcarAviso({
            varianteId,
            titulo: item.titulo,
            tipo: CONSTANTS.CART.NOTICE_TYPES.STOCK_ADJUSTED,
            mensaje: `Cantidad máxima disponible alcanzada (${item.stockDisponible} unidad(es)).`
          });
          this.renderAvisos();
        }
      });
    });

    contenedor.querySelectorAll('.cart-btn-eliminar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const varianteId = e.currentTarget.getAttribute('data-variante-id');
        this.eliminarItem(varianteId);
      });
    });
  }

  renderFila(item) {
    const noDisponible =
      item.estado === CONSTANTS.CART.ITEM_STATUS.OUT_OF_STOCK ||
      item.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE;

    const etiquetaEstado = noDisponible
      ? (item.estado === CONSTANTS.CART.ITEM_STATUS.UNAVAILABLE
        ? '<span class="cart-badge cart-badge--no-disponible">No disponible</span>'
        : '<span class="cart-badge cart-badge--agotado">Agotado</span>')
      : (item.estado === CONSTANTS.CART.ITEM_STATUS.ADJUSTED
        ? '<span class="cart-badge cart-badge--reajustado">Reajustado</span>'
        : '');

    const deshabilitado = noDisponible ? 'disabled' : '';

    return `
      <tr class="cart-fila ${noDisponible ? 'cart-fila--invalida' : ''}" data-variante-id="${item.varianteId}">
        <td class="cart-col-articulo">
          <div class="cart-articulo-titulo">${item.titulo}</div>
          ${etiquetaEstado}
        </td>
        <td class="cart-col-precio font-mono">${formatEUR(item.precioUnitario)}</td>
        <td class="cart-col-cantidad">
          <div class="cart-cantidad-selector">
            <button type="button" class="cart-btn-menos" data-variante-id="${item.varianteId}" ${deshabilitado} aria-label="Reducir cantidad">−</button>
            <input type="text" inputmode="numeric" class="cart-cantidad-input font-mono" data-variante-id="${item.varianteId}"
                   value="${item.cantidad}" ${deshabilitado} aria-label="Cantidad de ${item.titulo}">
            <button type="button" class="cart-btn-mas" data-variante-id="${item.varianteId}" ${deshabilitado} aria-label="Aumentar cantidad">+</button>
          </div>
          <div class="cart-cantidad-limite font-mono">Máx: ${item.stockDisponible}</div>
        </td>
        <td class="cart-col-subtotal font-mono">${formatEUR(item.subtotalLinea ?? 0.00)}</td>
        <td class="cart-col-acciones">
          <button type="button" class="cart-btn-eliminar" data-variante-id="${item.varianteId}" aria-label="Eliminar ${item.titulo}">Eliminar</button>
        </td>
      </tr>
    `;
  }

  renderResumen() {
    const subtotalEl = document.getElementById('cart-subtotal');
    const envioEl = document.getElementById('cart-gastos-envio');
    const totalEl = document.getElementById('cart-total');
    const btnCheckout = document.getElementById('btn-tramitar-pedido');
    const btnVaciar = document.getElementById('btn-vaciar-carrito');

    const vacia = (this.carrito.items || []).length === 0;

    if (subtotalEl) subtotalEl.textContent = formatEUR(this.carrito.subtotal ?? 0.00);
    if (envioEl) envioEl.textContent = formatEUR(CONSTANTS.CART.DEFAULT_SHIPPING_ESTIMATE_EUR);
    if (totalEl) totalEl.textContent = formatEUR(this.carrito.total ?? 0.00);

    if (btnCheckout) {
      // Inhabilitado estrictamente en estado vacío o bloqueado
      btnCheckout.disabled = vacia || this.bloqueaTramitacion;
    }
    if (btnVaciar) {
      btnVaciar.disabled = vacia;
    }
  }
}
