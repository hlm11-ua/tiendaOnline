/**
 * Componente: Modal de verificación bancaria reforzada 3D Secure (PSD2)
 * Se despliega cuando el importe supera el umbral de 100 € o la entidad emisora
 * solicita un segundo factor de autenticación.
 */
export class Payment3DSModal {
  constructor({ containerId, onConfirm, onCancel }) {
    this.container = document.getElementById(containerId);
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.transaccionId = null;
    this.desafio = null;
  }

  /**
   * Abre el modal de desafío 3DS con los datos de la transacción
   */
  open({ transaccionId, desafio3ds }) {
    this.transaccionId = transaccionId;
    this.desafio = desafio3ds || {};
    this.render();
  }

  /**
   * Cierra y limpia el modal
   */
  close() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.remove('modal-open');
    }
  }

  /**
   * Muestra un mensaje de error dentro del modal (ej. código erróneo)
   */
  showError(mensaje) {
    const errorBox = this.container.querySelector('#error-box-3ds');
    if (errorBox) {
      errorBox.textContent = mensaje;
      errorBox.classList.remove('hidden');
    }
    const submitBtn = this.container.querySelector('#btn-confirmar-3ds');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Confirmar Identidad';
    }
  }

  render() {
    if (!this.container) return;

    this.container.classList.add('modal-open');
    const mensajeBancario = this.desafio.mensaje || 'Introduce el código SMS o generado en tu app bancaria para confirmar la compra.';
    const tarjeta = this.desafio.tarjeta || '**** **** **** 3000';
    const importe = this.desafio.importe != null ? `${Number(this.desafio.importe).toFixed(2).replace('.', ',')} €` : '';

    this.container.innerHTML = `
      <div class="modal-backdrop" id="backdrop-3ds">
        <div class="modal-card modal-3ds-card" role="dialog" aria-modal="true" aria-labelledby="titulo-3ds">
          <div class="modal-header">
            <div class="bank-shield-badge">
              <span class="shield-icon">🛡️</span>
              <span class="bank-label">Verificación Segura 3D Secure</span>
            </div>
            <button type="button" class="btn-close-modal" id="btn-cerrar-3ds" aria-label="Cancelar verificación">✕</button>
          </div>

          <div class="modal-body">
            <h2 id="titulo-3ds" class="modal-title">Autenticación Bancaria Reforzada</h2>
            <p class="modal-description">${mensajeBancario}</p>

            <div class="summary-box-3ds">
              <div class="summary-row">
                <span class="label">Tarjeta emisora:</span>
                <span class="value font-mono" id="label-tarjeta-3ds">${tarjeta}</span>
              </div>
              ${
                importe
                  ? `<div class="summary-row">
                      <span class="label">Importe a autorizar:</span>
                      <span class="value font-bold" id="label-importe-3ds">${importe}</span>
                    </div>`
                  : ''
              }
            </div>

            <div class="test-helper-3ds">
              <span class="helper-icon">💡</span>
              <span><strong>Tarjeta de prueba demo:</strong> Código de verificación autorizado: <code>1234</code></span>
              <button type="button" class="btn-quick-fill" id="btn-quick-fill-otp">Pegar 1234</button>
            </div>

            <form id="form-3ds-challenge" onsubmit="return false;">
              <div class="form-group">
                <label for="input-otp-3ds" class="form-label">Código de seguridad (SMS / App):</label>
                <input
                  type="text"
                  id="input-otp-3ds"
                  name="codigoOtp"
                  class="form-input text-center font-mono input-otp"
                  placeholder="1234"
                  maxlength="6"
                  autocomplete="one-time-code"
                  required
                  autofocus
                />
              </div>

              <div id="error-box-3ds" class="alert alert-error hidden" role="alert"></div>

              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="btn-cancelar-3ds">
                  Cancelar Operación
                </button>
                <button type="submit" class="btn btn-primary" id="btn-confirmar-3ds">
                  Confirmar Identidad
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Asignación de manejadores de eventos
    const form = this.container.querySelector('#form-3ds-challenge');
    const otpInput = this.container.querySelector('#input-otp-3ds');
    const closeBtn = this.container.querySelector('#btn-cerrar-3ds');
    const cancelBtn = this.container.querySelector('#btn-cancelar-3ds');
    const quickFillBtn = this.container.querySelector('#btn-quick-fill-otp');
    const submitBtn = this.container.querySelector('#btn-confirmar-3ds');

    if (otpInput) {
      setTimeout(() => otpInput.focus(), 100);
    }

    if (quickFillBtn) {
      quickFillBtn.addEventListener('click', () => {
        otpInput.value = '1234';
        otpInput.focus();
      });
    }

    const handleCancel = () => {
      this.close();
      if (this.onCancel) {
        this.onCancel();
      }
    };

    if (closeBtn) closeBtn.addEventListener('click', handleCancel);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const otpValue = otpInput.value.trim();
        if (!otpValue) {
          this.showError('Por favor, introduce el código de verificación.');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-sm"></span> Verificando con tu banco...';

        if (this.onConfirm) {
          this.onConfirm({
            transaccionId: this.transaccionId,
            codigoOtp: otpValue
          });
        }
      });
    }
  }
}
