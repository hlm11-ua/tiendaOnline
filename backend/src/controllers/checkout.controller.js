import { StockReservationService } from '../services/stock-reservation.service.js';
import { PaymentGatewayService } from '../services/payment-gateway.service.js';
import { OrderService } from '../services/order.service.js';
import { store } from '../models/store.js';
import { AppError } from '../middleware/error-handler.js';
import { CONSTANTS } from '../config/constants.js';

// Mapa en memoria para retener temporalmente los datos de contacto del cliente durante el desafío 3DS
const pendingCheckoutCustomerData = new Map();

export class CheckoutController {
  /**
   * Catálogo disponible para selección en demo y pruebas
   */
  static getCatalog(req, res, next) {
    try {
      const items = store.getAllInventory();
      res.json({
        items,
        moneda: CONSTANTS.CURRENCY
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pagos/iniciar
   * Bloquea stock temporal durante 10 minutos y abre la sesión de checkout
   */
  static iniciar(req, res, next) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Debe proporcionar al menos un artículo para iniciar el pago.', 400, 'PARAMETROS_INVALIDOS');
      }

      // Calcular total en euros
      let total = 0;
      for (const it of items) {
        if (!it.varianteId || !it.cantidad || it.cantidad < 1) {
          throw new AppError('Datos de artículo inválidos en la cesta.', 400, 'ARTICULO_INVALIDO');
        }
        const invItem = store.getInventoryItem(it.varianteId);
        if (!invItem) {
          throw new AppError(`El artículo "${it.varianteId}" no existe en el catálogo.`, 404, 'ARTICULO_NO_ENCONTRADO');
        }
        total += invItem.precioUnitario * it.cantidad;
      }

      const { sesionPagoId, expiresAt, minutosRestantes } = StockReservationService.reserveCartItems(items);

      res.status(200).json({
        sesionPagoId,
        total: Number(total.toFixed(2)),
        moneda: CONSTANTS.CURRENCY,
        expiresAt,
        minutosRestantes
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pagos/procesar
   * Procesa la tarjeta del cliente: cobro directo o requerimiento 3DS
   */
  static procesar(req, res, next) {
    const { sesionPagoId, clienteNombre, clienteEmail, cuentaId, tokenTarjeta } = req.body;

    try {
      if (!sesionPagoId || !clienteNombre || !clienteEmail || !tokenTarjeta) {
        throw new AppError('Faltan datos obligatorios para procesar el pago (sesión, nombre, email o token).', 400, 'PARAMETROS_INCOMPLETOS');
      }

      // 1. Validar que la reserva temporal de 10 minutos esté activa y no expirada
      const reservations = StockReservationService.validateActiveReservation(sesionPagoId);

      // 2. Calcular el total a cobrar a partir de los artículos de la reserva
      let total = 0;
      for (const resItem of reservations) {
        const inv = store.getInventoryItem(resItem.varianteId);
        if (inv) {
          total += inv.precioUnitario * resItem.cantidad;
        }
      }
      total = Number(total.toFixed(2));

      // 3. Solicitar autorización a la pasarela bancaria
      const authResult = PaymentGatewayService.processAuthorization({
        sesionPagoId,
        importe: total,
        tokenTarjeta
      });

      // 4. Si requiere 3D Secure (> 100 €), guardar contacto y devolver desafío
      if (authResult.estado === 'requiere_3ds') {
        pendingCheckoutCustomerData.set(authResult.transaccionId, {
          sesionPagoId,
          clienteNombre,
          clienteEmail,
          cuentaId
        });

        return res.status(200).json({
          estado: 'requiere_3ds',
          transaccionId: authResult.transaccionId,
          desafio3ds: authResult.desafio3ds
        });
      }

      // 5. Si la autorización es directa (<= 100 €), persistir atómicamente el pedido pagado
      const pedido = OrderService.createPaidOrder({
        sesionPagoId,
        transaccionId: authResult.transaccionId,
        clienteNombre,
        clienteEmail,
        cuentaId
      });

      return res.status(200).json({
        estado: 'autorizado',
        transaccionId: authResult.transaccionId,
        pedido
      });
    } catch (err) {
      // Si la tarjeta fue denegada definitivamente, liberar reserva de existencias
      if (err.codigo === 'FONDOS_INSUFICIENTES' || err.codigo === 'TARJETA_DENEGADA') {
        StockReservationService.releaseReservation(sesionPagoId);
      }
      next(err);
    }
  }

  /**
   * POST /api/pagos/verificar-3ds
   * Resuelve el desafío bancario 3D Secure para compras > 100 €
   */
  static verificar3ds(req, res, next) {
    const { transaccionId, codigoOtp } = req.body;
    try {
      if (!transaccionId || !codigoOtp) {
        throw new AppError('Se requiere transaccionId y codigoOtp.', 400, 'PARAMETROS_INCOMPLETOS');
      }

      // Recuperar datos de cliente asociados a esta transacción
      const customerData = pendingCheckoutCustomerData.get(transaccionId);
      if (!customerData) {
        throw new AppError('Datos de sesión de compra no localizados para esta transacción.', 400, 'SESION_NO_ENCONTRADA');
      }

      try {
        PaymentGatewayService.verify3DS({ transaccionId, codigoOtp });
      } catch (err) {
        if (err.codigo === '3DS_FALLIDO') {
          StockReservationService.releaseReservation(customerData.sesionPagoId);
          pendingCheckoutCustomerData.delete(transaccionId);
        }
        throw err;
      }

      // Formalizar el pedido tras confirmación de 3DS
      const pedido = OrderService.createPaidOrder({
        sesionPagoId: customerData.sesionPagoId,
        transaccionId,
        clienteNombre: customerData.clienteNombre,
        clienteEmail: customerData.clienteEmail,
        cuentaId: customerData.cuentaId
      });

      pendingCheckoutCustomerData.delete(transaccionId);

      res.status(200).json({
        estado: 'autorizado',
        transaccionId,
        pedido
      });
    } catch (err) {
      next(err);
    }
  }
}
