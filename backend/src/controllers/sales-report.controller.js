import { SalesReportService } from '../services/sales-report.service.js';
import { CONSTANTS } from '../config/constants.js';

export class SalesReportController {
  /**
   * Endpoint GET /api/admin/ventas/resumen
   */
  static getSummary(req, res, next) {
    try {
      const { periodo, fechaInicio, fechaFin } = req.query;
      const report = SalesReportService.getSalesReport({
        periodo: periodo || CONSTANTS.SALES_REPORT.PERIODS.THIRTY_DAYS,
        fechaInicio,
        fechaFin
      });
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint GET /api/admin/ventas/exportar
   */
  static exportCsv(req, res, next) {
    try {
      const { periodo, fechaInicio, fechaFin } = req.query;
      const effectivePeriod = periodo || CONSTANTS.SALES_REPORT.PERIODS.THIRTY_DAYS;
      const csvContent = SalesReportService.generateSalesCsv({
        periodo: effectivePeriod,
        fechaInicio,
        fechaFin
      });

      const filename = `resumen-ventas-${effectivePeriod}.csv`;
      res.setHeader('Content-Type', CONSTANTS.SALES_REPORT.CSV.MIME_TYPE);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
