// Demo 004 · Cuentas de usuario y seguimiento de fases de pedido
import { store } from '../../backend/src/models/store.js';
import { LogisticsService } from '../../backend/src/services/logistics.service.js';
import { PRODUCTOS, registrarCliente, crearPedido } from '../lib/datos.mjs';

// Cuentas ficticias de prueba para la demo
const MARTA = { nombre: 'Marta Alfarera', email: 'marta.demo@example.com', password: 'DemoTienda2026' };
const LUCIA = { nombre: 'Lucía Ramos', email: 'lucia.demo@example.com', password: 'DemoTienda2026' };
let pedidoPendienteDeEnvio = null;

export default {
  archivo: '004-cuentas-seguimiento',
  intro: {
    etiqueta: '004 · Mi cuenta · Compradores',
    titulo: 'Cuenta y seguimiento',
    descripcion: 'Cada comprador <strong>crea su cuenta con correo y contraseña</strong>, mantiene la sesión abierta y consulta <strong>en qué fase está cada pedido</strong>, con el código de seguimiento en cuanto sale del taller.',
    escenarios: [
      'Contraseña corta y correo repetido',
      'Crear una cuenta',
      'La sesión se mantiene',
      'Historial con las fases del pedido',
      'El taller despacha y aparece el seguimiento',
      'Cerrar sesión'
    ]
  },

  async preparar({ base }) {
    await registrarCliente(base, LUCIA);
    // Compras previas hechas con el correo de Marta (aparecerán al crear su cuenta)
    crearPedido(store, { cliente: MARTA.nombre, email: MARTA.email, estado: 'entregado', lineas: [[PRODUCTOS.tabla, 1]], diasAtras: 20 });
    crearPedido(store, { cliente: MARTA.nombre, email: MARTA.email, estado: 'en_preparacion', lineas: [[PRODUCTOS.manta, 1]], diasAtras: 4 });
    pedidoPendienteDeEnvio = crearPedido(store, { cliente: MARTA.nombre, email: MARTA.email, estado: 'pagado', lineas: [[PRODUCTOS.jarron, 2]], diasAtras: 1 });
  },

  async guion(demo) {
    await demo.ir('/cuenta');

    // 1. Validaciones
    await demo.escenario(1, 'Contraseña corta y correo repetido',
      'Abrimos «Crear cuenta» e intentamos registrarnos con una contraseña de solo 5 caracteres.');
    await demo.clic('#tab-register-btn', { esperar: 800 });
    await demo.escribir('#register-name', MARTA.nombre);
    await demo.escribir('#register-email', MARTA.email);
    await demo.escribir('#register-password', 'corta');
    await demo.clic('#btn-register-submit', { esperar: 1600 });
    await demo.narrar('La tienda exige al menos 8 caracteres. Probamos ahora con un correo que ya tiene cuenta.');
    await demo.escribir('#register-email', LUCIA.email);
    await demo.escribir('#register-password', MARTA.password, { retardo: 35 });
    await demo.clic('#btn-register-submit', { esperar: 1600 });
    await demo.narrar('Tampoco se permite: ese correo ya está registrado.');

    // 2. Registro correcto
    await demo.escenario(2, 'Crear una cuenta',
      'Con el correo de Marta y una contraseña válida, la cuenta se crea al momento.');
    await demo.escribir('#register-email', MARTA.email);
    await demo.clic('#btn-register-submit', { esperar: 2200 });
    await demo.narrar('Marta entra directamente en su panel. Sus compras anteriores con ese correo ya aparecen.');

    // 3. Sesión persistente
    await demo.escenario(3, 'La sesión se mantiene',
      'Marta sigue comprando por el catálogo y vuelve a «Mi Cuenta» más tarde.');
    await demo.clic('a.site-header__link[href="/catalogo"]', { navega: true, esperar: 1400 });
    await demo.clic('a.site-header__link[href="/cuenta"]', { navega: true, esperar: 1600 });
    await demo.narrar('No tiene que volver a identificarse: la sesión dura 30 días.');

    // 4. Historial y fases
    await demo.escenario(4, 'Historial con las fases del pedido',
      'Cada pedido muestra su fase: pagado, en preparación, salido de la tienda o entregado.');
    await demo.clic('.btn-ver-pedido', { esperar: 1800 });
    await demo.narrar('El seguimiento detalla la fase actual dentro de las cuatro fases oficiales.', { posicion: 'lado' });
    await demo.clic('#btn-modal-done', { esperar: 900 });

    // 5. Despacho y código de seguimiento
    await demo.escenario(5, 'El taller despacha y aparece el seguimiento',
      'Mientras Marta mira su panel, el taller empaqueta y despacha su pedido con Correos.', { posicion: 'arriba' });
    LogisticsService.iniciarPreparacion(pedidoPendienteDeEnvio.codigoReferencia);
    LogisticsService.despacharPedido(pedidoPendienteDeEnvio.codigoReferencia, {
      transportista: 'Correos de España',
      numeroSeguimiento: 'CORREOS-ES-554433'
    });
    await demo.pausa(5500);
    await demo.narrar('Sin recargar, el pedido pasa a «Salido de la tienda» y llega el aviso con el código de seguimiento.', { posicion: 'arriba' });
    await demo.moverA('.avisos-buzon');
    await demo.pausa(2500);

    // 6. Cerrar sesión
    await demo.escenario(6, 'Cerrar sesión',
      'Marta cierra la sesión desde su panel.', { posicion: 'abajo' });
    await demo.clic('#btn-logout', { esperar: 1800 });
    await demo.narrar('Vuelve el formulario de acceso: sin sesión no se ven datos personales.');
  }
};
