import { Router } from 'express';
import { LogisticsController } from '../controllers/logistics.controller.js';

export const logisticsRoutes = Router();

// Selector de transportistas disponibles (FR-003)
logisticsRoutes.get('/transportistas', LogisticsController.getTransportistas);

// Listado de pedidos y filtrado por estado (FR-001, FR-002)
logisticsRoutes.get('/pedidos', LogisticsController.listPedidos);

// Consulta detallada de un pedido por su código de referencia
logisticsRoutes.get('/pedidos/:codigoReferencia', LogisticsController.getPedido);

// Iniciar empaquetado y preparación en taller (FR-002)
logisticsRoutes.post('/pedidos/:codigoReferencia/preparar', LogisticsController.iniciarPreparacion);

// Despachar pedido con transportista y número de seguimiento (FR-003, FR-004)
logisticsRoutes.post('/pedidos/:codigoReferencia/despachar', LogisticsController.despacharPedido);

// Rectificar número de seguimiento o transportista por errata (Edge Case 2)
logisticsRoutes.post('/pedidos/:codigoReferencia/rectificar-tracking', LogisticsController.rectificarTracking);

// Confirmar entrega definitiva (administrador o cliente) (FR-005)
logisticsRoutes.post('/pedidos/:codigoReferencia/entregar', LogisticsController.confirmarEntrega);

// Historial observable de avisos y notificaciones emitidos (Principio IV)
logisticsRoutes.get('/pedidos/:codigoReferencia/avisos', LogisticsController.getAvisos);
