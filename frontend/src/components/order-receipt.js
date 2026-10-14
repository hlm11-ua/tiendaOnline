/**
 * Componente: Vista de justificante de compra y confirmación de pedido
 * Se muestra exclusivamente cuando el pago ha sido autorizado y el pedido se ha
 * persistido en estado "pagado" en la base de datos.
 */
export class OrderReceipt {
  constructor({ containerId, onNewOrder }) {
    this.container = document.getElementById(containerId);
    this.onNewOrder = onNewOrder;
  }

  /**
   * Formatea números en euros con el estándar español (12,50 €)
   */
  static formatCurrency(amount) {
    return `${Number(amount || 0).toFixed(2).replace('.', ',')} €`;
  }

  /**
   * Formatea fecha y hora en es-ES
   */
  static formatDate(isoDate) {
    if (!isoDate) return new Date().toLocaleString('es-ES');
    return new Date(isoDate).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Renderiza el justificante a partir de los datos del pedido devuelto por la API
   * @param {Object} pedido 
   */
  render(pedido) {
    if (!this.container || !pedido) return;

    const fechaFormateada = OrderReceipt.formatDate(pedido.createdAt);
    const totalFormateado = OrderReceipt.formatCurrency(pedido.total);

    const lineasHtml = (pedido.lineas || [])
      .map(
        (linea) => `
          <tr class="receipt-item-row">
            <td class="item-name font-medium">${linea.nombre || linea.varianteId}</td>
            <td class="item-qty text-center">${linea.cantidad}</td>
            <td class="item-price text-right">${OrderReceipt.formatCurrency(linea.precioUnitario)}</td>
            <td class="item-subtotal text-right font-medium">${OrderReceipt.formatCurrency(linea.subtotal)}</td>
          </tr>
        `
      )
      .join('');

    this.container.innerHTML = `
      <section class="receipt-card" aria-labelledby="receipt-title">
        <div class="receipt-header">
          <div class="success-icon-badge" aria-hidden="true">✓</div>
          <h2 id="receipt-title" class="receipt-title">¡Pago Confirmado y Pedido Registrado!</h2>
          <p class="receipt-subtitle">Hemos recibido tu pago de forma segura y tu pedido ya está en preparación.</p>
        </div>

        <div class="receipt-status-banner">
          <div class="reference-box">
            <span class="ref-label">Código de Referencia:</span>
            <span class="ref-value font-mono font-bold" id="label-referencia-pedido">${pedido.codigoReferencia}</span>
          </div>
          <span class="badge badge-paid" id="badge-estado-pedido">PAGADO</span>
        </div>

        <div class="receipt-grid">
          <div class="receipt-meta-block">
            <h3 class="meta-title">Datos del Comprador</h3>
            <p><strong>Nombre:</strong> <span id="label-comprador-nombre">${pedido.clienteNombre}</span></p>
            <p><strong>Correo electrónico:</strong> <span id="label-comprador-email">${pedido.clienteEmail}</span></p>
            <p><strong>Fecha y hora:</strong> <span>${fechaFormateada}</span></p>
          </div>

          <div class="receipt-meta-block">
            <h3 class="meta-title">Detalles de la Transacción</h3>
            <p><strong>Método de pago:</strong> Tarjeta de crédito/débito</p>
            <p><strong>Tarjeta:</strong> <span class="font-mono">${pedido.pago?.marca || 'Tarjeta'} •••• ${pedido.pago?.ultimosCuatro || '****'}</span></p>
            <p><strong>Identificador bancario:</strong> <span class="font-mono text-xs">${pedido.transaccionId || 'N/A'}</span></p>
          </div>
        </div>

        <div class="receipt-items-table-wrapper">
          <table class="receipt-table">
            <thead>
              <tr>
                <th scope="col" class="text-left">Artículo</th>
                <th scope="col" class="text-center">Cantidad</th>
                <th scope="col" class="text-right">Precio unitario</th>
                <th scope="col" class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${lineasHtml}
            </tbody>
            <tfoot>
              <tr class="receipt-total-row">
                <td colspan="3" class="text-right font-bold total-label">Total Abonado (EUR):</td>
                <td class="text-right font-bold total-amount font-mono" id="label-total-pagado">${totalFormateado}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="receipt-footer-notes">
          <p>Se ha remitido un comprobante digital a la dirección <strong>${pedido.clienteEmail}</strong>.</p>
          <p class="text-xs text-muted">Operación autorizada según la normativa bancaria europea PSD2 y estándares PCI-DSS.</p>
        </div>

        <div class="receipt-actions">
          <button type="button" class="btn btn-secondary" id="btn-imprimir-recibo">
            🖨️ Imprimir Justificante
          </button>
          <button type="button" class="btn btn-primary" id="btn-nuevo-pedido">
            🛒 Realizar Otra Compra de Prueba
          </button>
        </div>
      </section>
    `;

    const printBtn = this.container.querySelector('#btn-imprimir-recibo');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const newOrderBtn = this.container.querySelector('#btn-nuevo-pedido');
    if (newOrderBtn) {
      newOrderBtn.addEventListener('click', () => {
        if (this.onNewOrder) {
          this.onNewOrder();
        }
      });
    }

    // Scroll suave a la parte superior del justificante
    this.container.scrollIntoView({ behavior: 'smooth' });
  }
}
