import { Router } from 'express';
import { SalesReportController } from '../controllers/sales-report.controller.js';
import { requireAdminRole } from '../middleware/auth.js';

export const salesReportRoutes = Router();

// Todas las operaciones de ventas y estadísticas requieren rol admin (FR-001)
salesReportRoutes.use(requireAdminRole);

// Resumen de ventas y ranking Top 5 (FR-002, FR-003, FR-004)
salesReportRoutes.get('/resumen', SalesReportController.getSummary);

// Exportación transaccional a CSV (FR-005)
salesReportRoutes.get('/exportar', SalesReportController.exportCsv);
