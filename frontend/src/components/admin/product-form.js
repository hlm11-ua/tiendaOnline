/**
 * Componente: Formulario de alta y edición de productos artesanos (FR-003, FR-004, SC-001)
 * Gestiona ficha técnica, carga de hasta 5 imágenes (JPG, PNG, WebP <= 5 MB) y variantes dinámicas.
 */
export class ProductForm {
  constructor({ containerId, onSave, onCancel }) {
    this.container = document.getElementById(containerId);
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.categories = [];
    this.images = [];
    this.variants = [];
    this.currentProductId = null;
  }

  setCategories(categories = []) {
    this.categories = categories.filter(c => c.estado === 'activa');
  }

  openForCreate() {
    this.currentProductId = null;
    this.images = [];
    this.variants = [{ nombre: '', stockTotal: 0, umbralAlerta: 3 }];
    this.render();
  }

  openForEdit(product) {
    this.currentProductId = product.id;
    this.images = (product.imagenes || []).map(img => ({ ...img }));
    this.variants = (product.variantes || []).map(v => ({
      id: v.id,
      nombre: v.nombre,
      stockTotal: v.stockTotal || 0,
      umbralAlerta: v.umbralAlerta !== undefined ? v.umbralAlerta : 3
    }));
    if (this.variants.length === 0) {
      this.variants = [{ nombre: 'Única', stockTotal: 0, umbralAlerta: 3 }];
    }
    this.render(product);
  }

