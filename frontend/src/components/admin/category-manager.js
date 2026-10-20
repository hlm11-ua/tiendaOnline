/**
 * Componente: Gestor de Categorías de Productos Artesanales (FR-002)
 * Permite dar de alta categorías, listarlas y archivarlas con control de integridad referencial.
 */
export class CategoryManager {
  constructor({ containerId, onCategoryCreated, onCategoryArchived }) {
    this.container = document.getElementById(containerId);
    this.onCategoryCreated = onCategoryCreated;
    this.onCategoryArchived = onCategoryArchived;
    this.categories = [];
  }

  render(categories = []) {
    this.categories = categories;
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card category-manager-card">
        <div class="card-header">
          <h3>Gestión de Categorías</h3>
          <span class="badge-count">${categories.length} categorías</span>
        </div>
        <div class="card-body">
          <form id="form-nueva-categoria" class="category-form">
            <div class="form-row">
              <div class="form-group flex-1">
                <label for="cat-nombre">Nombre de la categoría *</label>
                <input type="text" id="cat-nombre" placeholder="Ej: Cerámica Tradicional" required maxlength="80" />
              </div>
              <div class="form-group flex-2">
                <label for="cat-desc">Descripción (opcional)</label>
                <input type="text" id="cat-desc" placeholder="Breve descripción de las piezas..." maxlength="300" />
              </div>
              <div class="form-group form-actions-inline">
                <button type="submit" class="btn btn-primary" id="btn-crear-cat">Añadir Categoría</button>
              </div>
            </div>
            <div id="cat-form-feedback" class="form-feedback hidden"></div>
          </form>

          <div class="table-responsive margin-top-m">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Slug</th>
                  <th>Productos Activos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderRows(categories)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderRows(categories) {
    if (!categories || categories.length === 0) {
      return `<tr><td colspan="6" class="text-center text-muted">No hay categorías registradas en el catálogo.</td></tr>`;
    }

    return categories.map(cat => {
      const isArchived = cat.estado === 'archivada';
      const statusBadge = isArchived
        ? '<span class="status-badge badge-archived">Archivada</span>'
        : '<span class="status-badge badge-active">Activa</span>';

      const actionButton = isArchived
        ? '<span class="text-muted text-sm">Sin acciones</span>'
        : `<button class="btn btn-sm btn-outline-danger btn-archivar-cat" data-id="${cat.id}" data-nombre="${cat.nombre}">Archivar</button>`;

      return `
        <tr data-cat-id="${cat.id}">
          <td><strong>${cat.nombre}</strong></td>
          <td class="text-sm">${cat.descripcion || '<em class="text-muted">Sin descripción</em>'}</td>
          <td><code>${cat.slug}</code></td>
          <td class="text-center"><span class="badge-pill">${cat.totalProductosActivos || 0}</span></td>
          <td>${statusBadge}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    }).join('');
  }

  bindEvents() {
    const form = this.container.querySelector('#form-nueva-categoria');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreInput = form.querySelector('#cat-nombre');
        const descInput = form.querySelector('#cat-desc');
        const feedback = form.querySelector('#cat-form-feedback');

        feedback.className = 'form-feedback hidden';
        feedback.textContent = '';

        try {
          if (this.onCategoryCreated) {
            await this.onCategoryCreated({
              nombre: nombreInput.value.trim(),
              descripcion: descInput.value.trim()
            });
            form.reset();
            feedback.className = 'form-feedback success';
            feedback.textContent = 'Categoría creada con éxito.';
          }
        } catch (err) {
          feedback.className = 'form-feedback error';
          feedback.textContent = err.message || 'Error al crear la categoría.';
        }
      });
    }

    this.container.querySelectorAll('.btn-archivar-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const nombre = btn.getAttribute('data-nombre');

        if (!confirm(`¿Desea archivar la categoría "${nombre}"?`)) {
          return;
        }

        try {
          if (this.onCategoryArchived) {
            await this.onCategoryArchived(id);
          }
        } catch (err) {
          alert(err.message || 'Error al archivar la categoría.');
        }
      });
    });
  }
}
