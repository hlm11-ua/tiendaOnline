import { OrderService } from '../services/order.service.js';
import { store } from '../models/store.js';

export class OrderController {
  /**
   * GET /api/pedidos/:codigoReferencia
   * Consulta el comprobante del pedido para la pantalla de confirmación (FR-006)
   */
  static getByReference(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const order = OrderService.getOrderByReference(codigoReferencia);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pedidos
   * Listado de todos los pedidos confirmados (útil para administración y pruebas)
   */
  static listAll(req, res, next) {
    try {
      const orders = Array.from(store.orders.values());
      res.status(200).json({
        total: orders.length,
        pedidos: orders
      });
    } catch (err) {
      next(err);
    }
  }
}
