// Demo 003 · Pago seguro con tarjeta y confirmación condicionada
export default {
  archivo: '003-pago-tarjeta',
  intro: {
    etiqueta: '003 · Pago · Compradores',
    titulo: 'Pago seguro con tarjeta',
    descripcion: 'El pedido <strong>solo se confirma cuando el banco autoriza el cobro</strong>. Por encima de 100 € se pide <strong>verificación 3D Secure</strong>, y las piezas quedan reservadas 10 minutos mientras se paga.',
    escenarios: [
      'Compra directa de hasta 100 €',
      'Más de 100 €: verificación 3D Secure',
      'Tarjeta sin fondos',
      'Tarjeta bloqueada por el banco',
      'La reserva de 10 minutos caduca'
    ]
  },

  async guion(demo) {
    // 1. Pago directo
    await demo.ir('/carrito?anadirProducto=art-001', { esperar: 1200 });
    await demo.escenario(1, 'Compra directa de hasta 100 €',
      'Con el jarrón de 45 € en la cesta pasamos a tramitar el pedido.');
    await demo.clic('#btn-tramitar-pedido', { navega: true, esperar: 1500 });
    await demo.narrar('Las piezas quedan reservadas durante 10 minutos. Usamos la tarjeta de prueba de pago directo.');
    await demo.clic('#btn-test-direct', { esperar: 900 });
    await demo.clic('#btn-submit-pago', { esperar: 2800 });
    await demo.narrar('El banco autoriza el cobro: el pedido queda registrado como pagado y se muestra el recibo.');

    // 2. 3D Secure
    await demo.ir('/carrito?anadirProducto=art-002', { esperar: 1200 });
    await demo.escenario(2, 'Más de 100 €: verificación 3D Secure',
      'Ahora compramos la manta de 140 €. Al superar 100 € el banco pide verificar la identidad.');
    await demo.clic('#btn-tramitar-pedido', { navega: true, esperar: 1500 });
    await demo.clic('#btn-test-3ds', { esperar: 900 });
    await demo.clic('#btn-submit-pago', { esperar: 2200 });
    await demo.narrar('Aparece la autenticación reforzada: introducimos el código que enviaría el banco por SMS.', { posicion: 'lado' });
    await demo.clic('#btn-quick-fill-otp', { esperar: 900 });
    await demo.clic('#btn-confirmar-3ds', { esperar: 2800 });
    await demo.narrar('Identidad confirmada: el pedido se cobra y se confirma.', { posicion: 'abajo' });

    // 3. Sin fondos
    await demo.ir('/carrito?anadirProducto=art-003', { esperar: 1200 });
    await demo.escenario(3, 'Tarjeta sin fondos',
      'Intentamos pagar la tabla de olivo con una tarjeta sin saldo suficiente.');
    await demo.clic('#btn-tramitar-pedido', { navega: true, esperar: 1500 });
    await demo.clic('#btn-test-funds', { esperar: 900 });
    await demo.clic('#btn-submit-pago', { esperar: 2200 });
    await demo.narrar('El banco deniega la operación: no se crea ningún pedido y el motivo se explica en español.', { posicion: 'abajo' });

    // 4. Tarjeta bloqueada
    await demo.ir('/checkout', { esperar: 1500 });
    await demo.escenario(4, 'Tarjeta bloqueada por el banco',
      'Volvemos a intentarlo con una tarjeta que la entidad emisora tiene bloqueada.');
    await demo.clic('#btn-test-denied', { esperar: 900 });
    await demo.clic('#btn-submit-pago', { esperar: 2200 });
    await demo.narrar('Pago rechazado de nuevo, sin cobro y con un mensaje claro para el comprador.', { posicion: 'abajo' });

    // 5. Reserva caducada
    await demo.ir('/checkout', { esperar: 1500 });
    await demo.escenario(5, 'La reserva de 10 minutos caduca',
      'Si el comprador tarda más de 10 minutos, la reserva se libera. Lo simulamos con el botón de prueba.', { posicion: 'abajo' });
    await demo.clic('#btn-simular-expiracion', { esperar: 2000 });
    await demo.narrar('El tiempo se agota: las piezas vuelven al catálogo y ya no se puede cobrar con esta reserva.');
    await demo.pausa(1200);
  }
};
