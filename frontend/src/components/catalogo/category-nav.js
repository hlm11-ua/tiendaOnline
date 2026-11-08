/**
 * Componente para la navegación y selección interactiva de categorías (FR-001, Story 1)
 */
export class CategoryNav {
  constructor(containerElement, onCategoryChange) {
    this.container = typeof containerElement === 'string'
      ? document.querySelector(containerElement)
      : containerElement;
    this.onCategoryChange = onCategoryChange;
    this.categorias = [];
    this.categoriaActiva = 'todas';
  }

  /**
   * Inicializa las categorías recibidas desde la API
   * @param {Array} categorias - Lista de categorías con { id, nombre, slug, totalProductos }
   * @param {string} categoriaInicial - Slug de la categoría inicialmente activa
   */
  render(categorias, categoriaInicial = 'todas') {
    this.categorias = categorias || [];
    this.categoriaActiva = categoriaInicial || 'todas';

    if (!this.container) return;

    this.container.innerHTML = '';

    // Chip "Todas las categorías"
    const chipTodas = document.createElement('button');
    chipTodas.type = 'button';
    chipTodas.className = `category-chip ${this.categoriaActiva === 'todas' || !this.categoriaActiva ? 'active' : ''}`;
    chipTodas.dataset.slug = 'todas';
    chipTodas.textContent = 'Todas las categorías';
    chipTodas.setAttribute('role', 'tab');
    chipTodas.setAttribute('aria-selected', this.categoriaActiva === 'todas' || !this.categoriaActiva ? 'true' : 'false');
    chipTodas.addEventListener('click', () => this.seleccionar('todas'));
    this.container.appendChild(chipTodas);

    // Chips para cada categoría activa
    for (const cat of this.categorias) {
      const chip = document.createElement('button');
      chip.type = 'button';
      const isActive = this.categoriaActiva === cat.slug || this.categoriaActiva === cat.id;
      chip.className = `category-chip ${isActive ? 'active' : ''}`;
      chip.dataset.slug = cat.slug;
      chip.dataset.id = cat.id;
      chip.textContent = `${cat.nombre} (${cat.totalProductos || 0})`;
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
      chip.addEventListener('click', () => this.seleccionar(cat.slug));
      this.container.appendChild(chip);
    }
  }

  /**
   * Cambia la categoría activa y dispara el callback
   * @param {string} slug
   */
  seleccionar(slug) {
    this.setCategoriaActiva(slug);
    if (typeof this.onCategoryChange === 'function') {
      this.onCategoryChange(this.categoriaActiva);
    }
  }

  /**
   * Actualiza el estado visual del chip activo sin re-renderizar todo
   * @param {string} slug
   */
  setCategoriaActiva(slug) {
    this.categoriaActiva = slug && slug !== '' ? slug : 'todas';
    if (!this.container) return;

    const chips = this.container.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      const chipSlug = chip.dataset.slug;
      const chipId = chip.dataset.id;
      const isMatch = chipSlug === this.categoriaActiva || chipId === this.categoriaActiva;
      if (isMatch) {
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
      } else {
        chip.classList.remove('active');
        chip.setAttribute('aria-selected', 'false');
      }
    });
  }
}
