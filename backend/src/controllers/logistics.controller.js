import { LogisticsService } from '../services/logistics.service.js';

/**
 * Controlador REST para el ciclo logístico y de expediciones (Feature 007)
 */
export class LogisticsController {
  /**
   * GET /api/logistica/transportistas
   * Devuelve las empresas de mensajería disponibles (FR-003)
   */
  static getTransportistas(req, res, next) {
    try {
      const transportistas = LogisticsService.getTransportistas();
      res.status(200).json({ transportistas });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/logistica/pedidos
   * Lista los pedidos con filtrado opcional por estado operativo (FR-001, FR-002)
   */
  static listPedidos(req, res, next) {
    try {
      const { estado } = req.query;
      const pedidos = LogisticsService.listOrders(estado);
      res.status(200).json({
        total: pedidos.length,
        pedidos
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/logistica/pedidos/:codigoReferencia
   * Consulta el detalle y seguimiento de un pedido por su referencia
   */
  static getPedido(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const pedido = LogisticsService.getOrderByReference(codigoReferencia);
      res.status(200).json(pedido);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/logistica/pedidos/:codigoReferencia/preparar
   * Inicia el empaquetado en taller transicionando a "en preparación" (FR-002)
   */
  static iniciarPreparacion(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const pedido = LogisticsService.iniciarPreparacion(codigoReferencia);
      res.status(200).json({
        estado: pedido.estado,
        pedido
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/logistica/pedidos/:codigoReferencia/despachar
   * Registra el despacho con transportista y número de seguimiento (FR-003, FR-004)
   */
  static despacharPedido(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const { transportista, numeroSeguimiento, notas } = req.body || {};
      const { pedido, aviso } = LogisticsService.despacharPedido(codigoReferencia, {
        transportista,
        numeroSeguimiento,
        notas
      });

      res.status(200).json({
        estado: pedido.estado,
        pedido,
        aviso
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/logistica/pedidos/:codigoReferencia/rectificar-tracking
   * Corrige una errata tipográfica en el código antes de la entrega (Edge Case 2)
   */
  static rectificarTracking(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const { transportista, numeroSeguimiento, motivo } = req.body || {};
      const { pedido, avisoRectificacion } = LogisticsService.rectificarTracking(codigoReferencia, {
        transportista,
        numeroSeguimiento,
        motivo
      });

      res.status(200).json({
        pedido,
        avisoRectificacion
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/logistica/pedidos/:codigoReferencia/entregar
   * Confirma la entrega física por parte del gestor o del comprador (FR-005)
   */
  static confirmarEntrega(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const { origen = 'admin' } = req.body || {};
      const resultado = LogisticsService.confirmarEntrega(codigoReferencia, origen);

      res.status(200).json({
        estado: resultado.estado,
        pedido: resultado.pedido
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/logistica/pedidos/:codigoReferencia/avisos
   * Devuelve el historial de notificaciones y emails simulados (Principio IV)
   */
  static getAvisos(req, res, next) {
    try {
      const { codigoReferencia } = req.params;
      const avisos = LogisticsService.getAvisos(codigoReferencia);
      res.status(200).json({
        total: avisos.length,
        avisos
      });
    } catch (err) {
      next(err);
    }
  }
}
