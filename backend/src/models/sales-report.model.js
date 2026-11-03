/**
 * Formatea una cifra monetaria a euros con formato español (es-ES)
 * Ej: 1245.5 -> "1.245,50 €"
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrencyEUR(amount) {
  const num = Number(amount) || 0;
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];
  return `${integerPart},${decimalPart} €`;
}

/**
 * Resumen consolidado de ventas de un intervalo temporal
 */
export class SalesReportSummary {
  constructor({
    periodoEtiqueta,
    fechaInicio,
    fechaFin,
    facturacionTotal = 0,
    recuentoPedidos = 0,
    fechaGeneracion
  }) {
    this.periodoEtiqueta = periodoEtiqueta;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.facturacionTotal = Math.round(Number(facturacionTotal) * 100) / 100;
    this.facturacionFormateada = formatCurrencyEUR(this.facturacionTotal);
    this.recuentoPedidos = Number(recuentoPedidos) || 0;
    this.fechaGeneracion = fechaGeneracion || new Date().toISOString();
  }
}

/**
 * Elemento de ranking de productos más vendidos (Top 5)
 */
export class ProductRankingItem {
  constructor({
    posicion,
    productoId,
    titulo,
    artesano,
    unidadesVendidas = 0,
    facturacionTotal = 0
  }) {
    this.posicion = Number(posicion);
    this.productoId = productoId;
    this.titulo = titulo;
    this.artesano = artesano || 'Taller Artesanal';
    this.unidadesVendidas = Number(unidadesVendidas) || 0;
    this.facturacionTotal = Math.round(Number(facturacionTotal) * 100) / 100;
    this.facturacionFormateada = formatCurrencyEUR(this.facturacionTotal);
  }
}

/**
 * Fila de detalle transaccional de venta para exportación
 */
export class SalesTransactionDetail {
  constructor({
    fecha,
    codigoPedido,
    producto,
    artesano,
    unidades,
    importe
  }) {
    this.fecha = fecha;
    this.codigoPedido = codigoPedido;
    this.producto = producto;
    this.artesano = artesano || 'Taller Artesanal';
    this.unidades = Number(unidades) || 0;
    this.importe = Math.round(Number(importe) * 100) / 100;
    this.importeFormateado = formatCurrencyEUR(this.importe);
  }
}
