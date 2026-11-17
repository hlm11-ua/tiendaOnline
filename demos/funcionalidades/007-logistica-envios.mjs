// Demo 007 · Procesamiento logístico y notificación de envío
import { store } from '../../backend/src/models/store.js';
import { PRODUCTOS, registrarCliente, crearPedido } from '../lib/datos.mjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
// Cuenta ficticia de prueba para la demo
const SARA = { nombre: 'Sara Morales', email: 'sara.demo@example.com', password: 'DemoTienda2026' };
let pedido = null;

export default {
  archivo: '007-logistica-envios',
  intro: {
    etiqueta: '007 · Envíos · Taller y compradores',
    titulo: 'Preparación y envío',
    descripcion: 'El taller <strong>prepara cada pedido pagado</strong>, lo despacha con transportista y código de seguimiento y el comprador <strong>recibe un aviso automático</strong>. La entrega la confirma el taller o el propio comprador.',
    escenarios: [
      'Empaquetar un pedido pagado',
      'Código de seguimiento no válido',
      'Despachar y avisar al comprador',
      'Corregir una errata del código',
      'El comprador confirma la recepción'
    ]
  },

  async preparar({ base }) {
    const idSara = await registrarCliente(base, SARA);
    pedido = crearPedido(store, { cliente: SARA.nombre, email: SARA.email, cuentaId: idSara, estado: 'pagado', lineas: [[PRODUCTOS.jarron, 1], [PRODUCTOS.tabla, 1]], diasAtras: 1 });
    crearPedido(store, { cliente: 'Daniel Ruiz', email: 'daniel.demo@example.com', estado: 'entregado', lineas: [[PRODUCTOS.manta, 1]], diasAtras: 9 });
  },

  async guion(demo) {
    const ref = pedido.codigoReferencia;
    await demo.iniciarSesion(ADMIN_EMAIL, ADMIN_PASSWORD);
    await demo.ir('/logistica', { esperar: 1600 });

    // 1. Preparar
    await demo.escenario(1, 'Empaquetar un pedido pagado',
      'En la mesa del taller aparece el pedido pagado de Sara. Pulsamos «Iniciar preparación».');
    await demo.clic(`.btn-iniciar-prep[data-ref="${ref}"]`, { esperar: 1800 });
    await demo.narrar('El pedido pasa a «En preparación» mientras se empaquetan las piezas.');

    // 2. Tracking inválido
    await demo.escenario(2, 'Código de seguimiento no válido',
      'Al despachar elegimos el transportista y escribimos por error un código de solo 4 caracteres.', { posicion: 'lado' });
    await demo.clic(`.btn-despachar[data-ref="${ref}"]`, { esperar: 1300 });
    await demo.elegir('#select-transportista', 'Correos de España');
    await demo.escribir('#input-tracking', 'AB12');
    await demo.clic('#btn-submit-despacho', { esperar: 1600 });
    await demo.narrar('El código debe tener entre 6 y 32 caracteres: el pedido no se despacha.', { posicion: 'lado' });

    // 3. Despacho + aviso
    await demo.escenario(3, 'Despachar y avisar al comprador',
      'Escribimos el código correcto que nos ha dado Correos y confirmamos.', { posicion: 'lado' });
    await demo.escribir('#input-tracking', 'CORREOS-ES-998877');
    await demo.clic('#btn-submit-despacho', { esperar: 2000 });
    await demo.narrar('El pedido sale de la tienda y se envía un aviso automático. Lo abrimos para verlo.', { posicion: 'abajo' });
    await demo.clic(`.btn-ver-avisos[data-ref="${ref}"]`, { esperar: 1800 });
    await demo.narrar('Este es el correo que recibe Sara, con el transportista y el código de seguimiento.', { posicion: 'abajo' });
    await demo.clic('#btn-cerrar-notice-bottom', { esperar: 900 });

    // 4. Rectificación
    await demo.escenario(4, 'Corregir una errata del código',
      'Nos damos cuenta de una errata en el código. Lo rectificamos antes de la entrega.', { posicion: 'lado' });
    await demo.clic(`.btn-rectificar[data-ref="${ref}"]`, { esperar: 1300 });
    await demo.escribir('#input-tracking', 'CORREOS-ES-998878');
    await demo.escribir('#input-notas', 'Errata al copiar la etiqueta', { retardo: 30 });
    await demo.clic('#btn-submit-despacho', { esperar: 2000 });
    await demo.narrar('Se guarda el nuevo código y Sara recibe un segundo aviso con la corrección.', { posicion: 'abajo' });

    // 5. Confirmación del comprador
    await demo.cerrarSesion();
    await demo.iniciarSesion(SARA.email, SARA.password);
    await demo.escenario(5, 'El comprador confirma la recepción',
      'Sara ve el aviso en su cuenta y, al recibir el paquete, consulta el seguimiento de su pedido.');
    await demo.moverA('.avisos-buzon');
    await demo.pausa(2000);
    await demo.ir('/logistica', { esperar: 1500 });
    await demo.escribir('#input-search-ref', ref);
    await demo.clic('#btn-buscar-seguimiento', { esperar: 1800 });
    await demo.clic('#btn-cliente-confirmar-entrega', { esperar: 2200 });
    await demo.narrar('Sara pulsa «He recibido mi pedido» y el pedido queda entregado.');
  }
};
