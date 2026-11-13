/**
 * Componente de Formulario de Valoración y Comentarios de Productos (FR-003, FR-004, FR-005, FR-009)
 */
export class ReviewForm {
  /**
   * @param {HTMLElement|string} container
   * @param {Object} options
   * @param {string} options.productoId
   * @param {Object} options.reviewApiService
   * @param {Object} [options.userInfo]
   * @param {Function} [options.onSuccess]
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    this.productoId = options.productoId;
    this.reviewApiService = options.reviewApiService;
    this.userInfo = options.userInfo || {
      usuarioId: localStorage.getItem('usuarioId') || 'usr-comprador',
      usuarioNombre: localStorage.getItem('usuarioNombre') || 'Comprador verificado',
      usuarioEmail: localStorage.getItem('usuarioEmail') || 'comprador@example.com'
    };
    this.onSuccess = options.onSuccess || (() => {});
    this.isSubmitting = false;
  }

  /**
   * Renderiza el formulario interactivo
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <section class="review-form-section" aria-label="Escribir valoración">
        <h4 class="review-form-title">Deja tu valoración como comprador verificado</h4>
        
        <form id="form-publicar-resena" novalidate>
          <div id="review-form-feedback" role="alert" style="display: none; margin-bottom: 1rem;"></div>

          <div class="review-form-group">
            <label class="review-form-label" id="label-rating">Puntuación obligatoria (de 1 a 5 estrellas):</label>
            <div class="star-rating-selector" role="radiogroup" aria-labelledby="label-rating">
              <input type="radio" id="star-5" name="puntuacion" value="5" aria-label="5 estrellas">
              <label for="star-5" title="5 estrellas">★</label>

              <input type="radio" id="star-4" name="puntuacion" value="4" aria-label="4 estrellas">
              <label for="star-4" title="4 estrellas">★</label>

              <input type="radio" id="star-3" name="puntuacion" value="3" aria-label="3 estrellas">
              <label for="star-3" title="3 estrellas">★</label>

              <input type="radio" id="star-2" name="puntuacion" value="2" aria-label="2 estrellas">
              <label for="star-2" title="2 estrellas">★</label>

              <input type="radio" id="star-1" name="puntuacion" value="1" aria-label="1 estrella">
              <label for="star-1" title="1 estrella">★</label>
            </div>
          </div>

          <div class="review-form-group">
            <label class="review-form-label" for="review-comentario">Tu comentario sobre la pieza artesanal:</label>
            <textarea 
              id="review-comentario" 
              name="comentario" 
              class="review-textarea" 
              placeholder="Explica qué te ha parecido el acabado, los materiales y tu experiencia con el artículo..."
              required
              minlength="3"
              maxlength="1000"
            ></textarea>
          </div>

          <button type="submit" id="btn-submit-review" class="btn-submit-review">
            Publicar valoración
          </button>
        </form>
      </section>
    `;

    const form = this.container.querySelector('#form-publicar-resena');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  /**
   * Muestra feedback visual (éxito o error)
   */
  mostrarMensaje(mensaje, tipo = 'error') {
    const feedback = this.container?.querySelector('#review-form-feedback');
    if (!feedback) return;

    feedback.className = `review-notice-banner review-notice-${tipo}`;
    feedback.textContent = mensaje;
    feedback.style.display = 'block';
  }

  /**
   * Procesa el envío del formulario
   */
  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const form = e.target;
    const feedback = this.container.querySelector('#review-form-feedback');
    if (feedback) feedback.style.display = 'none';

    const selectedStar = form.querySelector('input[name="puntuacion"]:checked');
    if (!selectedStar) {
      this.mostrarMensaje('Por favor, selecciona una puntuación entre 1 y 5 estrellas.', 'warning');
      return;
    }

    const puntuacion = parseInt(selectedStar.value, 10);
    const textarea = form.querySelector('#review-comentario');
    const comentario = textarea ? textarea.value.trim() : '';

    if (!comentario || comentario.length < 3) {
      this.mostrarMensaje('Por favor, redacta un comentario explicativo de al menos 3 caracteres.', 'warning');
      if (textarea) textarea.focus();
      return;
    }

    const submitBtn = form.querySelector('#btn-submit-review');
    try {
      this.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publicando...';
      }

      const res = await this.reviewApiService.createReview({
        productoId: this.productoId,
        puntuacion,
        comentario,
        usuarioId: this.userInfo.usuarioId,
        usuarioNombre: this.userInfo.usuarioNombre,
        usuarioEmail: this.userInfo.usuarioEmail
      });

      this.mostrarMensaje(
        res.mensaje || '¡Gracias por tu valoración! Tu reseña ha sido publicada con éxito.',
        'success'
      );

      form.reset();
      this.onSuccess(res.resena, res.resumen);
    } catch (err) {
      this.mostrarMensaje(err.message || 'Error al publicar la valoración.', 'error');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar valoración';
      }
    }
  }
}
