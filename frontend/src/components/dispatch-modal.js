/**
 * Componente: Modal interactivo para despacho con transportista y rectificación de tracking (FR-003, Edge Cases)
 */
export class DispatchModal {
  constructor({ containerId, onConfirm, onCancel }) {
    this.container = document.getElementById(containerId);
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.isOpen = false;
  }

  /**
   * Abre el modal en modo despacho o modo rectificación
   * @param {Object} options
   * @param {Object} options.pedido
   * @param {Array<string>} options.transportistas
   * @param {boolean} [options.isRectification=false]
   */
  open({ pedido, transportistas = [], isRectification = false }) {
    if (!this.container || !pedido) return;
    this.isOpen = true;

    const title = isRectification
      ? '✏️ Rectificar Número de Seguimiento'
      : '🚚 Despachar Envío y Notificar al Comprador';

    const submitBtnText = isRectification
      ? 'Guardar Rectificación y Notificar'
      : 'Confirmar y Notificar Salida';

    const initialCarrier = pedido.envio?.transportista || transportistas[0] || 'Correos de España';
    const initialTracking = isRectification ? (pedido.envio?.numeroSeguimiento || '') : '';

    const carrierOptionsHtml = transportistas
      .map(
        t => `<option value="${t}" ${t === initialCarrier ? 'selected' : ''}>${t}</option>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="modal-backdrop" id="dispatch-backdrop" role="presentation"></div>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dispatch-modal-title">
        <header class="modal-header">
          <h3 id="dispatch-modal-title" class="modal-title font-bold">${title}</h3>
          <button type="button" class="btn-close" id="btn-close-dispatch-modal" aria-label="Cerrar modal">✕</button>
        </header>

        <form id="form-despacho" class="modal-body" novalidate>
          <div class="modal-order-summary">
            <span class="text-xs text-muted">Pedido:</span>
            <strong class="font-mono">${pedido.codigoReferencia}</strong>
            <span class="text-xs text-muted">(${pedido.clienteNombre} - ${Number(pedido.total).toFixed(2).replace('.', ',')} €)</span>
          </div>

          <div id="modal-dispatch-error" class="alert alert-error hidden" role="alert"></div>

          <div class="form-group">
            <label for="select-transportista" class="form-label font-medium">
              Empresa de Transporte / Mensajería: <span class="required">*</span>
            </label>
            <select id="select-transportista" class="form-select" required>
              ${carrierOptionsHtml}
            </select>
          </div>

          <div class="form-group">
            <label for="input-tracking" class="form-label font-medium">
              Número de Seguimiento del Paquete: <span class="required">*</span>
            </label>
            <input 
              type="text" 
              id="input-tracking" 
              class="form-input font-mono" 
              placeholder="Ej: CORREOS-ES-998877" 
              value="${initialTracking}"
              maxlength="32" 
              required
              aria-describedby="tracking-helper-text"
            />
            <small id="tracking-helper-text" class="form-helper-text">
              Código alfanumérico entre 6 y 32 caracteres (letras, números y guiones).
            </small>
          </div>

          <div class="form-group">
            <label for="input-notas" class="form-label font-medium">
              ${isRectification ? 'Motivo de la corrección:' : 'Notas de empaquetado (opcional):'}
            </label>
            <textarea 
              id="input-notas" 
              class="form-textarea" 
              rows="2" 
              placeholder="${isRectification ? 'Ej: Corrección por sustitución de etiqueta dañada' : 'Ej: Pieza embalada con doble protección de cartón reciclado'}"
            ></textarea>
          </div>

          <footer class="modal-actions">
            <button type="button" class="btn btn-secondary" id="btn-cancelar-despacho">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" id="btn-submit-despacho">
              ${submitBtnText}
            </button>
          </footer>
        </form>
      </div>
    `;

    this.bindEvents(pedido, isRectification);
  }

  close() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.isOpen = false;
  }

  showError(mensaje) {
    const errorEl = this.container.querySelector('#modal-dispatch-error');
    if (errorEl) {
      errorEl.textContent = mensaje;
      errorEl.classList.remove('hidden');
    }
  }

  bindEvents(pedido, isRectification) {
    const backdrop = this.container.querySelector('#dispatch-backdrop');
    const closeBtn = this.container.querySelector('#btn-close-dispatch-modal');
    const cancelBtn = this.container.querySelector('#btn-cancelar-despacho');
    const form = this.container.querySelector('#form-despacho');
    const trackingInput = this.container.querySelector('#input-tracking');
    const carrierSelect = this.container.querySelector('#select-transportista');
    const notasInput = this.container.querySelector('#input-notas');

    const handleClose = () => {
      this.close();
      if (this.onCancel) this.onCancel();
    };

    if (backdrop) backdrop.addEventListener('click', handleClose);
    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleClose);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const transportista = carrierSelect.value.trim();
        const numeroSeguimiento = trackingInput.value.trim();
        const notas = notasInput.value.trim();

        // Validación en cliente en español
        if (!transportista) {
          this.showError('Debe seleccionar una empresa de transporte obligatoriamente.');
          return;
        }

        if (numeroSeguimiento.length < 6 || numeroSeguimiento.length > 32) {
          this.showError('El número de seguimiento debe tener entre 6 y 32 caracteres alfanuméricos.');
          return;
        }

        const pattern = /^[A-Za-z0-9\-_]{6,32}$/;
        if (!pattern.test(numeroSeguimiento)) {
          this.showError('El código solo puede contener caracteres alfanuméricos, guiones (-) o guiones bajos (_).');
          return;
        }

        if (this.onConfirm) {
          this.onConfirm({
            pedido,
            isRectification,
            transportista,
            numeroSeguimiento,
            notas
          });
        }
      });
    }

    // Cerrar con Escape
    const escListener = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        handleClose();
        document.removeEventListener('keydown', escListener);
      }
    };
    document.addEventListener('keydown', escListener);
  }
}
