import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

export class Session {
  constructor({
    token,
    cuentaId,
    createdAt,
    expiresAt,
    lastAccessAt,
    activo = true
  }) {
    if (!cuentaId) {
      const err = new Error('El identificador de cuenta (cuentaId) es obligatorio para la sesión.');
      err.status = 400;
      err.codigo = 'PARAMETROS_INVALIDOS';
      throw err;
    }

    this.token = token || Session.generateToken();
    this.cuentaId = cuentaId;
    this.createdAt = createdAt || new Date().toISOString();
    
    const defaultDurationMs = CONSTANTS.SESSION?.DURATION_MS || (30 * 24 * 60 * 60 * 1000);
    this.expiresAt = expiresAt || new Date(new Date(this.createdAt).getTime() + defaultDurationMs).toISOString();
    this.lastAccessAt = lastAccessAt || this.createdAt;
    this.activo = Boolean(activo);
  }

  static generateToken() {
    const bytes = CONSTANTS.SESSION?.TOKEN_BYTES || 32;
    return crypto.randomBytes(bytes).toString('hex');
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  isValid() {
    return this.activo && !this.isExpired();
  }

  touch() {
    // Renovación deslizante: la sesión permanece activa 30 días desde el último acceso (FR-002, SC-002)
    this.lastAccessAt = new Date().toISOString();
    const durationMs = CONSTANTS.SESSION?.DURATION_MS || (30 * 24 * 60 * 60 * 1000);
    this.expiresAt = new Date(new Date(this.lastAccessAt).getTime() + durationMs).toISOString();
  }

  invalidate() {
    this.activo = false;
  }

  toJSON() {
    return {
      token: this.token,
      cuentaId: this.cuentaId,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      diasValidez: CONSTANTS.SESSION?.DURATION_DAYS || 30,
      lastAccessAt: this.lastAccessAt,
      activo: this.activo
    };
  }
}
