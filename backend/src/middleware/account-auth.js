import { store } from '../models/store.js';

/**
 * Middleware para autenticar usuarios con sesión persistente (FR-002, FR-003)
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const sessionTokenHeader = req.headers['x-session-token'];

  let token = null;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (sessionTokenHeader) {
    token = String(sessionTokenHeader).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'NO_AUTENTICADO',
      codigo: 'NO_AUTENTICADO',
      mensaje: 'Se requiere iniciar sesión para acceder a este recurso.'
    });
  }

  const session = store.getSessionByToken(token);
  if (!session || !session.isValid()) {
    return res.status(401).json({
      error: 'SESION_EXPIRADA',
      codigo: 'SESION_EXPIRADA',
      mensaje: 'La sesión ha expirado o no es válida. Por favor, inicie sesión nuevamente.'
    });
  }

  const account = store.getAccountById(session.cuentaId);
  if (!account) {
    return res.status(401).json({
      error: 'USUARIO_NO_ENCONTRADO',
      codigo: 'USUARIO_NO_ENCONTRADO',
      mensaje: 'La cuenta asociada a la sesión ya no existe.'
    });
  }

  session.touch();
  req.user = account;
  req.session = session;

  return next();
}
