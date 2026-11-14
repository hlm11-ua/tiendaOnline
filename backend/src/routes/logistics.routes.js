import { Router } from 'express';
import { LogisticsController } from '../controllers/logistics.controller.js';
import { requireAdminRole } from '../middleware/auth.js';

export const logisticsRoutes = Router();

// Selector de transportistas disponibles (FR-003) - consulta pública
logisticsRoutes.get('/transportistas', LogisticsController.getTransportistas);

// Listado de pedidos y filtrado por estado (FR-001, FR-002) - panel operativo del taller
logisticsRoutes.get('/pedidos', requireAdminRole, LogisticsController.listPedidos);

// Consulta detallada y seguimiento de un pedido por su código de referencia (vista del cliente)
logisticsRoutes.get('/pedidos/:codigoReferencia', LogisticsController.getPedido);

// Iniciar empaquetado y preparación en taller (FR-002) - solo administrador
logisticsRoutes.post('/pedidos/:codigoReferencia/preparar', requireAdminRole, LogisticsController.iniciarPreparacion);

// Despachar pedido con transportista y número de seguimiento (FR-003, FR-004) - solo administrador
logisticsRoutes.post('/pedidos/:codigoReferencia/despachar', requireAdminRole, LogisticsController.despacharPedido);

// Rectificar número de seguimiento o transportista por errata (Edge Case 2) - solo administrador
logisticsRoutes.post('/pedidos/:codigoReferencia/rectificar-tracking', requireAdminRole, LogisticsController.rectificarTracking);

// Confirmar entrega definitiva (administrador o cliente) (FR-005)
logisticsRoutes.post('/pedidos/:codigoReferencia/entregar', LogisticsController.confirmarEntrega);

// Historial observable de avisos y notificaciones emitidos (Principio IV)
logisticsRoutes.get('/pedidos/:codigoReferencia/avisos', LogisticsController.getAvisos);
