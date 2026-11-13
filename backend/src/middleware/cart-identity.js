import { CONSTANTS } from '../config/constants.js';
import { store } from '../models/store.js';

/**
 * Resuelve la identidad del comprador para los endpoints del carrito (Feature 002 + 004).
 * Prioridad:
 *  1. Token de sesión persistente de la cuenta (Feature 004) vía cabecera
 *     `Authorization: Bearer <token>` o `x-session-token`.
 *  2. Cabecera `x-usuario-id` (simulación de sesión para pruebas, contrato cart-api.yaml).
 * Si no hay identidad, la petición se trata como comprador anónimo.
 */
export function resolveCartIdentity(req, res, next) {
  let token = req.headers['x-session-token'] || null;
  const authHeader = req.headers['authorization'];

  if (!token && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    // Se ignora el token literal "admin" usado en pruebas de autorización dual
    if (rawToken && rawToken.toLowerCase() !== CONSTANTS.ROLES.ADMIN) {
      token = rawToken;
    }
  }

  if (token) {
    const session = store.getSessionByToken(token);
    if (session && session.isValid()) {
      const account = store.getAccountById(session.cuentaId);
      if (account) {
        session.touch();
        req.usuarioId = account.id;
        return next();
      }
    }
  }

  const headerUsuarioId = req.headers['x-usuario-id'];
  req.usuarioId = headerUsuarioId && String(headerUsuarioId).trim() !== ''
    ? String(headerUsuarioId).trim()
    : null;

  return next();
}
