import { PhaseStepper } from './phase-stepper.js';

export class OrderHistoryComponent {
  constructor({ container, accountService, onLogout }) {
    this.container = container;
    this.accountService = accountService;
    this.onLogout = onLogout;
    this.pedidos = [];
    this.selectedPedido = null;
  }

  formatMoney(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  getBadgeClass(estado) {
    switch (estado) {
      case 'pendiente':
        return 'badge-warning';
      case 'pagado':
      case 'en_preparacion':
        return 'badge-info';
      case 'salido_tienda':
      case 'salido de la tienda':
        return 'badge-primary';
      case 'entregado':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  getBadgeLabel(estado) {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'pagado':
        return 'Pagado';
      case 'en_preparacion':
        return 'En preparación';
      case 'salido_tienda':
      case 'salido de la tienda':
        return 'Salido de la tienda';
      case 'entregado':
        return 'Entregado';
      default:
        return estado;
    }
  }

  async loadOrders() {
    try {
      const data = await this.accountService.getMisCompras();
      this.pedidos = data.pedidos || [];
      this.render();
    } catch (err) {
      this.renderError(err.message || 'No se pudieron cargar tus pedidos.');
    }
  }

  renderError(msg) {
    this.container.innerHTML = `
      <div class="alert-message alert-error">
        ${msg}
        <button class="btn btn-secondary btn-sm" id="btn-retry-orders">Reintentar</button>
      </div>
    `;
    const btn = this.container.querySelector('#btn-retry-orders');
    if (btn) btn.addEventListener('click', () => this.loadOrders());
  }

  render() {
    const user = this.accountService.getUser();

    const headerHtml = `
      <div class="account-header">
        <div class="user-info">
          <h2>Hola, ${user?.nombre || 'Cliente'}</h2>
          <span class="user-email">${user?.email || ''}</span>
          ${user?.rol === 'admin' ? '<span class="badge badge-admin">Administrador</span>' : ''}
        </div>
        <div class="header-actions">
          <a href="/catalogo" class="btn btn-secondary">Explorar Catálogo</a>
          <button type="button" class="btn btn-outline" id="btn-logout">Cerrar sesión</button>
        </div>
      </div>
    `;

    let contentHtml = '';

    if (this.pedidos.length === 0) {
      contentHtml = `
        <div class="empty-state">
          <div class="empty-icon">🛍️</div>
          <h3>Aún no has realizado ninguna compra</h3>
          <p>Tus pedidos de artesanía aparecerán aquí con su seguimiento detallado.</p>
          <a href="/catalogo" class="btn btn-primary">Ir a la tienda</a>
        </div>
      `;
    } else {
      const ordersRows = this.pedidos.map(p => {
        const totalFmt = this.formatMoney(p.total);
        const fechaFmt = this.formatDate(p.fechaCreacion);
        const estado = p.fase || p.estado || 'pagado';
        const badgeClass = this.getBadgeClass(estado);
        const badgeLabel = this.getBadgeLabel(estado);
        const numItems = Array.isArray(p.lineas) ? p.lineas.reduce((acc, l) => acc + (l.cantidad || 1), 0) : 1;

        return `
          <tr class="order-row" data-ref="${p.codigoReferencia}">
            <td class="col-ref">
              <strong>${p.codigoReferencia}</strong>
            </td>
            <td class="col-date">${fechaFmt}</td>
            <td class="col-items">${numItems} ${numItems === 1 ? 'pieza' : 'piezas'}</td>
            <td class="col-total">${totalFmt}</td>
            <td class="col-status">
              <span class="badge ${badgeClass}">${badgeLabel}</span>
            </td>
            <td class="col-actions">
              <button type="button" class="btn btn-sm btn-outline btn-ver-pedido" data-ref="${p.codigoReferencia}">
                Ver seguimiento
              </button>
            </td>
          </tr>
        `;
      }).join('');

      contentHtml = `
        <div class="orders-table-wrapper">
          <h3>Mis compras recientes (${this.pedidos.length})</h3>
          <table class="orders-table">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Artículos</th>
                <th>Total (€)</th>
                <th>Fase actual</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${ordersRows}
            </tbody>
          </table>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="account-dashboard">
        ${headerHtml}
        ${contentHtml}
        <div id="modal-container"></div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const logoutBtn = this.container.querySelector('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.accountService.logout();
        if (this.onLogout) this.onLogout();
      });
    }

    const viewBtns = this.container.querySelectorAll('.btn-ver-pedido');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ref = e.currentTarget.getAttribute('data-ref');
        this.openOrderModal(ref);
      });
    });
  }

  openOrderModal(codigoReferencia) {
    const pedido = this.pedidos.find(p => p.codigoReferencia === codigoReferencia);
    if (!pedido) return;

    const modalContainer = this.container.querySelector('#modal-container');
    const stepperHtml = PhaseStepper.render(pedido);

    const itemsHtml = Array.isArray(pedido.lineas) && pedido.lineas.length > 0
      ? pedido.lineas.map(l => `
          <div class="modal-item-row">
            <span class="item-title">${l.titulo} × ${l.cantidad}</span>
            <span class="item-subtotal">${this.formatMoney(l.subtotal || l.precioUnitario * l.cantidad)}</span>
          </div>
        `).join('')
      : '<p class="text-muted">Desglose no disponible.</p>';

    modalContainer.innerHTML = `
      <div class="modal-backdrop" id="order-modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Seguimiento del Pedido ${pedido.codigoReferencia}</h3>
            <button type="button" class="modal-close" id="btn-close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <h4>Fase del pedido</h4>
              ${stepperHtml}
            </div>

            <div class="modal-section">
              <h4>Artículos adquiridos</h4>
              <div class="modal-items-list">
                ${itemsHtml}
              </div>
              <div class="modal-total-row">
                <span>Total pagado:</span>
                <strong>${this.formatMoney(pedido.total)}</strong>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="btn-modal-done">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      modalContainer.innerHTML = '';
    };

    modalContainer.querySelector('#btn-close-modal').addEventListener('click', closeModal);
    modalContainer.querySelector('#btn-modal-done').addEventListener('click', closeModal);
    modalContainer.querySelector('#order-modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'order-modal-backdrop') closeModal();
    });
  }
}
