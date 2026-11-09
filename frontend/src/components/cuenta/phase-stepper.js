/**
 * Componente visual de trazador de fases de pedido (Feature 004)
 * Renderiza una barra secuencial de 4 pasos: Pendiente -> Pagado -> Salido de la tienda -> Entregado
 */
export class PhaseStepper {
  /**
   * Determina el índice numérico del paso activo (1 a 4)
   */
  static getPhaseIndex(estado) {
    switch (estado) {
      case 'pendiente':
        return 1;
      case 'pagado':
      case 'en_preparacion':
        return 2;
      case 'salido_tienda':
      case 'salido de la tienda':
        return 3;
      case 'entregado':
        return 4;
      default:
        return 2;
    }
  }

  /**
   * Genera el HTML del stepper para un pedido dado
   * @param {Object} pedido - Objeto de pedido con estado y tracking
   * @returns {string} HTML renderizable
   */
  static render(pedido) {
    const estado = pedido.fase || pedido.estado || 'pagado';
    const activeStep = this.getPhaseIndex(estado);
    const tracking = pedido.numeroSeguimiento || pedido.envio?.numeroSeguimiento;
    const transportista = pedido.transportista || pedido.envio?.transportista;

    const steps = [
      { num: 1, label: 'Pendiente', desc: 'Esperando cobro' },
      { num: 2, label: 'Pagado', desc: estado === 'en_preparacion' ? 'En preparación en taller' : 'Pago confirmado' },
      { num: 3, label: 'Salido de la tienda', desc: 'Enviado con transportista' },
      { num: 4, label: 'Entregado', desc: 'Recepción confirmada' }
    ];

    const stepsHtml = steps.map(s => {
      let statusClass = 'pending';
      if (s.num < activeStep) {
        statusClass = 'completed';
      } else if (s.num === activeStep) {
        statusClass = 'active';
      }

      return `
        <div class="stepper-step ${statusClass}" data-step="${s.num}">
          <div class="stepper-circle">
            ${s.num < activeStep ? '✓' : s.num}
          </div>
          <div class="stepper-label">
            <span class="step-title">${s.label}</span>
            <span class="step-desc">${s.desc}</span>
          </div>
        </div>
      `;
    }).join('<div class="stepper-connector"></div>');

    let trackingHtml = '';
    if (tracking && activeStep >= 3) {
      trackingHtml = `
        <div class="tracking-info-box">
          <div class="tracking-icon">📦</div>
          <div class="tracking-details">
            <span class="tracking-title">Código de seguimiento:</span>
            <strong class="tracking-code">${tracking}</strong>
            ${transportista ? `<span class="tracking-carrier">Transportista: ${transportista}</span>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="phase-stepper-container">
        <div class="stepper-bar">
          ${stepsHtml}
        </div>
        ${trackingHtml}
      </div>
    `;
  }
}
