/**
 * Cabecera común de la tienda (Feature 009, FR-002)
 * Muestra el enlace "Administración" (#nav-admin) solo al rol administrador.
 * La cabecera es HTML estático en cada página; este módulo solo gestiona la visibilidad del enlace.
 * Las páginas de administración ya lo sirven visible y no se modifica.
 */
import { AccountApiService } from '../services/account-api.service.js';

const navAdmin = document.getElementById('nav-admin');

if (navAdmin && navAdmin.hidden) {
  const accountService = new AccountApiService();
  try {
    const usuario = accountService.isAuthenticated()
      ? await accountService.getMe()
      : null;
    navAdmin.hidden = usuario?.rol !== 'admin';
  } catch {
    navAdmin.hidden = true;
  }
}
