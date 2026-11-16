import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../../backend/src/server.js';

// Cada prueba hace varias peticiones seguidas al mismo servidor y fetch reutiliza la conexión.
// Si el servidor cierra la conexión inactiva (keepAliveTimeout, 5 s por defecto) justo cuando el
// cliente la reutiliza, la petición falla con ECONNRESET; ocurre con la suite en paralelo.
function iniciarServidor() {
  const server = app.listen(0);
  server.keepAliveTimeout = 60_000;
  return server;
}

function cerrarServidor(server) {
  server.closeAllConnections();
  server.close();
}

describe('Servicio Web de Checkout y Estáticos', () => {
  it('debe servir el catálogo en la raíz / y checkout en /checkout', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Catálogo de Productos Artesanales'));

      const resCheckout = await fetch(`http://127.0.0.1:${port}/checkout`);
      assert.strictEqual(resCheckout.status, 200);
      const checkoutText = await resCheckout.text();
      assert.ok(checkoutText.includes('Pasarela de Pago Seguro con Tarjeta'));
      assert.ok(checkoutText.includes('checkout-form-container'));
      assert.ok(checkoutText.includes('reservation-timer-container'));
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir la hoja de estilos checkout.css', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/src/styles/checkout.css`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('--accent-primary'));
      assert.ok(text.includes('.reservation-badge'));
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir los módulos de componentes frontend', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const res1 = await fetch(`http://127.0.0.1:${port}/src/components/reservation-timer.js`);
      assert.strictEqual(res1.status, 200);

      const res2 = await fetch(`http://127.0.0.1:${port}/src/components/payment-3ds-modal.js`);
      assert.strictEqual(res2.status, 200);

      const res3 = await fetch(`http://127.0.0.1:${port}/src/components/order-receipt.js`);
      assert.strictEqual(res3.status, 200);

      const res4 = await fetch(`http://127.0.0.1:${port}/src/components/checkout-form.js`);
      assert.strictEqual(res4.status, 200);

      const resLog1 = await fetch(`http://127.0.0.1:${port}/src/components/logistics-orders-table.js`);
      assert.strictEqual(resLog1.status, 200);

      const resLog2 = await fetch(`http://127.0.0.1:${port}/src/components/dispatch-modal.js`);
      assert.strictEqual(resLog2.status, 200);

      const resLog3 = await fetch(`http://127.0.0.1:${port}/src/components/tracking-view.js`);
      assert.strictEqual(resLog3.status, 200);

      const resLog4 = await fetch(`http://127.0.0.1:${port}/src/components/shipping-notice-modal.js`);
      assert.strictEqual(resLog4.status, 200);
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir logistica.html en /logistica y la hoja de estilos logistica.css', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const resPage = await fetch(`http://127.0.0.1:${port}/logistica`);
      assert.strictEqual(resPage.status, 200);
      const text = await resPage.text();
      assert.ok(text.includes('Gestión Logística y Seguimiento de Envíos'));
      assert.ok(text.includes('logistics-table-container'));
      assert.ok(text.includes('tracking-view-container'));

      const resCss = await fetch(`http://127.0.0.1:${port}/src/styles/logistica.css`);
      assert.strictEqual(resCss.status, 200);
      const cssText = await resCss.text();
      assert.ok(cssText.includes('.timeline-step'));
      assert.ok(cssText.includes('.logistics-panel'));
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir catalogo.html en /admin y /admin/catalogo y sus módulos', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const resAdmin = await fetch(`http://127.0.0.1:${port}/admin`);
      assert.strictEqual(resAdmin.status, 200);
      const adminText = await resAdmin.text();
      assert.ok(adminText.includes('Gestión de Catálogo e Inventario Artesanal'));
      assert.ok(adminText.includes('product-table-container'));
      assert.ok(adminText.includes('stock-alerts-container'));
      assert.ok(adminText.includes('category-manager-container'));

      const resAdminCat = await fetch(`http://127.0.0.1:${port}/admin/catalogo`);
      assert.strictEqual(resAdminCat.status, 200);

      const resCss = await fetch(`http://127.0.0.1:${port}/src/styles/admin-catalogo.css`);
      assert.strictEqual(resCss.status, 200);
      const css = await resCss.text();
      assert.ok(css.includes('.badge-stock-bajo'));

      const resComp1 = await fetch(`http://127.0.0.1:${port}/src/components/admin/category-manager.js`);
      assert.strictEqual(resComp1.status, 200);

      const resComp2 = await fetch(`http://127.0.0.1:${port}/src/components/admin/product-form.js`);
      assert.strictEqual(resComp2.status, 200);

      const resComp3 = await fetch(`http://127.0.0.1:${port}/src/components/admin/product-list-table.js`);
      assert.strictEqual(resComp3.status, 200);

      const resComp4 = await fetch(`http://127.0.0.1:${port}/src/components/admin/stock-alerts-widget.js`);
      assert.strictEqual(resComp4.status, 200);
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir ventas.html en /admin/ventas y sus módulos y estilos', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const resVentas = await fetch(`http://127.0.0.1:${port}/admin/ventas`);
      assert.strictEqual(resVentas.status, 200);
      const ventasText = await resVentas.text();
      assert.ok(ventasText.includes('Informes de Ventas'));
      assert.ok(ventasText.includes('sales-dashboard-app'));

      const resCss = await fetch(`http://127.0.0.1:${port}/src/styles/admin-ventas.css`);
      assert.strictEqual(resCss.status, 200);
      const css = await resCss.text();
      assert.ok(css.includes('.dashboard-controls-card'));
      assert.ok(css.includes('.ranking-table'));

      const resComp = await fetch(`http://127.0.0.1:${port}/src/components/admin/sales-report-view.js`);
      assert.strictEqual(resComp.status, 200);

      const resService = await fetch(`http://127.0.0.1:${port}/src/services/sales-report-api.service.js`);
      assert.strictEqual(resService.status, 200);
    } finally {
      cerrarServidor(server);
    }
  });

  it('debe servir catalogo.html en /catalogo y /catalogo.html con sus módulos y estilos', async () => {
    const server = iniciarServidor();
    const port = server.address().port;

    try {
      const resCatalogo = await fetch(`http://127.0.0.1:${port}/catalogo`);
      assert.strictEqual(resCatalogo.status, 200);
      const catalogoText = await resCatalogo.text();
      assert.ok(catalogoText.includes('Catálogo de Productos Artesanales'));
      assert.ok(catalogoText.includes('categories-container'));
      assert.ok(catalogoText.includes('products-grid'));
      assert.ok(catalogoText.includes('filters-aside'));

      const resCatalogoHtml = await fetch(`http://127.0.0.1:${port}/catalogo.html`);
      assert.strictEqual(resCatalogoHtml.status, 200);

      const resCss = await fetch(`http://127.0.0.1:${port}/src/styles/catalogo.css`);
      assert.strictEqual(resCss.status, 200);
      const css = await resCss.text();
      assert.ok(css.includes('.product-card'));
      assert.ok(css.includes('.category-chip'));

      const resComp1 = await fetch(`http://127.0.0.1:${port}/src/components/catalogo/category-nav.js`);
      assert.strictEqual(resComp1.status, 200);

      const resComp2 = await fetch(`http://127.0.0.1:${port}/src/components/catalogo/product-grid.js`);
      assert.strictEqual(resComp2.status, 200);

      const resComp3 = await fetch(`http://127.0.0.1:${port}/src/components/catalogo/catalog-filters.js`);
      assert.strictEqual(resComp3.status, 200);

      const resComp4 = await fetch(`http://127.0.0.1:${port}/src/components/catalogo/url-sync.js`);
      assert.strictEqual(resComp4.status, 200);

      const resComp5 = await fetch(`http://127.0.0.1:${port}/src/components/catalogo/empty-state.js`);
      assert.strictEqual(resComp5.status, 200);

      const resService = await fetch(`http://127.0.0.1:${port}/src/services/catalog-api.service.js`);
      assert.strictEqual(resService.status, 200);

      // Reseñas y valoraciones (Feature 005)
      const resResenasCss = await fetch(`http://127.0.0.1:${port}/src/styles/resenas.css`);
      assert.strictEqual(resResenasCss.status, 200);
      const resenasCss = await resResenasCss.text();
      assert.ok(resenasCss.includes('.reviews-modal-dialog'));
      assert.ok(resenasCss.includes('.star-rating-selector'));

      const resModalReviews = await fetch(`http://127.0.0.1:${port}/src/components/resenas/product-reviews-modal.js`);
      assert.strictEqual(resModalReviews.status, 200);

      const resFormReviews = await fetch(`http://127.0.0.1:${port}/src/components/resenas/review-form.js`);
      assert.strictEqual(resFormReviews.status, 200);

      const resReviewsApi = await fetch(`http://127.0.0.1:${port}/src/services/review-api.service.js`);
      assert.strictEqual(resReviewsApi.status, 200);
    } finally {
      cerrarServidor(server);
    }
  });
});

