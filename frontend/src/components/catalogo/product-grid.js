/**
 * Componente para renderizar la cuadrícula de productos del catálogo (FR-001, FR-006, FR-007)
 */
export class ProductGrid {
  constructor(gridContainer, resultsCountElement) {
    this.gridContainer = typeof gridContainer === 'string'
      ? document.querySelector(gridContainer)
      : gridContainer;
    this.resultsCountElement = typeof resultsCountElement === 'string'
      ? document.querySelector(resultsCountElement)
      : resultsCountElement;
  }

  /**
   * Renderiza el listado de productos
   * @param {Array} productos
   * @param {number} total
   */
  render(productos = [], total = null) {
    if (!this.gridContainer) return;

    this.gridContainer.innerHTML = '';

    const count = total !== null ? total : productos.length;
    this.actualizarConteo(count);

    if (productos.length === 0) {
      return;
    }

    for (const prod of productos) {
      const card = this.crearTarjetaProducto(prod);
      this.gridContainer.appendChild(card);
    }
  }

  /**
   * Actualiza el texto de conteo de resultados
   * @param {number} total
   */
  actualizarConteo(total) {
    if (!this.resultsCountElement) return;
    if (total === 1) {
      this.resultsCountElement.innerHTML = 'Mostrando <strong>1</strong> producto';
    } else {
      this.resultsCountElement.innerHTML = `Mostrando <strong>${total}</strong> productos`;
    }
  }

  /**
   * Construye el nodo DOM de una tarjeta de producto
   * @param {Object} prod
   * @returns {HTMLElement}
   */
  crearTarjetaProducto(prod) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.id = prod.id;

    // Imagen principal o placeholder
    const imagenPrincipal = Array.isArray(prod.imagenes) && prod.imagenes.length > 0
      ? (prod.imagenes.find(img => img.esPrincipal) || prod.imagenes[0]).url
      : '/public/uploads/placeholder.webp';

    const stockBadgeClass = prod.enStock ? 'badge-in-stock' : 'badge-out-stock';
    const stockBadgeText = prod.enStock ? 'En stock' : 'Agotado';

    card.innerHTML = `
      <div class="product-image-container">
        <img 
          src="${imagenPrincipal}" 
          alt="${prod.titulo}" 
          class="product-image"
          loading="lazy"
          onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'><rect fill=\\'%231e293b\\' width=\\'300\\' height=\\'200\\'/><text fill=\\'%2394a3b8\\' font-family=\\'sans-serif\\' font-size=\\'14\\' text-anchor=\\'middle\\' x=\\'150\\' y=\\'105\\'>Artesan\\u00EDa</text></svg>';"
        >
        <span class="product-badge-stock ${stockBadgeClass}">
          ${stockBadgeText}
        </span>
      </div>
      <div class="product-body">
        <span class="product-category-tag">${prod.categoriaNombre || 'Artesanía'}</span>
        <h3 class="product-title">${prod.titulo}</h3>
        <p class="product-artisan">
          <span>Por:</span>
          <strong>${prod.artesano || 'Artesano anónimo'}</strong>
        </p>
        <div class="product-footer">
          <span class="product-price">${prod.precioFormateado || `${prod.precioBase.toFixed(2)} €`}</span>
          <a href="/checkout.html?productoId=${encodeURIComponent(prod.id)}" class="btn-buy-link" aria-label="Comprar ${prod.titulo}">
            Comprar
          </a>
        </div>
      </div>
    `;

    return card;
  }
}
