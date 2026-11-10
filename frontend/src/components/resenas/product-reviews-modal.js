import { ReviewApiService } from '../../services/review-api.service.js';
import { ReviewForm } from './review-form.js';

/**
 * Componente Modal Accesible de Reseñas y Valoraciones (Feature 005)
 */
export class ProductReviewsModal {
  /**
   * @param {Object} [options]
   * @param {ReviewApiService} [options.reviewApiService]
   * @param {Function} [options.onUpdate]
   */
  constructor(options = {}) {
    this.reviewApiService = options.reviewApiService || new ReviewApiService();
    this.onUpdate = options.onUpdate || (() => {});
    this.modalEl = null;
    this.productoActual = null;
    this.userInfo = {
      usuarioId: localStorage.getItem('usuarioId') || 'usr-comprador',
      usuarioNombre: localStorage.getItem('usuarioNombre') || 'Comprador verificado',
      usuarioEmail: localStorage.getItem('usuarioEmail') || 'comprador@example.com'
    };

    this.init();
  }

  /**
   * Inicializa la estructura del modal en el body si no existe
   */
  init() {
    let backdrop = document.querySelector('#modal-resenas-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-resenas-backdrop';
      backdrop.className = 'reviews-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-hidden', 'true');

      backdrop.innerHTML = `
        <div class="reviews-modal-dialog" role="document">
          <header class="reviews-modal-header">
            <div>
              <h3 id="modal-reviews-title" class="reviews-modal-title">Opiniones de compradores</h3>
              <p id="modal-reviews-subtitle" class="reviews-modal-subtitle">Cargando información...</p>
            </div>
            <button type="button" class="reviews-modal-close" id="btn-cerrar-modal-resenas" aria-label="Cerrar ventana de opiniones">
              &times;
            </button>
          </header>
          <div class="reviews-modal-body" id="modal-reviews-body">
            <p style="color: #94a3b8; text-align: center;">Cargando valoraciones...</p>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);
    }

    this.modalEl = backdrop;

    // Eventos de cierre
    const btnCerrar = this.modalEl.querySelector('#btn-cerrar-modal-resenas');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => this.cerrar());
    }

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.cerrar();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) {
        this.cerrar();
      }
    });
  }

  /**
   * Abre el modal y carga los datos del producto
   * @param {string} productoId
   * @param {string} [titulo]
   */
  async abrir(productoId, titulo = 'Pieza artesanal') {
    if (!productoId) return;

    this.productoActual = { id: productoId, titulo };
    this.modalEl.classList.add('active');
    this.modalEl.setAttribute('aria-hidden', 'false');

    const titleEl = this.modalEl.querySelector('#modal-reviews-title');
    const subtitleEl = this.modalEl.querySelector('#modal-reviews-subtitle');
    const bodyEl = this.modalEl.querySelector('#modal-reviews-body');

    if (titleEl) titleEl.textContent = `Opiniones sobre ${titulo}`;
    if (subtitleEl) subtitleEl.textContent = 'Valoraciones reales de compradores verificados';
    if (bodyEl) {
      bodyEl.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">Cargando opiniones...</p>';
    }

    try {
      const [resumen, elegibilidad] = await Promise.all([
        this.reviewApiService.getReviewsByProduct(productoId).catch(() => ({
          productoId,
          media: 0,
          total: 0,
          distribucion: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          items: []
        })),
        this.reviewApiService.checkReviewEligibility(productoId, this.userInfo).catch(() => ({
          puedeValorar: false,
          motivo: 'SIN_COMPRA',
          mensaje: 'Solo los clientes que hayan comprado previamente este producto pueden valorarlo.'
        }))
      ]);

      this.renderContenido(resumen, elegibilidad);
    } catch (err) {
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div class="review-notice-banner review-notice-error">
            ${err.message || 'Error al cargar las valoraciones.'}
          </div>
        `;
      }
    }

    // Foco en botón de cerrar para accesibilidad
    const btnCerrar = this.modalEl.querySelector('#btn-cerrar-modal-resenas');
    if (btnCerrar) btnCerrar.focus();
  }

  /**
   * Cierra el modal
   */
  cerrar() {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('active');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  /**
   * Renderiza el cuerpo completo del modal
   */
  renderContenido(resumen, elegibilidad) {
    const bodyEl = this.modalEl.querySelector('#modal-reviews-body');
    if (!bodyEl) return;

    bodyEl.innerHTML = '';

    // 1. Tarjeta de resumen de nota media
    const summaryCard = document.createElement('div');
    summaryCard.className = 'reviews-summary-card';
    const mediaFormateada = resumen.total > 0 ? resumen.media.toFixed(1).replace('.', ',') : '0,0';
    const estrellasStr = this.renderEstrellas(resumen.media);

    summaryCard.innerHTML = `
      <div class="reviews-average-score">${mediaFormateada}</div>
      <div>
        <div class="reviews-stars-display" aria-label="${resumen.media} de 5 estrellas">
          ${estrellasStr}
        </div>
        <p class="reviews-total-text">
          ${resumen.total === 1 ? '1 valoración verificada' : `${resumen.total} valoraciones verificadas`}
        </p>
      </div>
    `;
    bodyEl.appendChild(summaryCard);

    // 2. Sección de elegibilidad / formulario
    const eligibilityContainer = document.createElement('div');
    bodyEl.appendChild(eligibilityContainer);

    if (elegibilidad.puedeValorar) {
      // Formulario activo
      const formWrapper = document.createElement('div');
      eligibilityContainer.appendChild(formWrapper);

      const form = new ReviewForm(formWrapper, {
        productoId: this.productoActual.id,
        reviewApiService: this.reviewApiService,
        userInfo: this.userInfo,
        onSuccess: (nuevaResena, nuevoResumen) => {
          this.onUpdate(nuevaResena, nuevoResumen);
          // Actualizar elegibilidad a YA_VALORADO tras el envío
          setTimeout(() => {
            this.abrir(this.productoActual.id, this.productoActual.titulo);
          }, 1200);
        }
      });
      form.render();
    } else if (elegibilidad.motivo === 'YA_VALORADO') {
      // Aviso de ya valorado con visualización de su reseña
      const previa = elegibilidad.resenaPrevia;
      eligibilityContainer.innerHTML = `
        <div class="review-notice-banner review-notice-info">
          <div>
            <strong>✓ Ya has valorado este producto</strong>
            <p style="margin-top: 0.25rem;">Tu opinión de <strong>${previa?.puntuacion || 5} estrellas</strong> ya está publicada en la tienda.</p>
            ${previa?.comentario ? `<p style="margin-top: 0.4rem; font-style: italic; color: #cbd5e1;">"${previa.comentario}"</p>` : ''}
          </div>
        </div>
      `;
    } else {
      // Aviso de compra requerida o login
      eligibilityContainer.innerHTML = `
        <div class="review-notice-banner review-notice-warning">
          <div>
            <strong>ℹ Compras verificadas únicamente</strong>
            <p style="margin-top: 0.25rem;">${elegibilidad.mensaje || 'Solo los clientes que hayan comprado previamente este producto pueden valorarlo.'}</p>
          </div>
        </div>
      `;
    }

    // 3. Listado de opiniones
    const listSection = document.createElement('section');
    listSection.className = 'reviews-list-container';
    listSection.setAttribute('aria-label', 'Lista de comentarios');

    listSection.innerHTML = `
      <h4 class="reviews-list-title">Comentarios de clientes</h4>
    `;

    if (!resumen.items || resumen.items.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'reviews-empty-state';
      emptyNotice.textContent = 'Este producto aún no cuenta con valoraciones. ¡Sé el primero en opinar tras comprarlo!';
      listSection.appendChild(emptyNotice);
    } else {
      for (const rev of resumen.items) {
        const card = document.createElement('article');
        card.className = 'review-card';

        const fechaFormateada = new Date(rev.fechaCreacion).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        card.innerHTML = `
          <div class="review-card-header">
            <div class="review-author-info">
              <span class="review-author-name">${rev.usuarioNombre || 'Comprador'}</span>
              <span class="review-badge-verified">Comprador verificado</span>
            </div>
            <time class="review-date" datetime="${rev.fechaCreacion}">${fechaFormateada}</time>
          </div>
          <div class="review-stars" aria-label="${rev.puntuacion} de 5 estrellas">
            ${this.renderEstrellas(rev.puntuacion)}
          </div>
          <p class="review-comment-text">${this.escapeHtml(rev.comentario)}</p>
        `;
        listSection.appendChild(card);
      }
    }

    bodyEl.appendChild(listSection);
  }

  /**
   * Genera la cadena de estrellas visuales
   */
  renderEstrellas(puntuacion) {
    const p = Math.round(puntuacion || 0);
    const llenas = '★'.repeat(Math.max(0, Math.min(5, p)));
    const vacias = '☆'.repeat(Math.max(0, 5 - p));
    return `${llenas}${vacias}`;
  }

  /**
   * Sanitiza strings para inserción en HTML
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
