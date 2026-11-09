import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Account {
  constructor({
    id,
    nombre,
    email,
    passwordHash,
    salt,
    rol = CONSTANTS.ROLES?.CUSTOMER || 'cliente',
    createdAt,
    updatedAt
  }) {
    this.id = id || crypto.randomUUID();
    this.nombre = Account.validateNombre(nombre);
    this.email = Account.validateEmail(email);
    this.passwordHash = passwordHash;
    this.salt = salt;
    this.rol = Account.validateRol(rol);
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || this.createdAt;
  }

  static validateNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') {
      const err = new Error('El nombre de usuario es obligatorio.');
      err.status = 400;
      err.codigo = 'NOMBRE_INVALIDO';
      throw err;
    }
    const trimmed = nombre.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      const err = new Error('El nombre debe tener entre 1 y 100 caracteres.');
      err.status = 400;
      err.codigo = 'NOMBRE_INVALIDO';
      throw err;
    }
    return trimmed;
  }

  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      const err = new Error('El correo electrónico es obligatorio.');
      err.status = 400;
      err.codigo = 'EMAIL_INVALIDO';
      throw err;
    }
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      const err = new Error('El formato del correo electrónico no es válido.');
      err.status = 400;
      err.codigo = 'EMAIL_INVALIDO';
      throw err;
    }
    return normalized;
  }

  static validateRol(rol) {
    const validRoles = [CONSTANTS.ROLES?.ADMIN || 'admin', CONSTANTS.ROLES?.CUSTOMER || 'cliente'];
    if (!rol || !validRoles.includes(rol)) {
      return CONSTANTS.ROLES?.CUSTOMER || 'cliente';
    }
    return rol;
  }

  static hashPassword(password, salt) {
    if (!password || typeof password !== 'string') {
      throw new Error('La contraseña es obligatoria.');
    }
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  static generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  verifyPassword(password) {
    if (!password || !this.salt || !this.passwordHash) return false;
    const computedHash = Account.hashPassword(password, this.salt);
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(this.passwordHash, 'hex'));
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      rol: this.rol,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
