import { SalesReportApiService } from '../../services/sales-report-api.service.js';

/**
 * Componente interactivo: Cuadro de Mando de Ventas y Exportación de Métricas
 * Permite filtrar por períodos predefinidos y personalizados, visualiza totales,
 * tabla Top 5 de artículos más vendidos y gestiona la descarga de CSV.
 */
export class SalesReportView {
  constructor({ containerId }) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.periodo = '30_dias';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.reportData = null;
    this.isLoading = false;
  }

  /**
   * Inicializa el componente y carga los datos por defecto
   */
  async init() {
    if (!this.container) return;
    this.renderSkeleton();
    this.attachEventListeners();
    await this.cargarInforme();
  }

  /**
   * Renderiza el esqueleto HTML inicial del cuadro de mando
   */
  renderSkeleton() {
    const hoy = new Date().toISOString().slice(0, 10);
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    this.container.innerHTML = `
      <div class="sales-dashboard">
        <!-- Barra Superior de Filtros y Acciones -->
        <div class="dashboard-controls-card">
          <div class="controls-row">
            <div class="period-selectors" role="group" aria-label="Selector de período de ventas">
              <span class="selector-label">Período:</span>
              <button type="button" class="btn btn-period ${this.periodo === '7_dias' ? 'active' : ''}" data-periodo="7_dias">
                Últimos 7 días
              </button>
              <button type="button" class="btn btn-period ${this.periodo === '30_dias' ? 'active' : ''}" data-periodo="30_dias">
                Último mes (30 días)
              </button>
              <button type="button" class="btn btn-period ${this.periodo === '1_ano' ? 'active' : ''}" data-periodo="1_ano">
                Último año
              </button>
              <button type="button" class="btn btn-period ${this.periodo === 'personalizado' ? 'active' : ''}" data-periodo="personalizado">
                Personalizado
              </button>
            </div>

            <div class="custom-dates-container ${this.periodo === 'personalizado' ? 'visible' : 'hidden'}" id="custom-dates-block">
              <div class="date-input-group">
                <label for="input-fecha-inicio">Desde:</label>
                <input type="date" id="input-fecha-inicio" class="form-control" value="${this.fechaInicio || hace30dias}" max="${hoy}">
              </div>
              <div class="date-input-group">
                <label for="input-fecha-fin">Hasta:</label>
                <input type="date" id="input-fecha-fin" class="form-control" value="${this.fechaFin || hoy}" max="${hoy}">
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-aplicar-rango">
                Aplicar
              </button>
            </div>

            <div class="dashboard-actions">
              <button type="button" class="btn btn-outline-secondary" id="btn-refrescar" title="Recargar métricas">
                🔄 Actualizar
              </button>
              <button type="button" class="btn btn-success" id="btn-exportar-csv" title="Descargar datos en CSV">
                📥 Exportar a CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Mensajes y Alertas -->
        <div id="sales-alerts-container" class="sales-alerts-container"></div>

        <!-- Tarjetas de Métricas KPI -->
        <div class="sales-kpi-grid">
          <div class="kpi-card kpi-facturacion">
            <div class="kpi-icon">💶</div>
            <div class="kpi-content">
              <span class="kpi-title">Facturación Bruta Total</span>
              <span class="kpi-value" id="kpi-facturacion">0,00 €</span>
              <span class="kpi-subtext" id="kpi-periodo-label">Cargando...</span>
            </div>
          </div>

          <div class="kpi-card kpi-pedidos">
            <div class="kpi-icon">📦</div>
            <div class="kpi-content">
              <span class="kpi-title">Pedidos Confirmados</span>
              <span class="kpi-value" id="kpi-pedidos">0</span>
              <span class="kpi-subtext">Pedidos cobrados computados</span>
            </div>
          </div>

          <div class="kpi-card kpi-ticket">
            <div class="kpi-icon">📈</div>
            <div class="kpi-content">
              <span class="kpi-title">Ticket Medio de Compra</span>
              <span class="kpi-value" id="kpi-ticket">0,00 €</span>
              <span class="kpi-subtext">Promedio por pedido cobrado</span>
            </div>
          </div>
        </div>

        <!-- Tabla: Ranking Top 5 de Productos Más Vendidos -->
        <div class="card ranking-card">
          <div class="card-header ranking-header">
            <div>
              <h3>🏆 Ranking de Productos Más Vendidos (Top 5)</h3>
              <p class="section-subtitle">Artículos con mayor demanda en el período ordenados por unidades vendidas</p>
            </div>
            <span class="badge-pill badge-primary-pill" id="badge-total-ranking">Top 5</span>
          </div>

          <div class="card-body">
            <div class="table-responsive">
              <table class="table ranking-table" id="tabla-ranking">
                <thead>
                  <tr>
                    <th style="width: 80px; text-align: center;">Puesto</th>
                    <th>Producto</th>
                    <th>Artesano</th>
                    <th style="text-align: right;">Unidades Vendidas</th>
                    <th style="text-align: right;">Facturación (€)</th>
                  </tr>
                </thead>
                <tbody id="ranking-tbody">
                  <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                      Cargando datos de ventas...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Conecta los manejadores de eventos interactivos
   */
  attachEventListeners() {
    // Botones de período
    const periodButtons = this.container.querySelectorAll('.btn-period');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const nuevoPeriodo = e.currentTarget.getAttribute('data-periodo');
        if (this.periodo === nuevoPeriodo && nuevoPeriodo !== 'personalizado') return;

        periodButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.periodo = nuevoPeriodo;
        const customBlock = this.container.querySelector('#custom-dates-block');

        if (nuevoPeriodo === 'personalizado') {
          customBlock.classList.remove('hidden');
          customBlock.classList.add('visible');
        } else {
          customBlock.classList.remove('visible');
          customBlock.classList.add('hidden');
          await this.cargarInforme();
        }
      });
    });

    // Botón aplicar rango personalizado
    const btnAplicar = this.container.querySelector('#btn-aplicar-rango');
    if (btnAplicar) {
      btnAplicar.addEventListener('click', async () => {
        const inicioInput = this.container.querySelector('#input-fecha-inicio');
        const finInput = this.container.querySelector('#input-fecha-fin');
        this.fechaInicio = inicioInput ? inicioInput.value : '';
        this.fechaFin = finInput ? finInput.value : '';

        if (!this.fechaInicio || !this.fechaFin) {
          this.mostrarAlerta('Debe seleccionar ambas fechas (inicio y fin).', 'warning');
          return;
        }

        if (this.fechaInicio > this.fechaFin) {
          this.mostrarAlerta('La fecha de inicio no puede ser posterior a la fecha de fin.', 'danger');
          return;
        }

        await this.cargarInforme();
      });
    }

    // Botón refrescar
    const btnRefrescar = this.container.querySelector('#btn-refrescar');
    if (btnRefrescar) {
      btnRefrescar.addEventListener('click', async () => {
        await this.cargarInforme();
      });
    }

    // Botón exportar CSV
    const btnExportar = this.container.querySelector('#btn-exportar-csv');
    if (btnExportar) {
      btnExportar.addEventListener('click', async () => {
        await this.exportarCsv();
      });
    }
  }

  /**
   * Solicita el informe a la API y actualiza la vista
   */
  async cargarInforme() {
    this.setLoading(true);
    this.limpiarAlertas();

    try {
      const params = { periodo: this.periodo };
      if (this.periodo === 'personalizado') {
        const inicioInput = this.container.querySelector('#input-fecha-inicio');
        const finInput = this.container.querySelector('#input-fecha-fin');
        params.fechaInicio = inicioInput ? inicioInput.value : this.fechaInicio;
        params.fechaFin = finInput ? finInput.value : this.fechaFin;
      }

      const data = await SalesReportApiService.getSalesReport(params);
      this.reportData = data;
      this.actualizarUI(data);
    } catch (error) {
      this.mostrarAlerta(error.message || 'Error al cargar las estadísticas de ventas.', 'danger');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Exporta los datos del período seleccionado en archivo CSV
   */
  async exportarCsv() {
    const btnExportar = this.container.querySelector('#btn-exportar-csv');
    const textoOriginal = btnExportar ? btnExportar.innerHTML : '';
    if (btnExportar) {
      btnExportar.disabled = true;
      btnExportar.innerHTML = '⏳ Descargando...';
    }

    try {
      const params = { periodo: this.periodo };
      if (this.periodo === 'personalizado') {
        const inicioInput = this.container.querySelector('#input-fecha-inicio');
        const finInput = this.container.querySelector('#input-fecha-fin');
        params.fechaInicio = inicioInput ? inicioInput.value : this.fechaInicio;
        params.fechaFin = finInput ? finInput.value : this.fechaFin;
      }

      await SalesReportApiService.exportSalesCsv(params);
      this.mostrarAlerta('Archivo CSV descargado correctamente.', 'success');
    } catch (error) {
      this.mostrarAlerta(error.message || 'Error al exportar los datos a CSV.', 'danger');
    } finally {
      if (btnExportar) {
        btnExportar.disabled = false;
        btnExportar.innerHTML = textoOriginal;
      }
    }
  }

  /**
   * Actualiza los elementos visuales del cuadro de mando con los datos recibidos
   */
  actualizarUI(data) {
    const { resumen, rankingTop5 = [] } = data;

    // Tarjetas KPI
    const kpiFacturacion = this.container.querySelector('#kpi-facturacion');
    const kpiPeriodoLabel = this.container.querySelector('#kpi-periodo-label');
    const kpiPedidos = this.container.querySelector('#kpi-pedidos');
    const kpiTicket = this.container.querySelector('#kpi-ticket');

    if (kpiFacturacion) kpiFacturacion.textContent = resumen.facturacionFormateada || '0,00 €';
    if (kpiPeriodoLabel) kpiPeriodoLabel.textContent = resumen.periodoEtiqueta || '';
    if (kpiPedidos) kpiPedidos.textContent = String(resumen.recuentoPedidos || 0);

    if (kpiTicket) {
      const pedidos = Number(resumen.recuentoPedidos) || 0;
      const total = Number(resumen.facturacionTotal) || 0;
      const ticketMedio = pedidos > 0 ? (total / pedidos) : 0;
      const numFormatted = ticketMedio.toFixed(2).replace('.', ',');
      kpiTicket.textContent = `${numFormatted} €`;
    }

    // Tabla de Ranking Top 5
    const tbody = this.container.querySelector('#ranking-tbody');
    if (!tbody) return;

    if (!rankingTop5 || rankingTop5.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            <em>No se registraron ventas en el período seleccionado.</em>
          </td>
        </tr>
      `;
      return;
    }

    const puestosIconos = {
      1: '🥇 1º',
      2: '🥈 2º',
      3: '🥉 3º',
      4: '4º',
      5: '5º'
    };

    tbody.innerHTML = rankingTop5.map(item => `
      <tr class="ranking-row position-${item.posicion}">
        <td class="text-center font-weight-bold">
          <span class="position-badge badge-${item.posicion}">
            ${puestosIconos[item.posicion] || `${item.posicion}º`}
          </span>
        </td>
        <td>
          <strong>${this.escapeHtml(item.titulo)}</strong>
        </td>
        <td class="text-muted">
          ${this.escapeHtml(item.artesano)}
        </td>
        <td class="text-right font-weight-bold">
          ${item.unidadesVendidas} ${item.unidadesVendidas === 1 ? 'unidad' : 'unidades'}
        </td>
        <td class="text-right text-success font-weight-bold">
          ${item.facturacionFormateada}
        </td>
      </tr>
    `).join('');
  }

  /**
   * Muestra u oculta el indicador de carga
   */
  setLoading(loading) {
    this.isLoading = loading;
    const btnRefrescar = this.container.querySelector('#btn-refrescar');
    if (btnRefrescar) {
      btnRefrescar.disabled = loading;
      btnRefrescar.innerHTML = loading ? '⏳ Cargando...' : '🔄 Actualizar';
    }
  }

  /**
   * Muestra un mensaje de alerta en la interfaz
   */
  mostrarAlerta(mensaje, tipo = 'info') {
    const alertsContainer = this.container.querySelector('#sales-alerts-container');
    if (!alertsContainer) return;

    alertsContainer.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible" role="alert">
        <span>${this.escapeHtml(mensaje)}</span>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Cerrar">&times;</button>
      </div>
    `;

    // Auto-ocultar tras 5 segundos
    setTimeout(() => {
      if (alertsContainer.firstElementChild) {
        alertsContainer.innerHTML = '';
      }
    }, 5000);
  }

  limpiarAlertas() {
    const alertsContainer = this.container.querySelector('#sales-alerts-container');
    if (alertsContainer) alertsContainer.innerHTML = '';
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
