import { store } from '../models/store.js';
import { CONSTANTS } from '../config/constants.js';
import {
  SalesReportSummary,
  ProductRankingItem,
  SalesTransactionDetail,
  formatCurrencyEUR
} from '../models/sales-report.model.js';

/**
 * Servicio de lógica de negocio para informes y análisis de ventas
 */
export class SalesReportService {
  /**
   * Resuelve y valida el intervalo de fechas según el tipo de período
   * @param {string} periodo - '7_dias' | '30_dias' | '1_ano' | 'personalizado'
   * @param {string} [fechaInicio] - YYYY-MM-DD
   * @param {string} [fechaFin] - YYYY-MM-DD
   * @returns {{ start: Date, end: Date, label: string }}
   */
  static resolveDateRange(periodo = '30_dias', fechaInicio, fechaFin) {
    const validPeriods = Object.values(CONSTANTS.SALES_REPORT.PERIODS);
    if (!validPeriods.includes(periodo)) {
      const err = new Error(`El período '${periodo}' no es válido. Debe ser uno de: ${validPeriods.join(', ')}.`);
      err.status = 400;
      throw err;
    }

    const now = new Date();
    let start;
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let label = CONSTANTS.SALES_REPORT.PERIOD_LABELS[periodo] || periodo;

    if (periodo === CONSTANTS.SALES_REPORT.PERIODS.SEVEN_DAYS) {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (periodo === CONSTANTS.SALES_REPORT.PERIODS.THIRTY_DAYS) {
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (periodo === CONSTANTS.SALES_REPORT.PERIODS.ONE_YEAR) {
      start = new Date(now);
      start.setDate(start.getDate() - 365);
      start.setHours(0, 0, 0, 0);
    } else if (periodo === CONSTANTS.SALES_REPORT.PERIODS.CUSTOM) {
      if (!fechaInicio || !fechaFin) {
        const err = new Error('Para el período personalizado debe proporcionar fechaInicio y fechaFin (formato YYYY-MM-DD).');
        err.status = 400;
        throw err;
      }

      const regexDate = /^\d{4}-\d{2}-\d{2}$/;
      if (!regexDate.test(fechaInicio) || !regexDate.test(fechaFin)) {
        const err = new Error('Las fechas deben tener el formato ISO estándar YYYY-MM-DD.');
        err.status = 400;
        throw err;
      }

      start = new Date(`${fechaInicio}T00:00:00.000Z`);
      end = new Date(`${fechaFin}T23:59:59.999Z`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error('Una de las fechas proporcionadas no es válida.');
        err.status = 400;
        throw err;
      }

      if (start > end) {
        const err = new Error('La fecha de inicio no puede ser posterior a la fecha de fin.');
        err.status = 400;
        throw err;
      }

      label = `Personalizado (${fechaInicio} a ${fechaFin})`;
    }

    return { start, end, label };
  }

  /**
   * Obtiene el resumen de ventas y ranking Top 5 para el período especificado
   * @param {Object} query
   * @param {string} [query.periodo]
   * @param {string} [query.fechaInicio]
   * @param {string} [query.fechaFin]
   * @returns {{ resumen: SalesReportSummary, rankingTop5: ProductRankingItem[] }}
   */
  static getSalesReport({ periodo = '30_dias', fechaInicio, fechaFin } = {}) {
    const { start, end, label } = this.resolveDateRange(periodo, fechaInicio, fechaFin);
    const orders = store.getPaidOrdersInDateRange(start, end);

    let facturacionTotal = 0;
    const productsMap = new Map();

    for (const order of orders) {
      facturacionTotal += Number(order.total) || 0;

      if (Array.isArray(order.lineas)) {
        for (const line of order.lineas) {
          const prodId = line.productoId || line.titulo;
          if (!productsMap.has(prodId)) {
            // Intentar enriquecer artesano y título desde el catálogo
            let artesano = 'Taller Artesanal';
            let titulo = line.titulo || 'Producto';

            if (line.productoId) {
              const catalogProduct = store.getProductById(line.productoId);
              if (catalogProduct) {
                artesano = catalogProduct.artesano || artesano;
                if (!line.titulo) {
                  titulo = catalogProduct.titulo || titulo;
                }
              }
            }

            productsMap.set(prodId, {
              productoId: line.productoId || prodId,
              titulo,
              artesano,
              unidadesVendidas: 0,
              facturacionTotal: 0
            });
          }

          const entry = productsMap.get(prodId);
          entry.unidadesVendidas += Number(line.cantidad) || 0;
          entry.facturacionTotal += Number(line.subtotal) || (Number(line.precioUnitario) * Number(line.cantidad)) || 0;
        }
      }
    }

    // Ordenar ranking: 1º por unidades vendidas desc, 2º desempate por facturación desc
    const sortedProducts = Array.from(productsMap.values()).sort((a, b) => {
      if (b.unidadesVendidas !== a.unidadesVendidas) {
        return b.unidadesVendidas - a.unidadesVendidas;
      }
      return b.facturacionTotal - a.facturacionTotal;
    });

    const rankingTop5 = sortedProducts
      .slice(0, CONSTANTS.SALES_REPORT.TOP_RANKING_LIMIT)
      .map((item, index) => new ProductRankingItem({
        posicion: index + 1,
        productoId: item.productoId,
        titulo: item.titulo,
        artesano: item.artesano,
        unidadesVendidas: item.unidadesVendidas,
        facturacionTotal: item.facturacionTotal
      }));

    const resumen = new SalesReportSummary({
      periodoEtiqueta: label,
      fechaInicio: start.toISOString(),
      fechaFin: end.toISOString(),
      facturacionTotal,
      recuentoPedidos: orders.length,
      fechaGeneracion: new Date().toISOString()
    });

    return { resumen, rankingTop5 };
  }

  /**
   * Genera el contenido en formato CSV con el detalle de transacciones de ventas
   * Delimitador ';' y UTF-8 BOM para apertura nativa en Microsoft Excel (es-ES)
   * @param {Object} query
   * @param {string} [query.periodo]
   * @param {string} [query.fechaInicio]
   * @param {string} [query.fechaFin]
   * @returns {string}
   */
  static generateSalesCsv({ periodo = '30_dias', fechaInicio, fechaFin } = {}) {
    const { start, end } = this.resolveDateRange(periodo, fechaInicio, fechaFin);
    const orders = store.getPaidOrdersInDateRange(start, end);

    // Ordenar pedidos por fecha de creación ascendente
    orders.sort((a, b) => new Date(a.fechaCreacion || 0) - new Date(b.fechaCreacion || 0));

    const delimiter = CONSTANTS.SALES_REPORT.CSV.DELIMITER;
    const rows = [CONSTANTS.SALES_REPORT.CSV.HEADER];

    for (const order of orders) {
      const fecha = (order.fechaCreacion || new Date().toISOString()).slice(0, 10);
      const codigo = order.codigoReferencia || order.id;

      if (Array.isArray(order.lineas) && order.lineas.length > 0) {
        for (const line of order.lineas) {
          let artesano = 'Taller Artesanal';
          let titulo = line.titulo || 'Producto';

          if (line.productoId) {
            const catalogProduct = store.getProductById(line.productoId);
            if (catalogProduct) {
              artesano = catalogProduct.artesano || artesano;
              if (!line.titulo) {
                titulo = catalogProduct.titulo || titulo;
              }
            }
          }

          const unidades = Number(line.cantidad) || 0;
          const subtotal = Number(line.subtotal) || (Number(line.precioUnitario) * unidades) || 0;
          const importeFormateado = formatCurrencyEUR(subtotal);

          // Escapar comillas dobles si el texto contiene el delimitador
          const safeTitulo = titulo.includes(delimiter) ? `"${titulo.replace(/"/g, '""')}"` : titulo;
          const safeArtesano = artesano.includes(delimiter) ? `"${artesano.replace(/"/g, '""')}"` : artesano;

          rows.push([
            fecha,
            codigo,
            safeTitulo,
            safeArtesano,
            unidades,
            importeFormateado
          ].join(delimiter));
        }
      } else {
        // En caso de pedido sin líneas explícitas
        const importeFormateado = formatCurrencyEUR(order.total);
        rows.push([
          fecha,
          codigo,
          'Venta general',
          'Taller Artesanal',
          1,
          importeFormateado
        ].join(delimiter));
      }
    }

    return CONSTANTS.SALES_REPORT.CSV.BOM + rows.join('\n');
  }
}
