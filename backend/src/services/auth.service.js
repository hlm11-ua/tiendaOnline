import { store } from '../models/store.js';
import { Account } from '../models/account.model.js';
import { Session } from '../models/session.model.js';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';

export class AuthService {
  /**
   * Registra una nueva cuenta de usuario y emite una sesión de 30 días.
   * El parámetro `rol` es solo para uso interno (siembra de cuentas): el controlador
   * público nunca lo propaga desde el cuerpo de la petición.
   */
  static register({ nombre, email, password, rol = 'cliente' }) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      throw new AppError('El nombre es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new AppError('El correo electrónico es obligatorio.', 400, 'PARAMETROS_INVALIDOS');
    }

    const minLength = CONSTANTS.PASSWORD?.MIN_LENGTH || 8;
    if (!password || typeof password !== 'string' || password.length < minLength) {
      throw new AppError(
        `La contraseña debe tener al menos ${minLength} caracteres.`,
        400,
        'CONTRASENA_CORTA'
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = store.getAccountByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(
        'El correo electrónico ya se encuentra registrado.',
        409,
        'EMAIL_DUPLICADO'
      );
    }

    const salt = Account.generateSalt();
    const passwordHash = Account.hashPassword(password, salt);

    const account = new Account({
      nombre: nombre.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      rol
    });

    store.saveAccount(account);
    const session = this.createSession(account.id);

    return {
      usuario: account.toJSON(),
      sesion: session.toJSON()
    };
  }

  /**
   * Inicia sesión comprobando credenciales y devolviendo el token persistente
   */
  static login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Debe proporcionar correo electrónico y contraseña.', 400, 'CREDENCIALES_INCOMPLETAS');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const account = store.getAccountByEmail(normalizedEmail);

    if (!account || !account.verifyPassword(password)) {
      throw new AppError('Correo electrónico o contraseña incorrectos.', 401, 'CREDENCIALES_INVALIDAS');
    }

    const session = this.createSession(account.id);

    return {
      usuario: account.toJSON(),
      sesion: session.toJSON()
    };
  }

  /**
   * Crea una nueva sesión activa con duración de 30 días
   */
  static createSession(cuentaId) {
    const session = new Session({ cuentaId });
    store.saveSession(session);
    return session;
  }

  /**
   * Invalida y elimina la sesión activa
   */
  static logout(token) {
    if (!token) return false;
    return store.deleteSession(token);
  }

  /**
   * Obtiene la cuenta asociada a un token válido
   */
  static getAccountByToken(token) {
    if (!token) return null;
    const session = store.getSessionByToken(token);
    if (!session || !session.isValid()) return null;

    session.touch();
    return store.getAccountById(session.cuentaId);
  }
}
