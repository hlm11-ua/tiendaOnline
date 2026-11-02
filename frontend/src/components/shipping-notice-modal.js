/**
 * Componente: Visor modal de correos electrónicos y avisos de envío emitidos (Principio IV)
 * Permite a evaluadores, administradores y clientes inspeccionar el aviso exacto en menos de 1 segundo.
 */
export class ShippingNoticeModal {
  constructor({ containerId, onClose }) {
    this.container = document.getElementById(containerId);
    this.onClose = onClose;
    this.isOpen = false;
  }

  static formatDate(isoDate) {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  static getTipoLabel(tipo) {
    switch (tipo) {
      case 'salida_almacen':
        return '<span class="badge badge-shipped">🚚 Salida de Almacén</span>';
      case 'rectificacion_tracking':
        return '<span class="badge badge-prep">✏️ Rectificación de Tracking</span>';
      case 'confirmacion_entrega':
        return '<span class="badge badge-delivered">🎉 Entrega Confirmada</span>';
      default:
        return `<span class="badge badge-default">${tipo}</span>`;
    }
  }

  open({ codigoReferencia, avisos = [] }) {
    if (!this.container) return;
    this.isOpen = true;

    const noticesHtml = avisos.length === 0
      ? `<div class="empty-notices text-center text-muted py-4">Aún no se ha emitido ninguna notificación para este pedido.</div>`
      : avisos.map((aviso, idx) => {
          const badge = ShippingNoticeModal.getTipoLabel(aviso.tipo);
          const fecha = ShippingNoticeModal.formatDate(aviso.fechaEmision);

          return `
            <article class="notice-card" aria-labelledby="notice-heading-${idx}">
              <header class="notice-card-header">
                <div class="notice-card-title-group">
                  ${badge}
                  <h4 id="notice-heading-${idx}" class="notice-subject font-bold text-sm">${aviso.asunto}</h4>
                </div>
                <time class="notice-time text-xs text-muted" datetime="${aviso.fechaEmision}">${fecha}</time>
              </header>

              <div class="notice-meta-grid text-xs">
                <div><strong>Destinatario:</strong> ${aviso.destinatarioNombre} &lt;${aviso.destinatarioEmail}&gt;</div>
                <div><strong>Canal:</strong> Correo electrónico simulado (observable)</div>
                <div><strong>Transportista:</strong> ${aviso.transportista}</div>
                <div><strong>Tracking:</strong> <code class="font-mono font-bold">${aviso.numeroSeguimiento}</code></div>
              </div>

              <div class="email-mockup-wrapper">
                <div class="email-mockup-bar">
                  <span class="dot dot-red"></span>
                  <span class="dot dot-yellow"></span>
                  <span class="dot dot-green"></span>
                  <span class="email-client-title">Buzón de Correo Simulado</span>
                </div>
                <pre class="email-body-text font-mono">${aviso.cuerpoTexto}</pre>
              </div>
            </article>
          `;
        }).join('');

    this.container.innerHTML = `
      <div class="modal-backdrop" id="notice-backdrop" role="presentation"></div>
      <div class="modal-card modal-large" role="dialog" aria-modal="true" aria-labelledby="notice-modal-title">
        <header class="modal-header">
          <div>
            <h3 id="notice-modal-title" class="modal-title font-bold">✉️ Registro de Avisos Emitidos (Email Simulado)</h3>
            <p class="text-xs text-muted">Auditoría observable de las comunicaciones automáticas para el pedido <strong class="font-mono text-primary">${codigoReferencia}</strong></p>
          </div>
          <button type="button" class="btn-close" id="btn-close-notice-modal" aria-label="Cerrar visor">✕</button>
        </header>

        <div class="modal-body notices-list-body">
          ${noticesHtml}
        </div>

        <footer class="modal-actions">
          <button type="button" class="btn btn-primary" id="btn-cerrar-notice-bottom">
            Cerrar Visor
          </button>
        </footer>
      </div>
    `;

    this.bindEvents();
  }

  close() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.isOpen = false;
  }

  bindEvents() {
    const backdrop = this.container.querySelector('#notice-backdrop');
    const closeBtn = this.container.querySelector('#btn-close-notice-modal');
    const closeBottomBtn = this.container.querySelector('#btn-cerrar-notice-bottom');

    const handleClose = () => {
      this.close();
      if (this.onClose) this.onClose();
    };

    if (backdrop) backdrop.addEventListener('click', handleClose);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (closeBottomBtn) closeBottomBtn.addEventListener('click', handleClose);

    const escListener = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        handleClose();
        document.removeEventListener('keydown', escListener);
      }
    };
    document.addEventListener('keydown', escListener);
  }
}
