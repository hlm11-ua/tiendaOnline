import { CONSTANTS } from '../config/constants.js';

/**
 * Middleware para restringir acceso exclusivamente a usuarios con rol de administrador/empresa (FR-001)
 */
export function requireAdminRole(req, res, next) {
  const roleHeader = req.headers['x-user-role'];
  const authHeader = req.headers['authorization'];

  let role = roleHeader;

  // Permitir token simple de prueba tipo Bearer admin o similar
  if (!role && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    role = authHeader.slice(7).trim();
  }

  if (role && String(role).trim().toLowerCase() === CONSTANTS.ROLES.ADMIN) {
    req.user = { role: CONSTANTS.ROLES.ADMIN };
    return next();
  }

  return res.status(403).json({
    error: 'FORBIDDEN',
    codigo: 'FORBIDDEN',
    mensaje: 'Acceso restringido a usuarios con rol de administrador/empresa.'
  });
}
