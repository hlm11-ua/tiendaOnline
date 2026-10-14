import { CardTokenizerService } from '../services/card-tokenizer.service.js';

/**
 * Componente: Formulario de Pago y Datos de Comprador Invitado
 * Integra la captura de datos personales, tarjeta bancaria, detección de marca,
 * tokenización en cliente (PCI-DSS) y protección contra doble clic.
 */
export class CheckoutForm {
  constructor({ containerId, onSubmit, onCartChange }) {
    this.container = document.getElementById(containerId);
    this.onSubmit = onSubmit;
    this.onCartChange = onCartChange;
    this.cartItems = [];
    this.total = 0;
    this.sesionPagoId = null;
    this.isSubmitting = false;
  }

  /**
   * Actualiza los datos de la cesta y el total mostrado
   */
  setSessionData({ sesionPagoId, items, total }) {
    this.sesionPagoId = sesionPagoId;
    this.cartItems = items || [];
    this.total = total || 0;
    this.render();
  }

  /**
   * Muestra un mensaje de error en la alerta superior del formulario
   */
  showError(mensaje) {
    const errorBox = this.container.querySelector('#checkout-error-box');
    if (errorBox) {
      errorBox.textContent = mensaje;
      errorBox.classList.remove('hidden');
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    this.setSubmitting(false);
  }

  /**
   * Oculta el mensaje de error
   */
  clearError() {
    const errorBox = this.container.querySelector('#checkout-error-box');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
  }

  /**
   * Controla el estado del botón de pago (evita doble clic)
   */
  setSubmitting(submitting) {
    this.isSubmitting = submitting;
    const btn = this.container.querySelector('#btn-submit-pago');
    if (btn) {
      btn.disabled = submitting;
      if (submitting) {
        btn.innerHTML = '<span class="spinner-sm"></span> Procesando pago seguro...';
      } else {
        const totalFormateado = `${Number(this.total).toFixed(2).replace('.', ',')} €`;
        btn.innerHTML = `🔒 Pagar ${totalFormateado}`;
      }
    }
  }

  /**
   * Rellena rápidamente campos con una de las tarjetas de prueba del Quickstart
   */
  fillTestCard(pan, expiry, cvv, nombre) {
    const panInput = this.container.querySelector('#input-card-pan');
    const expiryInput = this.container.querySelector('#input-card-expiry');
    const cvvInput = this.container.querySelector('#input-card-cvv');
    const holderInput = this.container.querySelector('#input-card-holder');
    const nameInput = this.container.querySelector('#input-cliente-nombre');
    const emailInput = this.container.querySelector('#input-cliente-email');

    if (panInput) panInput.value = pan;
    if (expiryInput) expiryInput.value = expiry;
    if (cvvInput) cvvInput.value = cvv;
    if (holderInput) holderInput.value = nombre || 'Lucía Ramos';
    if (nameInput && !nameInput.value) nameInput.value = nombre || 'Lucía Ramos';
    if (emailInput && !emailInput.value) emailInput.value = 'lucia.ramos@example.es';

    // Disparar evento input para formatear y detectar marca
    if (panInput) {
      panInput.dispatchEvent(new Event('input'));
    }
  }

  render() {
    if (!this.container) return;

    const totalFormateado = `${Number(this.total).toFixed(2).replace('.', ',')} €`;

    this.container.innerHTML = `
      <section class="checkout-card" aria-labelledby="form-heading">
        <div class="card-header">
          <h2 id="form-heading" class="card-title">Datos del Comprador y Pago con Tarjeta</h2>
          <p class="card-subtitle">Introduce tus datos de envío y pago seguro. Sin necesidad de registrarte.</p>
        </div>

        <div id="checkout-error-box" class="alert alert-error hidden" role="alert"></div>

        <!-- Asistente de tarjetas de prueba del Quickstart -->
        <div class="test-cards-panel">
          <div class="test-cards-title">
            <span class="icon">🧪</span>
            <span>Tarjetas de Prueba para Validación Rápida:</span>
          </div>
          <div class="test-cards-buttons">
            <button type="button" class="btn-test-card" id="btn-test-direct" title="Escenario 1: Pago directo autorizado <= 100 €">
              ✅ Tarjeta Directa (4242)
            </button>
            <button type="button" class="btn-test-card" id="btn-test-3ds" title="Escenario 2: Desafío 3D Secure > 100 €">
              🛡️ Tarjeta 3DS (3000)
            </button>
            <button type="button" class="btn-test-card" id="btn-test-funds" title="Escenario 3: Fondos insuficientes">
              ⛔ Sin Fondos (0101)
            </button>
            <button type="button" class="btn-test-card" id="btn-test-denied" title="Escenario 3B: Tarjeta denegada/bloqueada">
              🚫 Denegada (0180)
            </button>
          </div>
        </div>

        <form id="form-checkout-payment" novalidate>
          <!-- Datos personales (Invitado) -->
          <fieldset class="form-fieldset">
            <legend class="fieldset-legend">1. Información de Contacto</legend>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="input-cliente-nombre" class="form-label">Nombre y apellidos *</label>
                <input
                  type="text"
                  id="input-cliente-nombre"
                  name="clienteNombre"
                  class="form-input"
                  placeholder="Lucía Ramos"
                  required
                  autocomplete="name"
                />
              </div>

              <div class="form-group flex-1">
                <label for="input-cliente-email" class="form-label">Correo electrónico *</label>
                <input
                  type="email"
                  id="input-cliente-email"
                  name="clienteEmail"
                  class="form-input"
                  placeholder="lucia.ramos@example.es"
                  required
                  autocomplete="email"
                />
              </div>
            </div>
          </fieldset>

          <!-- Datos de tarjeta bancaria -->
          <fieldset class="form-fieldset">
            <legend class="fieldset-legend">2. Tarjeta de Crédito o Débito</legend>

            <div class="card-visual-preview" id="card-preview">
              <div class="preview-brand" id="preview-card-brand">Tarjeta Bancaria</div>
              <div class="preview-chip"></div>
              <div class="preview-pan" id="preview-card-pan">•••• •••• •••• ••••</div>
              <div class="preview-footer">
                <div class="preview-holder">
                  <span class="preview-label">TITULAR</span>
                  <span id="preview-card-holder">NOMBRE Y APELLIDOS</span>
                </div>
                <div class="preview-expiry">
                  <span class="preview-label">CADUCA</span>
                  <span id="preview-card-expiry">MM/AA</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="input-card-pan" class="form-label">Número de tarjeta *</label>
              <div class="input-with-badge">
                <input
                  type="text"
                  id="input-card-pan"
                  name="pan"
                  class="form-input font-mono"
                  placeholder="4242 4242 4242 4242"
                  maxlength="23"
                  inputmode="numeric"
                  autocomplete="cc-number"
                  required
                />
                <span class="brand-badge" id="card-brand-badge">Bancaria</span>
              </div>
            </div>

            <div class="form-group">
              <label for="input-card-holder" class="form-label">Nombre del titular *</label>
              <input
                type="text"
                id="input-card-holder"
                name="titular"
                class="form-input"
                placeholder="Como figura en la tarjeta"
                required
                autocomplete="cc-name"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="input-card-expiry" class="form-label">Caducidad (MM/AA) *</label>
                <input
                  type="text"
                  id="input-card-expiry"
                  name="expiry"
                  class="form-input font-mono text-center"
                  placeholder="12/28"
                  maxlength="5"
                  inputmode="numeric"
                  autocomplete="cc-exp"
                  required
                />
              </div>

              <div class="form-group flex-1">
                <label for="input-card-cvv" class="form-label">CVV / CVC *</label>
                <input
                  type="password"
                  id="input-card-cvv"
                  name="cvv"
                  class="form-input font-mono text-center"
                  placeholder="123"
                  maxlength="4"
                  inputmode="numeric"
                  autocomplete="cc-csc"
                  required
                />
              </div>
            </div>

            <div class="security-guarantee-note">
              <span class="lock-icon">🔒</span>
              <span>
                <strong>Pago 100% Seguro:</strong> Los datos de tu tarjeta se tokenizan en tu navegador mediante cifrado TLS y nunca son almacenados en los servidores de la tienda (Cumplimiento PCI-DSS).
              </span>
            </div>
          </fieldset>

          <div class="form-submit-wrapper">
            <button
              type="submit"
              class="btn btn-primary btn-submit-pay"
              id="btn-submit-pago"
              ${this.isSubmitting ? 'disabled' : ''}
            >
              🔒 Pagar ${totalFormateado}
            </button>
          </div>
        </form>
      </section>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const form = this.container.querySelector('#form-checkout-payment');
    const panInput = this.container.querySelector('#input-card-pan');
    const expiryInput = this.container.querySelector('#input-card-expiry');
    const cvvInput = this.container.querySelector('#input-card-cvv');
    const holderInput = this.container.querySelector('#input-card-holder');
    const brandBadge = this.container.querySelector('#card-brand-badge');

    const previewPan = this.container.querySelector('#preview-card-pan');
    const previewBrand = this.container.querySelector('#preview-card-brand');
    const previewHolder = this.container.querySelector('#preview-card-holder');
    const previewExpiry = this.container.querySelector('#preview-card-expiry');

    // Botones de tarjetas de prueba
    const btnTestDirect = this.container.querySelector('#btn-test-direct');
    const btnTest3ds = this.container.querySelector('#btn-test-3ds');
    const btnTestFunds = this.container.querySelector('#btn-test-funds');
    const btnTestDenied = this.container.querySelector('#btn-test-denied');

    if (btnTestDirect) {
      btnTestDirect.addEventListener('click', () => {
        this.fillTestCard('4242 4242 4242 4242', '12/28', '123', 'Lucía Ramos');
      });
    }

    if (btnTest3ds) {
      btnTest3ds.addEventListener('click', () => {
        this.fillTestCard('4000 0000 0000 3000', '12/28', '123', 'Marcos Ortiz');
      });
    }

    if (btnTestFunds) {
      btnTestFunds.addEventListener('click', () => {
        this.fillTestCard('4000 0000 0000 0101', '12/28', '123', 'Elena Gómez');
      });
    }

    if (btnTestDenied) {
      btnTestDenied.addEventListener('click', () => {
        this.fillTestCard('4000 0000 0000 0180', '12/28', '123', 'Javier Beltrán');
      });
    }

    // Formateo y detección de PAN
    if (panInput) {
      panInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 19) value = value.slice(0, 19);

        // Agrupar de 4 en 4
        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formatted;

        const brand = CardTokenizerService.detectBrand(value);
        if (brandBadge) brandBadge.textContent = brand;
        if (previewBrand) previewBrand.textContent = brand;
        if (previewPan) previewPan.textContent = formatted || '•••• •••• •••• ••••';
      });
    }

    // Titular en vista previa
    if (holderInput) {
      holderInput.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        if (previewHolder) previewHolder.textContent = val || 'NOMBRE Y APELLIDOS';
      });
    }

    // Formateo de fecha MM/AA
    if (expiryInput) {
      expiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 3) {
          val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
        }
        e.target.value = val;
        if (previewExpiry) previewExpiry.textContent = val || 'MM/AA';
      });
    }

    // Envío del formulario
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.clearError();

        if (this.isSubmitting) return;

        const clienteNombre = this.container.querySelector('#input-cliente-nombre')?.value.trim();
        const clienteEmail = this.container.querySelector('#input-cliente-email')?.value.trim();
        const pan = panInput?.value || '';
        const expiry = expiryInput?.value || '';
        const cvv = cvvInput?.value || '';
        const titular = holderInput?.value || '';

        // Validaciones básicas de campos
        if (!clienteNombre) {
          this.showError('Por favor, introduce tu nombre y apellidos.');
          return;
        }

        if (!clienteEmail || !clienteEmail.includes('@') || !clienteEmail.includes('.')) {
          this.showError('Por favor, introduce un correo electrónico válido.');
          return;
        }

        // Tokenización en cliente con comprobación de Luhn y caducidad
        let tokenResult;
        try {
          tokenResult = CardTokenizerService.tokenize({ pan, expiry, cvv, titular });
        } catch (tokenErr) {
          this.showError(tokenErr.message);
          return;
        }

        this.setSubmitting(true);

        if (this.onSubmit) {
          this.onSubmit({
            sesionPagoId: this.sesionPagoId,
            clienteNombre,
            clienteEmail,
            tokenTarjeta: tokenResult.token,
            cardInfo: {
              marca: tokenResult.marca,
              ultimosCuatro: tokenResult.ultimosCuatro
            }
          });
        }
      });
    }
  }
}
