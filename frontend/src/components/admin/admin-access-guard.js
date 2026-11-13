/**
 * Control de acceso a las pantallas de administración (Features 004 + 006/008)
 * Verifica mediante la sesión real (GET /api/auth/me) que el visitante tenga
 * el rol 'admin'. En caso contrario muestra una pantalla de acceso restringido.
 * La protección de datos reales corre por cuenta del backend (requireAdminRole);
 * este guardia evita que un no administrador visualice la interfaz del panel.
 */
import { AccountApiService } from '/src/services/account-api.service.js';

const GUARD_STYLE_ID = 'admin-guard-styles';
const GUARD_PENDING_CLASS = 'admin-gate-pending';

const GUARD_CSS = `
  .admin-gate-pending main {
    display: none !important;
  }
  .admin-access-denied {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .admin-access-denied__card {
    max-width: 460px;
    width: 100%;
    text-align: center;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    color: #e2e8f0;
  }
  .admin-access-denied__icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  .admin-access-denied__title {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    color: #f8fafc;
  }
  .admin-access-denied__text {
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0 0 1.5rem;
    color: #94a3b8;
  }
  .admin-access-denied__actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .admin-access-denied__btn {
    display: inline-block;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    border: none;
    cursor: pointer;
  }
  .admin-access-denied__btn--secondary {
    background: rgba(148, 163, 184, 0.15);
    color: #e2e8f0;
  }
`;

function ensureStyles() {
  if (document.getElementById(GUARD_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GUARD_STYLE_ID;
  style.textContent = GUARD_CSS;
  document.head.appendChild(style);
}

/**
 * Comprueba si el visitante dispone de rol administrador
 * @returns {Promise<boolean>}
 */
export async function verificarRolAdministrador() {
  const accountService = new AccountApiService();
  try {
    if (!accountService.isAuthenticated()) return false;
    const usuario = await accountService.getMe();
    return usuario?.rol === 'admin';
  } catch {
    return false;
  }
}

/**
 * Sustituye el contenido principal por la pantalla de acceso restringido
 */
export function mostrarAccesoDenegado() {
  ensureStyles();
  document.documentElement.classList.remove(GUARD_PENDING_CLASS);

  const main = document.querySelector('main') || document.body;
  main.innerHTML = `
    <div class="admin-access-denied">
      <div class="admin-access-denied__card">
        <div class="admin-access-denied__icon" aria-hidden="true">🔒</div>
        <h1 class="admin-access-denied__title">Acceso restringido</h1>
        <p class="admin-access-denied__text">
          Esta sección está reservada al personal administrador de la tienda.
          Si eres administrador, inicia sesión con tu cuenta para continuar.
        </p>
        <div class="admin-access-denied__actions">
          <a class="admin-access-denied__btn" href="/cuenta">Iniciar sesión</a>
          <a class="admin-access-denied__btn admin-access-denied__btn--secondary" href="/catalogo">Volver al catálogo</a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Oculta el contenido principal hasta completar la verificación del rol,
 * evitando que el panel se muestre fugazmente a usuarios sin permisos
 */
export function ocultarContenidoDuranteVerificacion() {
  ensureStyles();
  document.documentElement.classList.add(GUARD_PENDING_CLASS);
}

/**
 * Permite de nuevo el contenido principal tras conceder el acceso
 */
export function permitirContenido() {
  document.documentElement.classList.remove(GUARD_PENDING_CLASS);
}
