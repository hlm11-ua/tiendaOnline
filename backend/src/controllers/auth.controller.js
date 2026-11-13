import { AuthService } from '../services/auth.service.js';

export class AuthController {
  /**
   * POST /api/auth/registro
   */
  static registro(req, res, next) {
    try {
      const { nombre, email, password } = req.body || {};
      // El registro público siempre crea cuentas 'cliente': el rol no se acepta del cuerpo (FR-001)
      const resultado = AuthService.register({ nombre, email, password });
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   */
  static login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const resultado = AuthService.login({ email, password });
      res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  static me(req, res, next) {
    try {
      // req.user proviene de requireAuth middleware; el contrato define el perfil directamente
      res.status(200).json(req.user.toJSON ? req.user.toJSON() : req.user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static logout(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const sessionTokenHeader = req.headers['x-session-token'];

      let token = null;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (sessionTokenHeader) {
        token = String(sessionTokenHeader).trim();
      }

      if (token) {
        AuthService.logout(token);
      }

      res.status(200).json({
        mensaje: 'Sesión cerrada correctamente.'
      });
    } catch (err) {
      next(err);
    }
  }
}
