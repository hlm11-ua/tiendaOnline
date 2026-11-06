/**
 * Módulo de sincronización bidireccional entre los filtros del catálogo y los query params de la URL (FR-003, FR-004, Story 3)
 */
export class UrlSync {
  /**
   * Lee y normaliza los parámetros de filtro desde la URL actual
   * @returns {Object} { categoria, minPrecio, maxPrecio, productor, enStock }
   */
  static leerFiltrosDeUrl() {
    if (typeof window === 'undefined' || !window.location) {
      return { categoria: 'todas', minPrecio: null, maxPrecio: null, productor: null, enStock: false };
    }

    const params = new URLSearchParams(window.location.search);

    const categoria = params.get('categoria') ? params.get('categoria').trim() : 'todas';
    const minPrecio = params.get('minPrecio') ? params.get('minPrecio').trim() : null;
    const maxPrecio = params.get('maxPrecio') ? params.get('maxPrecio').trim() : null;
    const productor = params.get('productor') ? params.get('productor').trim() : null;
    const enStock = params.get('enStock') === 'true';

    return {
      categoria: categoria || 'todas',
      minPrecio: minPrecio && !isNaN(Number(minPrecio)) ? minPrecio : null,
      maxPrecio: maxPrecio && !isNaN(Number(maxPrecio)) ? maxPrecio : null,
      productor: productor || null,
      enStock
    };
  }

  /**
   * Actualiza la URL del navegador con los filtros vigentes sin recargar la página
   * @param {Object} filtros - { categoria, minPrecio, maxPrecio, productor, enStock }
   * @param {boolean} reemplazar - Si es true, usa replaceState en vez de pushState
   */
  static sincronizarUrlConFiltros(filtros = {}, reemplazar = false) {
    if (typeof window === 'undefined' || !window.history) return;

    const params = new URLSearchParams();

    if (filtros.categoria && filtros.categoria !== 'todas' && String(filtros.categoria).trim() !== '') {
      params.set('categoria', String(filtros.categoria).trim());
    }

    if (filtros.minPrecio !== undefined && filtros.minPrecio !== null && String(filtros.minPrecio).trim() !== '') {
      const min = Number(filtros.minPrecio);
      if (!isNaN(min) && min >= 0) {
        params.set('minPrecio', String(min));
      }
    }

    if (filtros.maxPrecio !== undefined && filtros.maxPrecio !== null && String(filtros.maxPrecio).trim() !== '') {
      const max = Number(filtros.maxPrecio);
      if (!isNaN(max) && max >= 0) {
        params.set('maxPrecio', String(max));
      }
    }

    if (filtros.productor && String(filtros.productor).trim() !== '') {
      params.set('productor', String(filtros.productor).trim());
    }

    if (filtros.enStock === true || filtros.enStock === 'true') {
      params.set('enStock', 'true');
    }

    const query = params.toString();
    const newRelativePathQuery = query ? `${window.location.pathname}?${query}` : window.location.pathname;

    // Solo actualizar si la URL realmente difiere
    const currentQuery = window.location.search.replace(/^\?/, '');
    if (currentQuery !== query) {
      if (reemplazar) {
        window.history.replaceState({ ...filtros }, '', newRelativePathQuery);
      } else {
        window.history.pushState({ ...filtros }, '', newRelativePathQuery);
      }
    }
  }

  /**
   * Inicia la escucha de eventos popstate (botones Atrás y Adelante del navegador)
   * @param {Function} onPopstateChange - Callback al cambiar la URL en el historial
   */
  static iniciarEscuchaPopstate(onPopstateChange) {
    if (typeof window === 'undefined') return;

    window.addEventListener('popstate', () => {
      const filtrosDesdeUrl = UrlSync.leerFiltrosDeUrl();
      if (typeof onPopstateChange === 'function') {
        onPopstateChange(filtrosDesdeUrl);
      }
    });
  }
}
