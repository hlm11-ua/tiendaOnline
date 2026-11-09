import { CONSTANTS } from '../config/constants.js';
import { store } from '../models/store.js';

/**
 * Middleware para restringir acceso exclusivamente a usuarios con rol de administrador/empresa (FR-001, FR-007)
 * Soporta autorización dual: cabecera de control (x-user-role / Bearer admin) y tokens de sesión de usuario admin
 */
export function requireAdminRole(req, res, next) {
  const roleHeader = req.headers['x-user-role'];
  const authHeader = req.headers['authorization'];
  const sessionTokenHeader = req.headers['x-session-token'];

  let role = roleHeader;
  let token = sessionTokenHeader;

  // Permitir token simple de prueba tipo Bearer admin o token de sesión
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken.toLowerCase() === CONSTANTS.ROLES.ADMIN) {
      role = CONSTANTS.ROLES.ADMIN;
    } else {
      token = rawToken;
    }
  }

  // 1. Vía rol explícito en cabecera o Bearer admin
  if (role && String(role).trim().toLowerCase() === CONSTANTS.ROLES.ADMIN) {
    req.user = req.user || { role: CONSTANTS.ROLES.ADMIN, rol: CONSTANTS.ROLES.ADMIN };
    return next();
  }

  // 2. Vía token de sesión en memoria
  if (token) {
    const session = store.getSessionByToken(token);
    if (session && session.isValid()) {
      const account = store.getAccountById(session.cuentaId);
      if (account && account.rol === CONSTANTS.ROLES.ADMIN) {
        session.touch();
        req.user = account;
        req.session = session;
        return next();
      }
    }
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    codigo: 'FORBIDDEN',
    mensaje: 'Acceso restringido a usuarios con rol de administrador/empresa.'
  });
}
