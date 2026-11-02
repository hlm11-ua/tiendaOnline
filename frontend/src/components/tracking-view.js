/**
 * Componente: Vista de consulta y seguimiento del pedido para el comprador (FR-004, FR-005)
 * Incluye barra de progreso visual de 4 estados y acción de confirmación por el cliente.
 */
export class TrackingView {
  constructor({ containerId, onSearch, onConfirmDelivery }) {
    this.container = document.getElementById(containerId);
    this.onSearch = onSearch;
    this.onConfirmDelivery = onConfirmDelivery;
  }

  static formatCurrency(amount) {
    return `${Number(amount || 0).toFixed(2).replace('.', ',')} €`;
  }

  static formatDate(isoDate) {
    if (!isoDate) return 'Pendiente';
    return new Date(isoDate).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  renderInitial(initialRef = '') {
    if (!this.container) return;

    this.container.innerHTML = `
      <section class="tracking-search-card" aria-labelledby="tracking-title">
        <header class="tracking-search-header">
          <h2 id="tracking-title" class="tracking-title">🔎 Consulta y Seguimiento de tu Envío</h2>
          <p class="tracking-subtitle">Sigue en tiempo real la elaboración artesanal y el trayecto de tu paquete.</p>
        </header>

        <form id="form-tracking-search" class="tracking-search-form">
          <div class="search-input-group">
            <label for="input-search-ref" class="visually-hidden">Código de referencia</label>
            <input 
              type="text" 
              id="input-search-ref" 
              class="form-input font-mono" 
              placeholder="Introduce tu código de referencia (ej: PED-20261014-9988)" 
              value="${initialRef}"
              required
            />
            <button type="submit" class="btn btn-primary" id="btn-buscar-seguimiento">
              🔍 Consultar Estado
            </button>
          </div>
        </form>

        <div id="tracking-result-area" class="tracking-result-area"></div>
      </section>
    `;

    const form = this.container.querySelector('#form-tracking-search');
    const input = this.container.querySelector('#input-search-ref');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ref = input.value.trim();
      if (ref && this.onSearch) {
        this.onSearch(ref);
      }
    });

    if (initialRef && this.onSearch) {
      this.onSearch(initialRef);
    }
  }

  showNotFound(ref) {
    const resultArea = this.container.querySelector('#tracking-result-area');
    if (!resultArea) return;

    resultArea.innerHTML = `
      <div class="alert alert-error">
        No se ha encontrado ningún pedido con la referencia <strong>${ref}</strong>. Por favor, verifica el código recibido en tu justificante de compra.
      </div>
    `;
  }

  renderOrderDetails(pedido) {
    const resultArea = this.container.querySelector('#tracking-result-area');
    if (!resultArea || !pedido) return;

    const estados = [
      { key: 'pagado', label: '1. Pagado', desc: 'Cobro verificado y confirmado' },
      { key: 'en_preparacion', label: '2. En preparación', desc: 'Empaquetado en el taller' },
      { key: 'salido_tienda', label: '3. En camino', desc: 'Despachado con transportista' },
      { key: 'entregado', label: '4. Entregado', desc: 'Recepción confirmada' }
    ];

    const orderStateIndex = {
      'pendiente': -1,
      'pagado': 0,
      'en_preparacion': 1,
      'salido_tienda': 2,
      'entregado': 3
    }[pedido.estado] ?? 0;

    const stepsHtml = estados.map((s, idx) => {
      const isCompleted = idx < orderStateIndex;
      const isCurrent = idx === orderStateIndex;
      let statusClass = 'step-upcoming';
      if (isCompleted) statusClass = 'step-completed';
      if (isCurrent) statusClass = 'step-current';

      return `
        <div class="timeline-step ${statusClass}">
          <div class="step-indicator font-mono">${isCompleted ? '✓' : idx + 1}</div>
          <div class="step-content">
            <span class="step-title font-medium">${s.label}</span>
            <span class="step-desc text-xs text-muted">${s.desc}</span>
          </div>
        </div>
      `;
    }).join('');

    const shippingCardHtml = pedido.envio?.numeroSeguimiento
      ? `
        <div class="shipment-badge-card">
          <div class="shipment-badge-header">
            <span class="badge badge-shipped">🚚 Envío en Tránsito</span>
            <span class="text-xs text-muted">Salida: ${TrackingView.formatDate(pedido.envio.fechaSalida)}</span>
          </div>
          <div class="shipment-data-grid">
            <div>
              <span class="text-xs text-muted block">Empresa de Mensajería:</span>
              <strong class="font-medium">${pedido.envio.transportista}</strong>
            </div>
            <div>
              <span class="text-xs text-muted block">Número de Seguimiento:</span>
              <code class="font-mono text-primary font-bold text-sm" id="client-tracking-code">${pedido.envio.numeroSeguimiento}</code>
            </div>
          </div>
        </div>
      `
      : `
        <div class="shipment-pending-note text-xs text-muted">
          ℹ️ Tu pedido está siendo preparado con esmero por nuestros artesanos. En cuanto sea recogido por la mensajería verás aquí tu número de seguimiento.
        </div>
      `;

    // Botón de confirmación por el cliente (FR-005)
    let clientActionHtml = '';
    if (pedido.estado === 'salido_tienda') {
      clientActionHtml = `
        <div class="delivery-confirmation-card">
          <p class="font-medium text-sm">¿Ya has recibido tu paquete?</p>
          <p class="text-xs text-muted">Si el transportista ya te ha entregado los artículos, confírmalo para cerrar el pedido.</p>
          <button type="button" class="btn btn-success btn-lg" id="btn-cliente-confirmar-entrega">
            ✅ He recibido mi pedido
          </button>
        </div>
      `;
    } else if (pedido.estado === 'entregado') {
      clientActionHtml = `
        <div class="delivery-completed-card">
          <span class="completed-icon">🎉</span>
          <div>
            <h4 class="font-bold text-success">¡Pedido Entregado con Éxito!</h4>
            <p class="text-xs text-muted">Entrega registrada el ${TrackingView.formatDate(pedido.envio?.fechaEntrega || pedido.updatedAt)}. Gracias por apoyar nuestra artesanía.</p>
          </div>
        </div>
      `;
    }

    resultArea.innerHTML = `
      <div class="tracking-details-card">
        <div class="tracking-card-header">
          <div>
            <span class="text-xs text-muted">Referencia del Pedido:</span>
            <h3 class="font-mono font-bold text-lg text-primary" id="tracking-display-ref">${pedido.codigoReferencia}</h3>
          </div>
          <div class="text-right">
            <span class="text-xs text-muted">Total:</span>
            <span class="font-bold text-lg">${TrackingView.formatCurrency(pedido.total)}</span>
          </div>
        </div>

        <div class="timeline-container" aria-label="Progreso del pedido">
          ${stepsHtml}
        </div>

        <div class="tracking-card-body">
          ${shippingCardHtml}
          ${clientActionHtml}
        </div>
      </div>
    `;

    // Vincular botón de confirmación de entrega del cliente
    const confirmBtn = resultArea.querySelector('#btn-cliente-confirmar-entrega');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.onConfirmDelivery) {
          this.onConfirmDelivery(pedido.codigoReferencia);
        }
      });
    }
  }
}
