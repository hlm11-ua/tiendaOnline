import { AccountOrderService } from '../services/account-order.service.js';

export class AccountOrderController {
  /**
   * GET /api/pedidos/mis-compras
   */
  static listMyOrders(req, res, next) {
    try {
      const cuentaId = req.user?.id || null;
      const email = req.user?.email || null;

      const pedidos = AccountOrderService.getCustomerOrders(cuentaId, email);

      res.status(200).json({
        total: pedidos.length,
        pedidos
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pedidos/mis-compras/:codigoReferencia
   */
  static getMyOrderDetails(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const cuentaId = req.user?.id || null;
      const email = req.user?.email || null;

      const pedido = AccountOrderService.getOrderForCustomer(cuentaId, email, codigoReferencia);

      res.status(200).json(pedido);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/pedidos/:codigoReferencia/fase
   */
  static updatePhase(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const { fase, numeroSeguimiento, transportista, notas } = req.body || {};

      const pedido = AccountOrderService.updateOrderPhase({
        codigoReferencia,
        fase,
        numeroSeguimiento,
        transportista,
        notas
      });

      res.status(200).json(pedido);
    } catch (err) {
      next(err);
    }
  }
}
