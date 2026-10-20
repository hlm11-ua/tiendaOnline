/**
 * Componente: Widget de Alertas de Stock Bajo y Agotado (FR-006, SC-002)
 * Proporciona un resumen visual inmediato de las variantes bajo umbral o agotadas
 * y permite filtrar rápidamente los productos críticos con un solo clic.
 */
export class StockAlertsWidget {
  constructor({ containerId, onFilterAlerts, onSelectAlert, onRefresh }) {
    this.container = document.getElementById(containerId);
    this.onFilterAlerts = onFilterAlerts;
    this.onSelectAlert = onSelectAlert;
    this.onRefresh = onRefresh;

    this.alerts = [];
    this.activeFilter = null; // null | 'agotado' | 'stock_bajo'
  }

  render(alerts = []) {
    this.alerts = alerts;
    if (!this.container) return;

    const agotadas = alerts.filter(a => a.tipoAlerta === 'agotado' || a.stockTotal === 0);
    const stockBajo = alerts.filter(a => a.tipoAlerta === 'stock_bajo' || (a.stockTotal > 0 && a.stockTotal <= a.umbralAlerta));
    const totalAlertas = alerts.length;

    this.container.innerHTML = `
      <div class="card stock-alerts-card">
        <div class="card-header alerts-header">
          <div class="header-title">
            <h3>Alertas de Inventario en Tiempo Real</h3>
            <span class="badge-pill ${totalAlertas > 0 ? 'badge-warning-pill' : 'badge-success-pill'}">
              ${totalAlertas} ${totalAlertas === 1 ? 'alerta activa' : 'alertas activas'}
            </span>
          </div>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-refresh-alerts" title="Actualizar alertas">
            🔄 Actualizar
          </button>
        </div>

        <div class="card-body">
          <!-- Tarjetas de Métricas Rápidas -->
          <div class="alerts-metrics-grid">
            <div 
              class="metric-box metric-total ${this.activeFilter === 'todas' ? 'active-filter' : ''}" 
              data-filter="todas"
            >
              <div class="metric-icon">📦</div>
              <div class="metric-info">
                <span class="metric-number">${totalAlertas}</span>
                <span class="metric-label">Total Alertas</span>
              </div>
            </div>

            <div 
              class="metric-box metric-bajo ${this.activeFilter === 'stock_bajo' ? 'active-filter' : ''}" 
              data-filter="stock_bajo"
            >
              <div class="metric-icon">⚠️</div>
              <div class="metric-info">
                <span class="metric-number">${stockBajo.length}</span>
                <span class="metric-label">Stock Bajo</span>
              </div>
            </div>

            <div 
              class="metric-box metric-agotado ${this.activeFilter === 'agotado' ? 'active-filter' : ''}" 
              data-filter="agotado"
            >
              <div class="metric-icon">🚫</div>
              <div class="metric-info">
                <span class="metric-number">${agotadas.length}</span>
                <span class="metric-label">Agotadas</span>
              </div>
            </div>
          </div>

          <!-- Listado de Alertas Detalladas -->
          <div class="alerts-list-container margin-top-m">
            ${this.renderAlertList(alerts)}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderAlertList(alerts) {
    if (alerts.length === 0) {
      return `
        <div class="alerts-empty-state">
          <span class="empty-icon">✅</span>
          <p><strong>Inventario en estado óptimo</strong></p>
          <span class="text-muted text-sm">Todas las variantes de productos tienen stock por encima de sus umbrales de aviso.</span>
        </div>
      `;
    }

    // Filtrar según selección activa si procede
    let displayed = alerts;
    if (this.activeFilter === 'agotado') {
      displayed = alerts.filter(a => a.tipoAlerta === 'agotado' || a.stockTotal === 0);
    } else if (this.activeFilter === 'stock_bajo') {
      displayed = alerts.filter(a => a.tipoAlerta === 'stock_bajo' || (a.stockTotal > 0 && a.stockTotal <= a.umbralAlerta));
    }

    return `
      <div class="alerts-items-scroll">
        ${displayed.map(a => {
          const isAgotado = a.tipoAlerta === 'agotado' || a.stockTotal === 0;
          const badgeClass = isAgotado ? 'badge-stock-agotado' : 'badge-stock-bajo';
          const badgeLabel = isAgotado 
            ? 'Agotada (0)' 
            : `Stock bajo (${a.stockTotal} ${a.stockTotal === 1 ? 'unidad' : 'unidades'})`;

          return `
            <div class="alert-item-card ${isAgotado ? 'border-agotado' : 'border-bajo'}" data-variant-id="${a.varianteId}" data-product-id="${a.productoId}">
              <div class="alert-item-main">
                <div class="alert-item-product">
                  <strong>${this.escapeHtml(a.productoNombre)}</strong>
                  <span class="alert-item-variant">Variante: <em>${this.escapeHtml(a.varianteNombre)}</em></span>
                </div>
                <div class="alert-item-details">
                  <span class="badge-stock ${badgeClass}">${badgeLabel}</span>
                  <span class="text-xs text-muted">Umbral aviso: ${a.umbralAlerta} uds.</span>
                </div>
              </div>
              <div class="alert-item-actions">
                <button type="button" class="btn btn-xs btn-outline-primary btn-jump-product" data-product-id="${a.productoId}">
                  Ver Producto
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  bindEvents() {
    // Botón de refresco manual
    const btnRefresh = this.container.querySelector('#btn-refresh-alerts');
    if (btnRefresh && this.onRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.onRefresh();
      });
    }

    // Clic en tarjetas métricas de filtro
    this.container.querySelectorAll('.metric-box').forEach(box => {
      box.addEventListener('click', () => {
        const filterType = box.getAttribute('data-filter');
        if (this.activeFilter === filterType) {
          this.activeFilter = null; // Toggle desactivar
        } else {
          this.activeFilter = filterType;
        }

        this.render(this.alerts);

        if (this.onFilterAlerts) {
          this.onFilterAlerts(this.activeFilter);
        }
      });
    });

    // Clic en "Ver Producto" de cada alerta
    this.container.querySelectorAll('.btn-jump-product').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = btn.getAttribute('data-product-id');
        if (this.onSelectAlert) {
          this.onSelectAlert(productId);
        }
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
