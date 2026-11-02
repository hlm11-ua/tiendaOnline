/**
 * Componente: Tabla de pedidos para el taller logístico y administración de expediciones
 * Permite filtrar por estado operativo y realizar transiciones secuenciales (FR-001, FR-002)
 */
export class LogisticsOrdersTable {
  constructor({
    containerId,
    onPrepare,
    onDispatch,
    onRectify,
    onDeliver,
    onViewNotices,
    onFilterChange
  }) {
    this.container = document.getElementById(containerId);
    this.onPrepare = onPrepare;
    this.onDispatch = onDispatch;
    this.onRectify = onRectify;
    this.onDeliver = onDeliver;
    this.onViewNotices = onViewNotices;
    this.onFilterChange = onFilterChange;
    this.currentFilter = 'todos';
  }

  static formatCurrency(amount) {
    return `${Number(amount || 0).toFixed(2).replace('.', ',')} €`;
  }

  static formatDate(isoDate) {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getStatusBadge(estado) {
    switch (estado) {
      case 'pagado':
        return '<span class="status-badge badge-paid">Pagado</span>';
      case 'en_preparacion':
        return '<span class="status-badge badge-prep">En preparación</span>';
      case 'salido_tienda':
        return '<span class="status-badge badge-shipped">Salido de tienda</span>';
      case 'entregado':
        return '<span class="status-badge badge-delivered">Entregado</span>';
      default:
        return `<span class="status-badge badge-default">${estado}</span>`;
    }
  }

  render(pedidos = [], activeFilter = 'todos') {
    if (!this.container) return;
    this.currentFilter = activeFilter;

    const rowsHtml = pedidos.length === 0
      ? `<tr><td colspan="7" class="empty-state-cell">No se encontraron pedidos en la categoría seleccionada.</td></tr>`
      : pedidos.map(p => {
          const fecha = LogisticsOrdersTable.formatDate(p.createdAt || p.fechaCreacion);
          const total = LogisticsOrdersTable.formatCurrency(p.total);
          const badge = LogisticsOrdersTable.getStatusBadge(p.estado);
          const trackingInfo = p.envio?.numeroSeguimiento
            ? `<div class="tracking-snippet">
                 <strong>${p.envio.transportista}:</strong>
                 <code class="tracking-code font-mono">${p.envio.numeroSeguimiento}</code>
               </div>`
            : '<span class="text-muted">Sin asignar</span>';

          // Botones de acción contextuales según la máquina de estados
          let actionsHtml = '';
          if (p.estado === 'pagado') {
            actionsHtml = `
              <button type="button" class="btn btn-sm btn-prep btn-iniciar-prep" data-ref="${p.codigoReferencia}" title="Iniciar preparación en taller">
                📦 Iniciar Preparación
              </button>
            `;
          } else if (p.estado === 'en_preparacion') {
            actionsHtml = `
              <button type="button" class="btn btn-sm btn-ship btn-despachar" data-ref="${p.codigoReferencia}" title="Asignar seguimiento y despachar">
                🚚 Despachar Envío
              </button>
            `;
          } else if (p.estado === 'salido_tienda') {
            actionsHtml = `
              <div class="actions-group">
                <button type="button" class="btn btn-sm btn-deliver btn-marcar-entregado" data-ref="${p.codigoReferencia}" title="Confirmar recepción física">
                  ✅ Entregar
                </button>
                <button type="button" class="btn btn-sm btn-outline btn-rectificar" data-ref="${p.codigoReferencia}" title="Corregir errata en número de seguimiento">
                  ✏️ Rectificar
                </button>
                <button type="button" class="btn btn-sm btn-ghost btn-ver-avisos" data-ref="${p.codigoReferencia}" title="Ver avisos automáticos emitidos">
                  ✉️ Avisos
                </button>
              </div>
            `;
          } else if (p.estado === 'entregado') {
            actionsHtml = `
              <button type="button" class="btn btn-sm btn-ghost btn-ver-avisos" data-ref="${p.codigoReferencia}" title="Ver historial de avisos">
                ✉️ Avisos
              </button>
            `;
          }

          return `
            <tr class="order-table-row" data-ref="${p.codigoReferencia}">
              <td class="font-mono font-bold text-primary">${p.codigoReferencia}</td>
              <td>
                <div class="customer-info">
                  <span class="customer-name font-medium">${p.clienteNombre}</span>
                  <span class="customer-email text-xs text-muted">${p.clienteEmail}</span>
                </div>
              </td>
              <td class="text-xs text-muted">${fecha}</td>
              <td class="text-right font-medium">${total}</td>
              <td class="text-center">${badge}</td>
              <td>${trackingInfo}</td>
              <td class="text-right actions-cell">${actionsHtml}</td>
            </tr>
          `;
        }).join('');

    this.container.innerHTML = `
      <section class="logistics-panel" aria-labelledby="logistics-heading">
        <header class="panel-header">
          <div>
            <h2 id="logistics-heading" class="panel-title">📦 Mesa de Trabajo del Taller y Despachos</h2>
            <p class="panel-subtitle">Control de preparación, expedición con transportistas y notificaciones automáticas.</p>
          </div>
          <div class="filter-tabs" role="tablist" aria-label="Filtros por estado de pedido">
            <button type="button" role="tab" class="filter-tab ${this.currentFilter === 'todos' ? 'active' : ''}" data-filter="todos">
              Todos (${pedidos.length})
            </button>
            <button type="button" role="tab" class="filter-tab ${this.currentFilter === 'pagado' ? 'active' : ''}" data-filter="pagado">
              Pagados
            </button>
            <button type="button" role="tab" class="filter-tab ${this.currentFilter === 'en_preparacion' ? 'active' : ''}" data-filter="en_preparacion">
              En preparación
            </button>
            <button type="button" role="tab" class="filter-tab ${this.currentFilter === 'salido_tienda' ? 'active' : ''}" data-filter="salido_tienda">
              Salidos de tienda
            </button>
            <button type="button" role="tab" class="filter-tab ${this.currentFilter === 'entregado' ? 'active' : ''}" data-filter="entregado">
              Entregados
            </button>
          </div>
        </header>

        <div class="table-responsive">
          <table class="logistics-table">
            <thead>
              <tr>
                <th scope="col">Referencia</th>
                <th scope="col">Comprador</th>
                <th scope="col">Fecha Cobro</th>
                <th scope="col" class="text-right">Total</th>
                <th scope="col" class="text-center">Estado</th>
                <th scope="col">Envío / Tracking</th>
                <th scope="col" class="text-right">Acción Operativa</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </section>
    `;

    // Asignar escuchadores de eventos
    this.bindEvents(pedidos);
  }

  bindEvents(pedidos) {
    // Pestañas de filtro
    const filterTabs = this.container.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const selected = tab.getAttribute('data-filter');
        if (this.onFilterChange) {
          this.onFilterChange(selected);
        }
      });
    });

    // Acción: Iniciar preparación
    this.container.querySelectorAll('.btn-iniciar-prep').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        if (this.onPrepare) this.onPrepare(ref);
      });
    });

    // Acción: Despachar
    this.container.querySelectorAll('.btn-despachar').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        const pedido = pedidos.find(p => p.codigoReferencia === ref);
        if (this.onDispatch) this.onDispatch(pedido);
      });
    });

    // Acción: Rectificar tracking
    this.container.querySelectorAll('.btn-rectificar').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        const pedido = pedidos.find(p => p.codigoReferencia === ref);
        if (this.onRectify) this.onRectify(pedido);
      });
    });

    // Acción: Entregar
    this.container.querySelectorAll('.btn-marcar-entregado').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        if (this.onDeliver) this.onDeliver(ref);
      });
    });

    // Acción: Ver avisos emitidos
    this.container.querySelectorAll('.btn-ver-avisos').forEach(btn => {
      btn.addEventListener('click', () => {
        const ref = btn.getAttribute('data-ref');
        if (this.onViewNotices) this.onViewNotices(ref);
      });
    });
  }
}
