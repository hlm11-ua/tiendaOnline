import { PaymentGatewayService } from '../services/payment-gateway.service.js';
import { OrderService } from '../services/order.service.js';
import { PaymentTransaction } from '../models/transaction.model.js';
import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';

export class WebhookController {
  /**
   * POST /api/pagos/webhook
   * Procesa la notificación bancaria asíncrona server-to-server con idempotencia (SC-004, FR-007)
   */
  static handleNotification(req, res, next) {
    try {
      const signature = req.headers['x-signature'];

      // 1. Verificación de firma bancaria
      if (!signature || !PaymentGatewayService.verifyWebhookSignature(signature)) {
        return res.status(401).json({
          codigo: 'FIRMA_INVALIDA',
          mensaje: 'Firma de notificación bancaria inválida o ausente.'
        });
      }

      const {
        transaccionId,
        pasarelaRef,
        importe,
        estado,
        sesionPagoId,
        clienteNombre,
        clienteEmail,
        cuentaId
      } = req.body;

      if (!transaccionId || !estado) {
        return res.status(400).json({
          codigo: 'DATOS_INCOMPLETOS',
          mensaje: 'La notificación debe incluir transaccionId y estado.'
        });
      }

      // 2. Control de idempotencia: Si el pedido ya existe, devolver éxito sin duplicar
      const existingOrder = store.getOrderByTransactionId(transaccionId);
      if (existingOrder) {
        return res.status(200).json({ recibido: true, nota: 'Transacción ya procesada previamente (idempotente)' });
      }

      // 3. Registrar o actualizar la transacción bancaria
      let tx = store.getTransaction(transaccionId);
      if (!tx) {
        tx = new PaymentTransaction({
          id: transaccionId,
          pasarelaRef: pasarelaRef || `WEBHOOK-${Date.now()}`,
          importe: Number(importe || 0),
          estado: estado === 'autorizado' ? CONSTANTS.TRANSACTION_STATUS.AUTHORIZED : CONSTANTS.TRANSACTION_STATUS.DENIED,
          codigoRespuesta: estado === 'autorizado' ? '0000' : '0100',
          sesionPagoId
        });
        store.saveTransaction(tx);
      } else if (estado === 'autorizado') {
        tx.estado = CONSTANTS.TRANSACTION_STATUS.AUTHORIZED;
        store.saveTransaction(tx);
      }

      // 4. Si está autorizada y hay sesión activa, formalizar el pedido
      if (estado === 'autorizado' && sesionPagoId) {
        OrderService.createPaidOrder({
          sesionPagoId,
          transaccionId,
          clienteNombre: clienteNombre || 'Comprador (Vía Webhook)',
          clienteEmail: clienteEmail || 'notificacion@example.es',
          cuentaId: cuentaId || null
        });
      }

      return res.status(200).json({ recibido: true });
    } catch (err) {
      next(err);
    }
  }
}
