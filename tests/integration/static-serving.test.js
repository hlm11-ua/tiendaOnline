import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../../backend/src/server.js';

describe('Servicio Web de Checkout y Estáticos', () => {
  it('debe servir checkout.html en la raíz /', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('Pasarela de Pago Seguro con Tarjeta'));
      assert.ok(text.includes('checkout-form-container'));
      assert.ok(text.includes('reservation-timer-container'));
    } finally {
      server.close();
    }
  });

  it('debe servir la hoja de estilos checkout.css', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/src/styles/checkout.css`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('--accent-primary'));
      assert.ok(text.includes('.reservation-badge'));
    } finally {
      server.close();
    }
  });

  it('debe servir los módulos de componentes frontend', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res1 = await fetch(`http://localhost:${port}/src/components/reservation-timer.js`);
      assert.strictEqual(res1.status, 200);

      const res2 = await fetch(`http://localhost:${port}/src/components/payment-3ds-modal.js`);
      assert.strictEqual(res2.status, 200);

      const res3 = await fetch(`http://localhost:${port}/src/components/order-receipt.js`);
      assert.strictEqual(res3.status, 200);

      const res4 = await fetch(`http://localhost:${port}/src/components/checkout-form.js`);
      assert.strictEqual(res4.status, 200);

      const resLog1 = await fetch(`http://localhost:${port}/src/components/logistics-orders-table.js`);
      assert.strictEqual(resLog1.status, 200);

      const resLog2 = await fetch(`http://localhost:${port}/src/components/dispatch-modal.js`);
      assert.strictEqual(resLog2.status, 200);

      const resLog3 = await fetch(`http://localhost:${port}/src/components/tracking-view.js`);
      assert.strictEqual(resLog3.status, 200);

      const resLog4 = await fetch(`http://localhost:${port}/src/components/shipping-notice-modal.js`);
      assert.strictEqual(resLog4.status, 200);
    } finally {
      server.close();
    }
  });

  it('debe servir logistica.html en /logistica y la hoja de estilos logistica.css', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const resPage = await fetch(`http://localhost:${port}/logistica`);
      assert.strictEqual(resPage.status, 200);
      const text = await resPage.text();
      assert.ok(text.includes('Gestión Logística y Seguimiento de Envíos'));
      assert.ok(text.includes('logistics-table-container'));
      assert.ok(text.includes('tracking-view-container'));

      const resCss = await fetch(`http://localhost:${port}/src/styles/logistica.css`);
      assert.strictEqual(resCss.status, 200);
      const cssText = await resCss.text();
      assert.ok(cssText.includes('.timeline-step'));
      assert.ok(cssText.includes('.logistics-panel'));
    } finally {
      server.close();
    }
  });

  it('debe servir catalogo.html en /admin y /admin/catalogo y sus módulos', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const resAdmin = await fetch(`http://localhost:${port}/admin`);
      assert.strictEqual(resAdmin.status, 200);
      const adminText = await resAdmin.text();
      assert.ok(adminText.includes('Gestión de Catálogo e Inventario Artesanal'));
      assert.ok(adminText.includes('product-table-container'));
      assert.ok(adminText.includes('stock-alerts-container'));
      assert.ok(adminText.includes('category-manager-container'));

      const resAdminCat = await fetch(`http://localhost:${port}/admin/catalogo`);
      assert.strictEqual(resAdminCat.status, 200);

      const resCss = await fetch(`http://localhost:${port}/src/styles/admin-catalogo.css`);
      assert.strictEqual(resCss.status, 200);
      const css = await resCss.text();
      assert.ok(css.includes('.badge-stock-bajo'));

      const resComp1 = await fetch(`http://localhost:${port}/src/components/admin/category-manager.js`);
      assert.strictEqual(resComp1.status, 200);

      const resComp2 = await fetch(`http://localhost:${port}/src/components/admin/product-form.js`);
      assert.strictEqual(resComp2.status, 200);

      const resComp3 = await fetch(`http://localhost:${port}/src/components/admin/product-list-table.js`);
      assert.strictEqual(resComp3.status, 200);

      const resComp4 = await fetch(`http://localhost:${port}/src/components/admin/stock-alerts-widget.js`);
      assert.strictEqual(resComp4.status, 200);
    } finally {
      server.close();
    }
  });

  it('debe servir ventas.html en /admin/ventas y sus módulos y estilos', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const resVentas = await fetch(`http://localhost:${port}/admin/ventas`);
      assert.strictEqual(resVentas.status, 200);
      const ventasText = await resVentas.text();
      assert.ok(ventasText.includes('Informes de Ventas'));
      assert.ok(ventasText.includes('sales-dashboard-app'));

      const resCss = await fetch(`http://localhost:${port}/src/styles/admin-ventas.css`);
      assert.strictEqual(resCss.status, 200);
      const css = await resCss.text();
      assert.ok(css.includes('.dashboard-controls-card'));
      assert.ok(css.includes('.ranking-table'));

      const resComp = await fetch(`http://localhost:${port}/src/components/admin/sales-report-view.js`);
      assert.strictEqual(resComp.status, 200);

      const resService = await fetch(`http://localhost:${port}/src/services/sales-report-api.service.js`);
      assert.strictEqual(resService.status, 200);
    } finally {
      server.close();
    }
  });
});

