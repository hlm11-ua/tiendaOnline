/**
 * Cliente HTTP frontend para la API de informes y estadísticas de ventas
 * Cumple con los principios de idioma español y comunicación REST
 */
export class SalesReportApiService {
  /**
   * Realiza peticiones a la API administrativa de ventas
   * @param {string} endpoint
   * @param {Object} options
   */
  static async request(endpoint, options = {}) {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': options.userRole || 'admin',
        ...(options.headers || {})
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.mensaje || 'Error al comunicarse con el servicio de ventas.');
      error.codigo = data.error || 'ERROR_VENTAS';
      error.status = res.status;
      throw error;
    }

    return data;
  }

  /**
   * Obtiene el resumen de ventas y ranking Top 5
   * @param {Object} params
   * @param {string} params.periodo - '7_dias', '30_dias', '1_ano', 'personalizado'
   * @param {string} [params.fechaInicio] - YYYY-MM-DD
   * @param {string} [params.fechaFin] - YYYY-MM-DD
   * @param {string} [params.userRole] - 'admin' por defecto
   */
  static async getSalesReport({ periodo = '30_dias', fechaInicio, fechaFin, userRole = 'admin' } = {}) {
    const params = new URLSearchParams({ periodo });
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    return this.request(`/api/admin/ventas/resumen?${params.toString()}`, { userRole });
  }

  /**
   * Descarga el archivo CSV con el detalle transaccional de ventas
   * @param {Object} params
   * @param {string} params.periodo - '7_dias', '30_dias', '1_ano', 'personalizado'
   * @param {string} [params.fechaInicio] - YYYY-MM-DD
   * @param {string} [params.fechaFin] - YYYY-MM-DD
   * @param {string} [params.userRole] - 'admin' por defecto
   */
  static async exportSalesCsv({ periodo = '30_dias', fechaInicio, fechaFin, userRole = 'admin' } = {}) {
    const params = new URLSearchParams({ periodo });
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);

    const res = await fetch(`/api/admin/ventas/exportar?${params.toString()}`, {
      headers: {
        'x-user-role': userRole
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.mensaje || 'Error al descargar el archivo CSV.');
      error.status = res.status;
      throw error;
    }

    const disposition = res.headers.get('content-disposition') || '';
    let filename = `resumen-ventas-${periodo}.csv`;
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    const blob = await res.blob();
    this.triggerDownload(blob, filename);
    return { exito: true, filename };
  }

  /**
   * Helper para disparar la descarga de un Blob en el navegador
   * @param {Blob} blob
   * @param {string} filename
   */
  static triggerDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}
