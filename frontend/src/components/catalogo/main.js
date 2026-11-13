import { catalogApiService } from '../../services/catalog-api.service.js';
import { CategoryNav } from './category-nav.js';
import { ProductGrid } from './product-grid.js';
import { CatalogFilters } from './catalog-filters.js';
import { UrlSync } from './url-sync.js';
import { EmptyState } from './empty-state.js';
import { ProductReviewsModal } from '../resenas/product-reviews-modal.js';

/**
 * Controlador principal de la vista de catálogo
 */
export class CatalogApp {
  constructor() {
    this.filtrosActivos = {
      categoria: 'todas',
      minPrecio: null,
      maxPrecio: null,
      productor: null,
      enStock: false
    };

    this.categoryNav = null;
    this.productGrid = null;
    this.catalogFilters = null;
    this.emptyState = null;
    this.reviewsModal = null;
  }

  async init() {
    this.reviewsModal = new ProductReviewsModal({
      onUpdate: () => {
        this.cargarProductos();
      }
    });

    this.productGrid = new ProductGrid('#products-grid', '#results-count', (productoId, titulo) => {
      this.reviewsModal.abrir(productoId, titulo);
    });

    // 1. Inicializar componente de estado vacío (Story 4)
    this.emptyState = new EmptyState({
      containerSelector: '#estado-vacio',
      buttonSelector: '#btn-cta-reset',
      onReset: () => this.onResetFilters()
    });

    // 2. Leer parámetros iniciales desde la URL (Story 3)
    const filtrosInicialesUrl = UrlSync.leerFiltrosDeUrl();
    this.filtrosActivos = { ...this.filtrosActivos, ...filtrosInicialesUrl };

    try {
      // 3. Cargar metadatos globales de filtros
      const metadatos = await catalogApiService.getFiltros();

      // 4. Inicializar navegación por categorías (Story 1)
      this.categoryNav = new CategoryNav('#categories-container', (categoriaSlug) => {
        this.onCategorySelect(categoriaSlug);
      });
      this.categoryNav.render(metadatos.categorias, this.filtrosActivos.categoria);

      // 5. Inicializar controles de filtros (Story 2)
      this.catalogFilters = new CatalogFilters({
        formSelector: '#filters-form',
        onFilterChange: (valores) => this.onFilterFormChange(valores),
        onReset: () => this.onResetFilters()
      });
      this.catalogFilters.renderProductores(metadatos.productores, this.filtrosActivos.productor);
      this.catalogFilters.setValores(this.filtrosActivos);

      // 6. Configurar sincronización del historial del navegador (Story 3)
      UrlSync.iniciarEscuchaPopstate((filtrosUrl) => {
        this.onPopstateNavegacion(filtrosUrl);
      });

      // 7. Cargar productos iniciales
      await this.cargarProductos();
    } catch (err) {
      console.error('[CatalogApp] Error de inicialización:', err);
      const resultsCount = document.querySelector('#results-count');
      if (resultsCount) {
        resultsCount.textContent = 'Error al cargar el catálogo de productos.';
      }
    }
  }

  async onCategorySelect(categoriaSlug) {
    this.filtrosActivos.categoria = categoriaSlug;
    UrlSync.sincronizarUrlConFiltros(this.filtrosActivos);
    await this.cargarProductos();
  }

  async onFilterFormChange(valores) {
    this.filtrosActivos.minPrecio = valores.minPrecio;
    this.filtrosActivos.maxPrecio = valores.maxPrecio;
    this.filtrosActivos.productor = valores.productor;
    this.filtrosActivos.enStock = valores.enStock;
    UrlSync.sincronizarUrlConFiltros(this.filtrosActivos);
    await this.cargarProductos();
  }

  async onResetFilters() {
    this.filtrosActivos = {
      categoria: 'todas',
      minPrecio: null,
      maxPrecio: null,
      productor: null,
      enStock: false
    };

    if (this.catalogFilters) {
      this.catalogFilters.reset();
    }
    if (this.categoryNav) {
      this.categoryNav.setCategoriaActiva('todas');
    }
    if (this.emptyState) {
      this.emptyState.ocultar();
    }

    UrlSync.sincronizarUrlConFiltros(this.filtrosActivos);
    await this.cargarProductos();
  }

  async onPopstateNavegacion(filtrosUrl) {
    this.filtrosActivos = { ...filtrosUrl };
    if (this.categoryNav) {
      this.categoryNav.setCategoriaActiva(this.filtrosActivos.categoria);
    }
    if (this.catalogFilters) {
      this.catalogFilters.setValores(this.filtrosActivos);
    }
    await this.cargarProductos();
  }

  async cargarProductos() {
    try {
      const data = await catalogApiService.getProductos(this.filtrosActivos);

      if (!data.productos || data.productos.length === 0) {
        this.productGrid.render([], 0);
        if (this.emptyState) {
          this.emptyState.mostrar();
        }
      } else {
        if (this.emptyState) {
          this.emptyState.ocultar();
        }
        this.productGrid.render(data.productos, data.total);
      }
    } catch (err) {
      console.error('[CatalogApp] Error al cargar productos:', err);
      this.productGrid.render([], 0);
      if (this.emptyState) {
        this.emptyState.mostrar();
      }
    }
  }
}

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new CatalogApp();
    app.init();
    window.catalogApp = app;
  });
}
