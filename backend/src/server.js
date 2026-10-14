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

// Endpoint de salud del sistema
app.get('/api/health', (req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'TiendaOnline - Pasarela de Pago',
    version: '1.0.0',
    moneda: CONSTANTS.CURRENCY,
    idioma: CONSTANTS.LOCALE
  });
});

// Los routers de pagos y pedidos se montan a través de una función o importación diferida
export function registerRoutes(paymentRouter, orderRouter) {
  if (paymentRouter) {
    app.use('/api/pagos', paymentRouter);
  }
  if (orderRouter) {
    app.use('/api/pedidos', orderRouter);
  }
  // Middleware de error al final de la cadena
  app.use(errorHandler);
}

// Inicialización de rutas por defecto si ya existen
try {
  const { paymentRoutes } = await import('./routes/payment.routes.js');
  const { orderRoutes } = await import('./routes/order.routes.js');
  registerRoutes(paymentRoutes, orderRoutes);
} catch (e) {
  // Las rutas se registrarán formalmente en T019
  app.use(errorHandler);
}

// Iniciar servidor si es el punto de entrada directo
if (process.argv[1] === __filename) {
  app.listen(CONSTANTS.PORT, () => {
    console.log(`[TiendaOnline] Servidor de pago seguro activo en http://localhost:${CONSTANTS.PORT}`);
  });
}
