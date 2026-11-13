/**
 * Componente interactivo para Iniciar Sesión y Crear Cuenta (Feature 004)
 */
import { CartStorageService } from '../../services/cart-storage.service.js';

export class AuthFormComponent {
  constructor({ container, accountService, onAuthSuccess, initialAlert = null }) {
    this.container = container;
    this.accountService = accountService;
    this.onAuthSuccess = onAuthSuccess;
    this.initialAlert = initialAlert;
    this.activeTab = 'login'; // 'login' | 'register'
  }

  render() {
    this.container.innerHTML = `
      <div class="auth-card">
        <div class="auth-tabs">
          <button type="button" class="tab-btn ${this.activeTab === 'login' ? 'active' : ''}" id="tab-login-btn">
            Iniciar sesión
          </button>
          <button type="button" class="tab-btn ${this.activeTab === 'register' ? 'active' : ''}" id="tab-register-btn">
            Crear cuenta
          </button>
        </div>

        <div id="auth-alert" class="alert-message hidden"></div>

        <div id="login-section" class="${this.activeTab === 'login' ? '' : 'hidden'}">
          <form id="login-form" novalidate>
            <div class="form-group">
              <label for="login-email">Correo electrónico</label>
              <input type="email" id="login-email" name="email" required autocomplete="email" placeholder="ejemplo@artesania.es" />
            </div>
            <div class="form-group">
              <label for="login-password">Contraseña</label>
              <input type="password" id="login-password" name="password" required autocomplete="current-password" placeholder="Tu contraseña" />
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="btn-login-submit">
              Iniciar sesión
            </button>
          </form>
        </div>

        <div id="register-section" class="${this.activeTab === 'register' ? '' : 'hidden'}">
          <form id="register-form" novalidate>
            <div class="form-group">
              <label for="register-name">Nombre completo</label>
              <input type="text" id="register-name" name="nombre" required placeholder="Elena García" />
            </div>
            <div class="form-group">
              <label for="register-email">Correo electrónico</label>
              <input type="email" id="register-email" name="email" required autocomplete="email" placeholder="ejemplo@artesania.es" />
            </div>
            <div class="form-group">
              <label for="register-password">Contraseña (mínimo 8 caracteres)</label>
              <input type="password" id="register-password" name="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
              <small class="field-hint">La contraseña debe tener al menos 8 caracteres.</small>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="btn-register-submit">
              Crear cuenta personal
            </button>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();

    if (this.initialAlert) {
      this.showAlert(this.initialAlert, 'info');
    }
  }

  bindEvents() {
    const tabLogin = this.container.querySelector('#tab-login-btn');
    const tabRegister = this.container.querySelector('#tab-register-btn');
    const loginForm = this.container.querySelector('#login-form');
    const registerForm = this.container.querySelector('#register-form');

    tabLogin.addEventListener('click', () => this.switchTab('login'));
    tabRegister.addEventListener('click', () => this.switchTab('register'));

    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    registerForm.addEventListener('submit', (e) => this.handleRegister(e));
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.clearAlert();

    const tabLogin = this.container.querySelector('#tab-login-btn');
    const tabRegister = this.container.querySelector('#tab-register-btn');
    const loginSec = this.container.querySelector('#login-section');
    const registerSec = this.container.querySelector('#register-section');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginSec.classList.remove('hidden');
      registerSec.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerSec.classList.remove('hidden');
      loginSec.classList.add('hidden');
    }
  }

  showAlert(msg, type = 'error') {
    const alert = this.container.querySelector('#auth-alert');
    if (!alert) return;
    alert.textContent = msg;
    alert.className = `alert-message alert-${type}`;
    alert.classList.remove('hidden');
  }

  clearAlert() {
    const alert = this.container.querySelector('#auth-alert');
    if (alert) {
      alert.textContent = '';
      alert.className = 'alert-message hidden';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    this.clearAlert();

    const email = this.container.querySelector('#login-email').value.trim();
    const password = this.container.querySelector('#login-password').value;

    if (!email || !password) {
      this.showAlert('Por favor, introduce tu correo electrónico y contraseña.');
      return;
    }

    try {
      const data = await this.accountService.login({ email, password });
      await this.fusionarCarritoAnonimo(data.usuario);
      if (this.onAuthSuccess) {
        this.onAuthSuccess(data.usuario);
      }
    } catch (err) {
      this.showAlert(err.message || 'Error al iniciar sesión. Comprueba tus credenciales.');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    this.clearAlert();

    const nombre = this.container.querySelector('#register-name').value.trim();
    const email = this.container.querySelector('#register-email').value.trim();
    const password = this.container.querySelector('#register-password').value;

    if (!nombre) {
      this.showAlert('Por favor, indica tu nombre completo.');
      return;
    }
    if (!email || !email.includes('@')) {
      this.showAlert('Por favor, introduce un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 8) {
      this.showAlert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const data = await this.accountService.registro({ nombre, email, password });
      await this.fusionarCarritoAnonimo(data.usuario);
      if (this.onAuthSuccess) {
        this.onAuthSuccess(data.usuario);
      }
    } catch (err) {
      this.showAlert(err.message || 'Error al crear la cuenta. Comprueba los datos.');
    }
  }

  /**
   * FR-007 (Feature 002): al iniciar sesión o crear cuenta, la cesta anónima
   * del navegador se fusiona con el carrito de la cuenta del comprador
   */
  async fusionarCarritoAnonimo(usuario) {
    try {
      if (!usuario?.id) return;
      CartStorageService.setUsuarioId(usuario.id);
      await CartStorageService.fusionarConCuenta(usuario.id);
    } catch {
      // El inicio de sesión no se interrumpe aunque la fusión falle
    }
  }
}
