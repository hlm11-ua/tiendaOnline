import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONSTANTS } from './config/constants.js';
import { errorHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

export const app = express();

// Middleware de parsing JSON
app.use(express.json());

// Servir archivos estáticos del frontend
const frontendPath = path.join(projectRoot, 'frontend');
app.use(express.static(frontendPath));
app.use('/public', express.static(path.join(frontendPath, 'public')));
app.use('/src', express.static(path.join(frontendPath, 'src')));

// Ruta principal que sirve checkout.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'checkout.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'checkout.html'));
});

// Rutas de gestión logística y seguimiento de envíos (Feature 007)
app.get('/logistica', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'logistica.html'));
});

app.get('/logistica.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'logistica.html'));
});

app.get('/seguimiento', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'logistica.html'));
});

app.get('/seguimiento.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'logistica.html'));
});

// Rutas del panel de administración del catálogo (Feature 006)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'admin', 'catalogo.html'));
});

app.get('/admin/catalogo', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'admin', 'catalogo.html'));
});

app.get('/admin/catalogo.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'admin', 'catalogo.html'));
});

// Rutas del panel de informes y estadísticas de ventas (Feature 008)
app.get('/admin/ventas', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'admin', 'ventas.html'));
});

app.get('/admin/ventas.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'public', 'admin', 'ventas.html'));
});

// Endpoint de salud del sistema
app.get('/api/health', (req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'TiendaOnline - Pasarela de Pago, Logística, Catálogo y Ventas',
    version: '1.0.0',
    moneda: CONSTANTS.CURRENCY,
    idioma: CONSTANTS.LOCALE
  });
});

// Los routers de pagos, pedidos, logística, administración de catálogo y ventas se montan a través de una función o importación diferida
export function registerRoutes(paymentRouter, orderRouter, logisticsRouter, catalogAdminRouter, salesReportRouter) {
  if (paymentRouter) {
    app.use('/api/pagos', paymentRouter);
  }
  if (orderRouter) {
    app.use('/api/pedidos', orderRouter);
  }
  if (logisticsRouter) {
    app.use('/api/logistica', logisticsRouter);
  }
  if (catalogAdminRouter) {
    app.use('/api/admin', catalogAdminRouter);
  }
  if (salesReportRouter) {
    app.use('/api/admin/ventas', salesReportRouter);
  }
  // Middleware de error al final de la cadena
  app.use(errorHandler);
}

// Inicialización de rutas por defecto si ya existen
try {
  const { paymentRoutes } = await import('./routes/payment.routes.js');
  const { orderRoutes } = await import('./routes/order.routes.js');
  let logisticsRoutes = null;
  try {
    const logisticsModule = await import('./routes/logistics.routes.js');
    logisticsRoutes = logisticsModule.logisticsRoutes;
  } catch (errLogistics) {
    // Rutas de logística aún no inicializadas
  }
  let catalogAdminRoutes = null;
  try {
    const catalogModule = await import('./routes/catalog-admin.routes.js');
    catalogAdminRoutes = catalogModule.catalogAdminRoutes;
  } catch (errCatalog) {
    // Rutas de administración de catálogo aún no inicializadas
  }
  let salesReportRoutes = null;
  try {
    const salesModule = await import('./routes/sales-report.routes.js');
    salesReportRoutes = salesModule.salesReportRoutes;
  } catch (errSales) {
    // Rutas de ventas aún no inicializadas
  }
  registerRoutes(paymentRoutes, orderRoutes, logisticsRoutes, catalogAdminRoutes, salesReportRoutes);
} catch (e) {
  app.use(errorHandler);
}

// Iniciar servidor si es el punto de entrada directo
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  app.listen(CONSTANTS.PORT, () => {
    console.log(`[TiendaOnline] Servidor activo en http://localhost:${CONSTANTS.PORT}`);
    console.log(`  - Checkout: http://localhost:${CONSTANTS.PORT}/`);
    console.log(`  - Logística: http://localhost:${CONSTANTS.PORT}/logistica`);
    console.log(`  - Panel Catálogo: http://localhost:${CONSTANTS.PORT}/admin`);
    console.log(`  - Informes Ventas: http://localhost:${CONSTANTS.PORT}/admin/ventas`);
  });
}
