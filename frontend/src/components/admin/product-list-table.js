/**
 * Componente: Tabla Interactiva del Catálogo de Productos y Variantes (FR-003, FR-005, FR-006, SC-002, SC-003)
 * Muestra el listado de productos, desglose de variantes, inventario y distintivos visuales de stock bajo y agotado.
 */
export class ProductListTable {
  constructor({ containerId, onEditProduct, onDeleteProduct, onUpdateVariantStock, onNewProduct }) {
    this.container = document.getElementById(containerId);
    this.onEditProduct = onEditProduct;
    this.onDeleteProduct = onDeleteProduct;
    this.onUpdateVariantStock = onUpdateVariantStock;
    this.onNewProduct = onNewProduct;

    this.products = [];
    this.categories = [];
    this.filter = {
      search: '',
      categoriaId: '',
      soloAlertas: false
    };
  }

  setCategories(categories = []) {
    this.categories = categories;
  }

  setFilter(filterUpdates = {}) {
    this.filter = { ...this.filter, ...filterUpdates };
    this.render(this.products, this.categories);
  }

  render(products = [], categories = []) {
    this.products = products;
    if (categories.length > 0) {
      this.categories = categories;
    }

    if (!this.container) return;

    const filtered = this.getFilteredProducts();

    this.container.innerHTML = `
      <div class="card product-list-card">
        <div class="card-header list-header">
          <div>
            <h3>Catálogo de Productos</h3>
            <span class="text-muted text-sm">${filtered.length} de ${this.products.length} productos mostrados</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-nuevo-producto">
              + Nuevo Producto
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- Barra de Búsqueda y Filtros -->
          <div class="filters-bar">
            <div class="filter-item flex-2">
              <label for="filtro-buscar">Buscar</label>
              <input 
                type="text" 
                id="filtro-buscar" 
                placeholder="Buscar por nombre, SKU o descripción..." 
                value="${this.escapeHtml(this.filter.search)}"
              />
            </div>
            <div class="filter-item flex-1">
              <label for="filtro-categoria">Categoría</label>
              <select id="filtro-categoria">
                <option value="">Todas las categorías</option>
                ${this.categories.map(c => `
                  <option value="${c.id}" ${this.filter.categoriaId === c.id ? 'selected' : ''}>
                    ${this.escapeHtml(c.nombre)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="filter-item filter-checkbox">
              <label class="checkbox-label" for="filtro-solo-alertas">
                <input 
                  type="checkbox" 
                  id="filtro-solo-alertas" 
                  ${this.filter.soloAlertas ? 'checked' : ''} 
                />
                <span>⚠️ Solo con alerta de stock</span>
              </label>
            </div>
          </div>

          <!-- Tabla de Productos -->
          <div class="table-responsive margin-top-m">
            <table class="data-table products-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Imagen</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio Base</th>
                  <th>Variantes e Inventario</th>
                  <th>Estado</th>
                  <th style="width: 140px;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderRows(filtered)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getFilteredProducts() {
    return this.products.filter(product => {
      // Filtro de búsqueda textual
      if (this.filter.search) {
        const query = this.filter.search.toLowerCase();
        const matchesName = product.nombre.toLowerCase().includes(query);
        const matchesDesc = (product.descripcion || '').toLowerCase().includes(query);
        const matchesSku = (product.skuBase || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesSku) {
          return false;
        }
      }

      // Filtro de categoría
      if (this.filter.categoriaId && product.categoriaId !== this.filter.categoriaId) {
        return false;
      }

      // Filtro solo alertas
      if (this.filter.soloAlertas) {
        const hasAlert = (product.variantes || []).some(v => 
          v.indicadorStock === 'stock_bajo' || v.indicadorStock === 'agotado' || (v.stockTotal <= (v.umbralAlerta !== undefined ? v.umbralAlerta : 3))
        );
        if (!hasAlert) return false;
      }

      return true;
    });
  }

  renderRows(products) {
    if (products.length === 0) {
      return `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            No se encontraron productos que coincidan con los criterios seleccionados.
          </td>
        </tr>
      `;
    }

    return products.map(product => {
      const cat = this.categories.find(c => c.id === product.categoriaId);
      const catNombre = cat ? cat.nombre : 'Sin categoría';

      // Imagen principal
      const principalImg = (product.imagenes && product.imagenes.find(img => img.esPrincipal)) || (product.imagenes && product.imagenes[0]);
      const imgHtml = principalImg
        ? `<img src="${this.escapeHtml(principalImg.url)}" alt="${this.escapeHtml(product.nombre)}" class="product-thumb" />`
        : `<div class="product-thumb-placeholder">📷</div>`;

      // Precio base
      const precioFormateado = (product.precioBase !== undefined && product.precioBase !== null)
        ? `${Number(product.precioBase).toFixed(2).replace('.', ',')} €`
        : '0,00 €';

      // Variantes e indicadores de inventario (FR-004, FR-006, SC-002)
      const variantesHtml = this.renderVariantsList(product.variantes || [], product.id);

      // Estado del producto
      const isArchived = product.estado === 'archivado';
      const statusBadge = isArchived
        ? `<span class="status-badge badge-archived">Archivado</span>`
        : `<span class="status-badge badge-active">Activo</span>`;

      return `
        <tr data-product-id="${product.id}" class="${isArchived ? 'row-archived' : ''}">
          <td class="text-center">${imgHtml}</td>
          <td>
            <strong>${this.escapeHtml(product.nombre)}</strong>
            <div class="text-muted text-xs">${this.escapeHtml(product.skuBase || '')}</div>
          </td>
          <td>
            <span class="badge-category">${this.escapeHtml(catNombre)}</span>
          </td>
          <td>
            <span class="price-tag">${precioFormateado}</span>
          </td>
          <td>
            <div class="variants-container">
              ${variantesHtml}
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div class="btn-group-actions">
              <button class="btn btn-sm btn-outline-primary btn-edit-product" data-id="${product.id}" title="Editar producto">
                Editar
              </button>
              ${!isArchived ? `
                <button class="btn btn-sm btn-outline-danger btn-delete-product" data-id="${product.id}" data-nombre="${this.escapeHtml(product.nombre)}" title="Archivar o eliminar">
                  Archivar
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderVariantsList(variants, productId) {
    if (variants.length === 0) {
      return `<span class="text-muted text-xs">Sin variantes configuradas</span>`;
    }

    return variants.map(v => {
      let badgeClass = 'badge-stock-normal';
      let badgeText = `${v.stockTotal} uds.`;

      if (v.stockTotal === 0 || v.indicadorStock === 'agotado') {
        badgeClass = 'badge-stock-agotado';
        badgeText = 'Agotada (0)';
      } else if (v.indicadorStock === 'stock_bajo' || v.stockTotal <= (v.umbralAlerta !== undefined ? v.umbralAlerta : 3)) {
        badgeClass = 'badge-stock-bajo';
        const unidadTexto = v.stockTotal === 1 ? 'unidad restante' : 'unidades restantes';
        badgeText = `⚠️ Stock bajo (${v.stockTotal} ${unidadTexto})`;
      }

      return `
        <div class="variant-item-row" data-variant-id="${v.id}">
          <span class="variant-name">${this.escapeHtml(v.nombre)}:</span>
          <span class="badge-stock ${badgeClass}">${badgeText}</span>
          <button 
            type="button" 
            class="btn-icon-stock btn-quick-stock" 
            data-variant-id="${v.id}" 
            data-product-id="${productId}" 
            data-variant-name="${this.escapeHtml(v.nombre)}" 
            data-stock="${v.stockTotal}" 
            data-umbral="${v.umbralAlerta !== undefined ? v.umbralAlerta : 3}"
            title="Ajustar stock"
          >
            ✏️
          </button>
        </div>
      `;
    }).join('');
  }

  bindEvents() {
    // Filtro búsqueda
    const searchInput = this.container.querySelector('#filtro-buscar');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filter.search = e.target.value;
        this.render(this.products, this.categories);
        // Devolver foco al input
        const updatedInput = this.container.querySelector('#filtro-buscar');
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.selectionStart = updatedInput.selectionEnd = updatedInput.value.length;
        }
      });
    }

    // Filtro categoría
    const catSelect = this.container.querySelector('#filtro-categoria');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.filter.categoriaId = e.target.value;
        this.render(this.products, this.categories);
      });
    }

    // Filtro solo alertas
    const soloAlertasCheck = this.container.querySelector('#filtro-solo-alertas');
    if (soloAlertasCheck) {
      soloAlertasCheck.addEventListener('change', (e) => {
        this.filter.soloAlertas = e.target.checked;
        this.render(this.products, this.categories);
      });
    }

    // Botón nuevo producto
    const btnNuevo = this.container.querySelector('#btn-nuevo-producto');
    if (btnNuevo && this.onNewProduct) {
      btnNuevo.addEventListener('click', () => {
        this.onNewProduct();
      });
    }

    // Botones de edición
    this.container.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = this.products.find(p => p.id === id);
        if (prod && this.onEditProduct) {
          this.onEditProduct(prod);
        }
      });
    });

    // Botones de eliminación / archivado
    this.container.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');
        if (confirm(`¿Está seguro de que desea archivar o eliminar el producto "${nombre}"?`)) {
          if (this.onDeleteProduct) {
            this.onDeleteProduct(id);
          }
        }
      });
    });

    // Botones de ajuste rápido de stock
    this.container.querySelectorAll('.btn-quick-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const variantId = btn.getAttribute('data-variant-id');
        const variantName = btn.getAttribute('data-variant-name');
        const currentStock = btn.getAttribute('data-stock');
        const currentUmbral = btn.getAttribute('data-umbral');

        const nuevoStockStr = prompt(`Actualizar stock para la variante "${variantName}":`, currentStock);
        if (nuevoStockStr === null) return;

        const nuevoStock = parseInt(nuevoStockStr, 10);
        if (isNaN(nuevoStock) || nuevoStock < 0) {
          alert('Por favor introduzca una cantidad entera mayor o igual a 0.');
          return;
        }

        if (this.onUpdateVariantStock) {
          this.onUpdateVariantStock({
            variantId,
            stockTotal: nuevoStock,
            umbralAlerta: parseInt(currentUmbral, 10) || 3
          });
        }
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
