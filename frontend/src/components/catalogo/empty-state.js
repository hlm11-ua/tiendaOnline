/**
 * Componente para gestionar el estado visual cuando no hay resultados de búsqueda (FR-008, FR-009, Story 4)
 */
export class EmptyState {
  constructor({ containerSelector = '#estado-vacio', buttonSelector = '#btn-cta-reset', onReset }) {
    this.container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    this.button = typeof buttonSelector === 'string'
      ? document.querySelector(buttonSelector)
      : buttonSelector;
    this.onReset = onReset;

    this.initEventListeners();
  }

  initEventListeners() {
    if (this.button) {
      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof this.onReset === 'function') {
          this.onReset();
        }
      });
    }
  }

  /**
   * Muestra el bloque de aviso de estado vacío
   */
  mostrar() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * Oculta el bloque de estado vacío
   */
  ocultar() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
