import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';
import { AppError } from '../middleware/error-handler.js';
import { PaymentTransaction } from '../models/transaction.model.js';
import { store } from '../models/store.js';

export class PaymentGatewayService {
  /**
   * Procesa la autorización bancaria inicial a partir de un token de tarjeta
   */
  static processAuthorization({ sesionPagoId, importe, tokenTarjeta }) {
    const cleanToken = (tokenTarjeta || '').toLowerCase();
    const transaccionId = crypto.randomUUID();
    const pasarelaRef = `RED-${Date.now().toString().slice(-6)}`;

    // Extraer últimos 4 y marca del token
    let ultimosCuatro = '4242';
    let marcaTarjeta = 'Visa';

    if (cleanToken.includes('mastercard')) {
      marcaTarjeta = 'Mastercard';
    } else if (cleanToken.includes('amex')) {
      marcaTarjeta = 'American Express';
    }

    // Extraer últimos 4 si vienen en el token
    const tokenMatch = cleanToken.match(/(\d{4})(_\d+)?$/);
    if (tokenMatch) {
      ultimosCuatro = tokenMatch[1];
    }

    // 1. Simulación de errores bancarios según tarjeta de prueba
    if (cleanToken.includes('0101') || cleanToken.includes('insufficient_funds')) {
      const tx = new PaymentTransaction({
        id: transaccionId,
        pasarelaRef,
        importe,
        ultimosCuatro,
        marcaTarjeta,
        estado: CONSTANTS.TRANSACTION_STATUS.DENIED,
        codigoRespuesta: '0101',
        mensajeError: 'Operación denegada por la entidad bancaria: fondos insuficientes.',
        sesionPagoId
      });
      store.saveTransaction(tx);
      throw new AppError(tx.mensajeError, 400, 'FONDOS_INSUFICIENTES');
    }

    if (cleanToken.includes('0180') || cleanToken.includes('denied')) {
      const tx = new PaymentTransaction({
        id: transaccionId,
        pasarelaRef,
        importe,
        ultimosCuatro,
        marcaTarjeta,
        estado: CONSTANTS.TRANSACTION_STATUS.DENIED,
        codigoRespuesta: '0180',
        mensajeError: 'Operación denegada: tarjeta no autorizada o bloqueada por la entidad emisora.',
        sesionPagoId
      });
      store.saveTransaction(tx);
      throw new AppError(tx.mensajeError, 400, 'TARJETA_DENEGADA');
    }

    if (cleanToken.includes('9999') || cleanToken.includes('error')) {
      const tx = new PaymentTransaction({
        id: transaccionId,
        pasarelaRef,
        importe,
        ultimosCuatro,
        marcaTarjeta,
        estado: CONSTANTS.TRANSACTION_STATUS.TECHNICAL_ERROR,
        codigoRespuesta: '9999',
        mensajeError: 'No se ha podido establecer comunicación con la pasarela de pago bancaria.',
        sesionPagoId
      });
      store.saveTransaction(tx);
      throw new AppError(tx.mensajeError, 502, 'ERROR_PASARELA');
    }

    // 2. Comprobar regla de 3D Secure condicional (> 100 €) (FR-002)
    const requiere3ds = importe > CONSTANTS.THREE_DS_THRESHOLD_EUR;

    if (requiere3ds) {
      const tx = new PaymentTransaction({
        id: transaccionId,
        pasarelaRef,
        importe,
        ultimosCuatro,
        marcaTarjeta,
        requiere3ds: true,
        estado: CONSTANTS.TRANSACTION_STATUS.PENDING_3DS,
        codigoRespuesta: '0200',
        sesionPagoId
      });
      store.saveTransaction(tx);

      return {
        estado: 'requiere_3ds',
        transaccionId: tx.id,
        desafio3ds: {
          mensaje: 'Introduce el código SMS de confirmación enviado a tu móvil para autorizar compras superiores a 100,00 €',
          transaccionId: tx.id,
          importe
        }
      };
    }

    // 3. Autorización directa (<= 100 €)
    const tx = new PaymentTransaction({
      id: transaccionId,
      pasarelaRef,
      importe,
      ultimosCuatro,
      marcaTarjeta,
      requiere3ds: false,
      estado: CONSTANTS.TRANSACTION_STATUS.AUTHORIZED,
      codigoRespuesta: '0000',
      sesionPagoId
    });
    store.saveTransaction(tx);

    return {
      estado: 'autorizado',
      transaccionId: tx.id,
      transaccion: tx
    };
  }

  /**
   * Resuelve el desafío de autenticación 3D Secure con código OTP
   */
  static verify3DS({ transaccionId, codigoOtp }) {
    const tx = store.getTransaction(transaccionId);
    if (!tx) {
      throw new AppError('Transacción bancaria no localizada.', 404, 'TRANSACCION_NO_ENCONTRADA');
    }

    if (tx.estado !== CONSTANTS.TRANSACTION_STATUS.PENDING_3DS) {
      throw new AppError('La transacción no se encuentra en estado de verificación 3D Secure.', 400, 'ESTADO_INVALIDO');
    }

    if (codigoOtp !== CONSTANTS.THREE_DS_TEST_VALID_OTP) {
      tx.estado = CONSTANTS.TRANSACTION_STATUS.DENIED;
      tx.codigoRespuesta = '0190';
      tx.mensajeError = 'Código de verificación 3D Secure incorrecto o expirado.';
      store.saveTransaction(tx);
      throw new AppError(tx.mensajeError, 400, '3DS_FALLIDO');
    }

    tx.estado = CONSTANTS.TRANSACTION_STATUS.AUTHORIZED;
    tx.codigoRespuesta = '0000';
    store.saveTransaction(tx);

    return {
      estado: 'autorizado',
      transaccionId: tx.id,
      transaccion: tx
    };
  }

  /**
   * Verifica la autenticidad de la firma en un webhook bancario
   */
  static verifyWebhookSignature(signature) {
    return signature === CONSTANTS.WEBHOOK_TEST_SIGNATURE;
  }
}
