/**
 * Componente para gestionar los controles del formulario de filtros (FR-002, Story 2)
 */
export class CatalogFilters {
  constructor({ formSelector, onFilterChange, onReset }) {
    this.form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    this.onFilterChange = onFilterChange;
    this.onReset = onReset;

    this.inputMin = document.querySelector('#precio-min');
    this.inputMax = document.querySelector('#precio-max');
    this.selectProductor = document.querySelector('#filtro-productor');
    this.checkStock = document.querySelector('#filtro-stock');
    this.btnReset = document.querySelector('#btn-reset-filters');

    this.debounceTimer = null;
    this.initEventListeners();
  }

  /**
   * Inicializa escuchadores de eventos sobre los controles
   */
  initEventListeners() {
    if (this.inputMin) {
      this.inputMin.addEventListener('input', () => this.handleDebouncedChange());
    }

    if (this.inputMax) {
      this.inputMax.addEventListener('input', () => this.handleDebouncedChange());
    }

    if (this.selectProductor) {
      this.selectProductor.addEventListener('change', () => this.triggerChange());
    }

    if (this.checkStock) {
      this.checkStock.addEventListener('change', () => this.triggerChange());
    }

    if (this.btnReset) {
      this.btnReset.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof this.onReset === 'function') {
          this.onReset();
        }
      });
    }
  }

  handleDebouncedChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.triggerChange();
    }, 350);
  }

  triggerChange() {
    if (typeof this.onFilterChange === 'function') {
      this.onFilterChange(this.getValores());
    }
  }

  /**
   * Puebla la lista desplegable de artesanos/productores
   * @param {Array<string>} productores
   * @param {string} seleccionado
   */
  renderProductores(productores = [], seleccionado = '') {
    if (!this.selectProductor) return;

    this.selectProductor.innerHTML = '<option value="">Todos los artesanos</option>';

    for (const prod of productores) {
      const opt = document.createElement('option');
      opt.value = prod;
      opt.textContent = prod;
      if (seleccionado && seleccionado.toLowerCase() === prod.toLowerCase()) {
        opt.selected = true;
      }
      this.selectProductor.appendChild(opt);
    }
  }

  /**
   * Obtiene los valores actuales de los controles de filtro
   * @returns {Object} { minPrecio, maxPrecio, productor, enStock }
   */
  getValores() {
    return {
      minPrecio: this.inputMin && this.inputMin.value.trim() !== '' ? this.inputMin.value.trim() : null,
      maxPrecio: this.inputMax && this.inputMax.value.trim() !== '' ? this.inputMax.value.trim() : null,
      productor: this.selectProductor ? this.selectProductor.value : null,
      enStock: this.checkStock ? this.checkStock.checked : false
    };
  }

  /**
   * Establece los valores de los controles en pantalla
   * @param {Object} filtros
   */
  setValores(filtros = {}) {
    if (this.inputMin) {
      this.inputMin.value = filtros.minPrecio !== undefined && filtros.minPrecio !== null ? filtros.minPrecio : '';
    }
    if (this.inputMax) {
      this.inputMax.value = filtros.maxPrecio !== undefined && filtros.maxPrecio !== null ? filtros.maxPrecio : '';
    }
    if (this.selectProductor && filtros.productor !== undefined) {
      this.selectProductor.value = filtros.productor || '';
    }
    if (this.checkStock && filtros.enStock !== undefined) {
      this.checkStock.checked = filtros.enStock === true || filtros.enStock === 'true';
    }
  }

  /**
   * Restablece los campos de entrada a sus valores por defecto
   */
  reset() {
    if (this.inputMin) this.inputMin.value = '';
    if (this.inputMax) this.inputMax.value = '';
    if (this.selectProductor) this.selectProductor.value = '';
    if (this.checkStock) this.checkStock.checked = false;
  }
}