  render(product = {}) {
    if (!this.container) return;

    const isEdit = Boolean(this.currentProductId);
    const categoryOptions = this.categories.map(cat => `
      <option value="${cat.id}" ${product.categoriaId === cat.id ? 'selected' : ''}>${cat.nombre}</option>
    `).join('');

    this.container.innerHTML = `
      <div class="card product-form-card">
        <div class="card-header">
          <h3>${isEdit ? 'Editar Producto Artesanal' : 'Dar de Alta Nuevo Producto'}</h3>
          ${isEdit ? `<span class="badge-pill">ID: ${product.id}</span>` : ''}
        </div>
        <div class="card-body">
          <form id="product-edit-form" class="product-form">
            <div class="form-grid">
              <!-- Información Principal -->
              <div class="form-group full-width">
                <label for="prod-titulo">Título de la pieza artesanal *</label>
                <input type="text" id="prod-titulo" required minlength="3" maxlength="150" value="${product.titulo || ''}" placeholder="Ej: Jarrón de Cerámica Esmaltada Azul" />
              </div>

              <div class="form-group full-width">
                <label for="prod-desc">Descripción detallada *</label>
                <textarea id="prod-desc" rows="3" required placeholder="Describe los materiales, técnica artesanal, cocción o cuidados...">${product.descripcion || ''}</textarea>
              </div>

              <div class="form-group">
                <label for="prod-categoria">Categoría *</label>
                <select id="prod-categoria" required>
                  <option value="">-- Selecciona una categoría --</option>
                  ${categoryOptions}
                </select>
              </div>

              <div class="form-group">
                <label for="prod-artesano">Nombre del Artesano o Taller *</label>
                <input type="text" id="prod-artesano" required value="${product.artesano || ''}" placeholder="Ej: Taller Alfarero Hermanos Silva" />
              </div>

              <div class="form-group">
                <label for="prod-precio">Precio base en euros (€) *</label>
                <input type="number" id="prod-precio" step="0.01" min="0.01" required value="${product.precioBase !== undefined ? product.precioBase : ''}" placeholder="45.00" />
                <span class="form-help">Todas las variantes de esta pieza compartirán este precio base.</span>
              </div>
            </div>

            <!-- Sección de Imágenes (Máx. 5 fotos, 5 MB c/u) -->
            <div class="form-section margin-top-m">
              <h4>Fotografías del Producto <span class="text-sm text-muted">(Máximo 5 imágenes de hasta 5 MB en JPG, PNG o WebP)</span></h4>
              
              <div class="image-uploader-controls">
                <input type="file" id="prod-file-input" accept="image/jpeg,image/png,image/webp" multiple style="display: none;" />
                <button type="button" class="btn btn-secondary" id="btn-select-images">Subir imágenes desde el equipo</button>
                <button type="button" class="btn btn-outline" id="btn-add-image-url">Añadir URL de imagen</button>
              </div>

              <div id="images-preview-list" class="images-preview-grid margin-top-s">
                ${this.renderImagesPreview()}
              </div>
            </div>

            <!-- Sección de Variantes y Stock -->
            <div class="form-section margin-top-m">
              <div class="section-header-flex">
                <h4>Variantes e Inventario</h4>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-add-variant">+ Añadir variante</button>
              </div>
              <p class="text-sm text-muted">Define las opciones físicas (talla, tonalidad, acabado). Si no se define ninguna, se creará automáticamente una variante estándar denominada <strong>"Única"</strong>.</p>

              <div id="variants-container" class="variants-list margin-top-s">
                ${this.renderVariantsRows()}
              </div>
            </div>

            <div id="product-form-feedback" class="form-feedback hidden margin-top-s"></div>

            <div class="form-actions margin-top-m">
              <button type="submit" class="btn btn-primary" id="btn-submit-product">${isEdit ? 'Guardar Cambios' : 'Publicar Producto'}</button>
              <button type="button" class="btn btn-outline" id="btn-cancel-product">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderImagesPreview() {
    if (this.images.length === 0) {
      return `<p class="text-muted text-sm empty-images-note">No se han adjuntado imágenes aún.</p>`;
    }

    return this.images.map((img, idx) => `
      <div class="image-preview-card ${img.esPrincipal ? 'is-primary' : ''}" data-index="${idx}">
        <img src="${img.url}" alt="${img.nombreArchivo}" onerror="this.src='/public/img/placeholder.webp'" />
        <div class="image-preview-info">
          <span class="img-filename text-ellipsis" title="${img.nombreArchivo}">${img.nombreArchivo}</span>
          <span class="img-size text-muted">${(img.tamanoBytes / 1024).toFixed(0)} KB</span>
        </div>
        <div class="image-preview-actions">
          <button type="button" class="btn-img-action btn-set-primary" data-index="${idx}" title="Marcar como portada">
            ${img.esPrincipal ? '★ Portada' : '☆'}
          </button>
          <button type="button" class="btn-img-action btn-remove-image text-danger" data-index="${idx}" title="Eliminar foto">✕</button>
        </div>
      </div>
    `).join('');
  }

  renderVariantsRows() {
    if (this.variants.length === 0) {
      return `<p class="text-muted text-sm">Se creará automáticamente la variante por defecto "Única".</p>`;
    }

    return this.variants.map((v, idx) => `
      <div class="variant-row" data-index="${idx}">
        <div class="form-group flex-2">
          <label>Nombre de la variante *</label>
          <input type="text" class="input-variant-nombre" value="${v.nombre || ''}" placeholder="Ej: Pequeño, Talla M, Única" required maxlength="60" />
        </div>
        <div class="form-group flex-1">
          <label>Stock disponible *</label>
          <input type="number" class="input-variant-stock" min="0" step="1" value="${v.stockTotal !== undefined ? v.stockTotal : 0}" required />
        </div>
        <div class="form-group flex-1">
          <label>Umbral de aviso *</label>
          <input type="number" class="input-variant-umbral" min="0" step="1" value="${v.umbralAlerta !== undefined ? v.umbralAlerta : 3}" required />
        </div>
        <div class="form-group form-actions-inline">
          <button type="button" class="btn btn-sm btn-outline-danger btn-remove-variant" data-index="${idx}">Eliminar</button>
        </div>
      </div>
    `).join('');
  }

  bindEvents() {
    // Selección de archivos locales
    const fileInput = this.container.querySelector('#prod-file-input');
    const selectImagesBtn = this.container.querySelector('#btn-select-images');
    if (selectImagesBtn && fileInput) {
      selectImagesBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
          if (this.images.length >= 5) {
            alert('No se pueden añadir más de 5 imágenes por producto.');
            break;
          }

          if (file.size > 5 * 1024 * 1024) {
            alert(`El archivo "${file.name}" supera el tamaño máximo permitido de 5 MB.`);
            continue;
          }

          const reader = new FileReader();
          reader.onload = (evt) => {
            this.images.push({
              url: evt.target.result,
              nombreArchivo: file.name,
              mimeType: file.type || 'image/webp',
              tamanoBytes: file.size,
              esPrincipal: this.images.length === 0
            });
            this.updateImagesPreview();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Añadir URL manual
    const addUrlBtn = this.container.querySelector('#btn-add-image-url');
    if (addUrlBtn) {
      addUrlBtn.addEventListener('click', () => {
        if (this.images.length >= 5) {
          alert('No se pueden añadir más de 5 imágenes por producto.');
          return;
        }

        const url = prompt('Introduce la URL de la imagen:');
        if (url && url.trim()) {
          this.images.push({
            url: url.trim(),
            nombreArchivo: url.split('/').pop() || 'imagen.webp',
            mimeType: 'image/webp',
            tamanoBytes: 500000,
            esPrincipal: this.images.length === 0
          });
          this.updateImagesPreview();
        }
      });
    }

    // Acciones de imágenes
    this.container.addEventListener('click', (e) => {
      const removeImgBtn = e.target.closest('.btn-remove-image');
      if (removeImgBtn) {
        const idx = parseInt(removeImgBtn.getAttribute('data-index'), 10);
        this.images.splice(idx, 1);
        if (this.images.length > 0 && !this.images.some(img => img.esPrincipal)) {
          this.images[0].esPrincipal = true;
        }
        this.updateImagesPreview();
      }

      const setPrimaryBtn = e.target.closest('.btn-set-primary');
      if (setPrimaryBtn) {
        const idx = parseInt(setPrimaryBtn.getAttribute('data-index'), 10);
        this.images.forEach((img, i) => {
          img.esPrincipal = i === idx;
        });
        this.updateImagesPreview();
      }
    });

    // Variantes: Añadir fila
    const addVariantBtn = this.container.querySelector('#btn-add-variant');
    if (addVariantBtn) {
      addVariantBtn.addEventListener('click', () => {
        this.syncVariantsState();
        this.variants.push({ nombre: '', stockTotal: 0, umbralAlerta: 3 });
        this.updateVariantsList();
      });
    }

    // Variantes: Eliminar fila
    this.container.addEventListener('click', (e) => {
      const removeVariantBtn = e.target.closest('.btn-remove-variant');
      if (removeVariantBtn) {
        const idx = parseInt(removeVariantBtn.getAttribute('data-index'), 10);
        this.syncVariantsState();
        this.variants.splice(idx, 1);
        this.updateVariantsList();
      }
    });

    // Cancelar
    const cancelBtn = this.container.querySelector('#btn-cancel-product');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) this.onCancel();
      });
    }

    // Envío del formulario
    const form = this.container.querySelector('#product-edit-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.syncVariantsState();

        const feedback = form.querySelector('#product-form-feedback');
        feedback.className = 'form-feedback hidden';

        const payload = {
          titulo: form.querySelector('#prod-titulo').value.trim(),
          descripcion: form.querySelector('#prod-desc').value.trim(),
          categoriaId: form.querySelector('#prod-categoria').value,
          artesano: form.querySelector('#prod-artesano').value.trim(),
          precioBase: parseFloat(form.querySelector('#prod-precio').value),
          imagenes: this.images,
          variantes: this.variants.filter(v => v.nombre.trim() !== '')
        };

        try {
          if (this.onSave) {
            await this.onSave(this.currentProductId, payload);
          }
        } catch (err) {
          feedback.className = 'form-feedback error margin-top-s';
          feedback.textContent = err.message || 'Error al guardar el producto.';
        }
      });
    }
  }

  updateImagesPreview() {
    const list = this.container.querySelector('#images-preview-list');
    if (list) {
      list.innerHTML = this.renderImagesPreview();
    }
  }

  updateVariantsList() {
    const container = this.container.querySelector('#variants-container');
    if (container) {
      container.innerHTML = this.renderVariantsRows();
    }
  }

  syncVariantsState() {
    const rows = this.container.querySelectorAll('.variant-row');
    rows.forEach((row, idx) => {
      if (this.variants[idx]) {
        this.variants[idx].nombre = row.querySelector('.input-variant-nombre').value;
        this.variants[idx].stockTotal = parseInt(row.querySelector('.input-variant-stock').value, 10) || 0;
        this.variants[idx].umbralAlerta = parseInt(row.querySelector('.input-variant-umbral').value, 10) || 0;
      }
    });
  }
}
