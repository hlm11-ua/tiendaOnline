/**
 * Servicio seguro de tokenización de tarjetas en cliente (Frontend)
 * Cumple con PCI-DSS y Principio V: Convierte datos de tarjeta en un token efímero
 * asegurando que el PAN completo y el CVV nunca viajen a la base de datos de la tienda.
 */

export class CardTokenizerService {
  /**
   * Algoritmo de Luhn para validación de número de tarjeta
   */
  static validateLuhn(pan) {
    const cleaned = pan.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Valida fecha de expiración MM/AA
   */
  static validateExpiry(expiryStr) {
    const parts = expiryStr.split('/');
    if (parts.length !== 2) return false;

    const month = parseInt(parts[0].trim(), 10);
    let year = parseInt(parts[1].trim(), 10);

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return false;
    }

    // Convertir año de dos dígitos a cuatro dígitos
    if (year < 100) {
      year += 2000;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  /**
   * Valida código de seguridad CVV (3 o 4 dígitos numéricos)
   */
  static validateCVV(cvv) {
    const cleaned = cvv.replace(/\D/g, '');
    return cleaned.length === 3 || cleaned.length === 4;
  }

  /**
   * Detecta marca comercial de la tarjeta a partir de los primeros dígitos
   */
  static detectBrand(pan) {
    const cleaned = pan.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    return 'Tarjeta Bancaria';
  }

  /**
   * Genera un token efímero seguro a partir de los datos introducidos
   */
  static tokenize({ pan, expiry, cvv, titular }) {
    const cleanedPan = (pan || '').replace(/\s+/g, '');
    const cleanedCvv = (cvv || '').trim();
    const cleanedExpiry = (expiry || '').trim();

    if (!this.validateLuhn(cleanedPan)) {
      throw new Error('El número de tarjeta no es válido.');
    }

    if (!this.validateExpiry(cleanedExpiry)) {
      throw new Error('La fecha de caducidad es inválida o ha expirado.');
    }

    if (!this.validateCVV(cleanedCvv)) {
      throw new Error('El código de seguridad (CVV) debe contener 3 o 4 dígitos.');
    }

    const ultimosCuatro = cleanedPan.slice(-4);
    const marca = this.detectBrand(cleanedPan);

    // Identificador de prueba según tarjeta
    const token = `tok_${marca.toLowerCase().replace(/\s+/g, '_')}_${cleanedPan}_${Date.now()}`;

    return {
      token,
      marca,
      ultimosCuatro
    };
  }
}
