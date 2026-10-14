import crypto from 'node:crypto';
import { CONSTANTS } from '../config/constants.js';

/**
 * Modelo para los datos de expedición y seguimiento del paquete (FR-003)
 */
export class DatosExpedicion {
  constructor({
    transportista,
    numeroSeguimiento,
    fechaSalida = new Date().toISOString(),
    fechaEntrega = null,
    notas = null,
    rectificaciones = []
  }) {
    this.transportista = transportista;
    this.numeroSeguimiento = String(numeroSeguimiento).trim();
    this.fechaSalida = fechaSalida;
    this.fechaEntrega = fechaEntrega;
    this.notas = notas;
    this.rectificaciones = rectificaciones;
  }

  /**
   * Valida los datos de expedición
   * @throws {Error} si los datos son inválidos
   */
  static validar({ transportista, numeroSeguimiento }) {
    if (!transportista || typeof transportista !== 'string' || transportista.trim() === '') {
      const err = new Error('Debe seleccionar una empresa de transporte obligatoriamente.');
      err.codigo = 'TRANSPORTISTA_REQUERIDO';
      err.status = 400;
      throw err;
    }

    if (!numeroSeguimiento || typeof numeroSeguimiento !== 'string') {
      const err = new Error('El número de seguimiento es obligatorio.');
      err.codigo = 'TRACKING_REQUERIDO';
      err.status = 400;
      throw err;
    }

    const trimmed = numeroSeguimiento.trim();
    if (trimmed.length < CONSTANTS.TRACKING.MIN_LENGTH || trimmed.length > CONSTANTS.TRACKING.MAX_LENGTH) {
      const err = new Error(`El número de seguimiento debe tener entre ${CONSTANTS.TRACKING.MIN_LENGTH} y ${CONSTANTS.TRACKING.MAX_LENGTH} caracteres alfanuméricos.`);
      err.codigo = 'TRACKING_LONGITUD_INVALIDA';
      err.status = 400;
      throw err;
    }

    if (!CONSTANTS.TRACKING.PATTERN.test(trimmed)) {
      const err = new Error('El número de seguimiento solo puede contener letras, números, guiones y guiones bajos.');
      err.codigo = 'TRACKING_FORMATO_INVALIDO';
      err.status = 400;
      throw err;
    }

    return true;
  }

  /**
   * Registra una rectificación en el envío (Edge Case 2)
   */
  rectificar({ nuevoNumero, nuevoTransportista, motivo = '' }) {
    DatosExpedicion.validar({
      transportista: nuevoTransportista || this.transportista,
      numeroSeguimiento: nuevoNumero
    });

    const rectificacion = {
      numeroAnterior: this.numeroSeguimiento,
      transportistaAnterior: this.transportista,
      nuevoNumero: nuevoNumero.trim(),
      nuevoTransportista: (nuevoTransportista || this.transportista).trim(),
      motivo: motivo || 'Corrección de errata en código de seguimiento',
      fecha: new Date().toISOString()
    };

    this.rectificaciones.push(rectificacion);
    this.numeroSeguimiento = rectificacion.nuevoNumero;
    this.transportista = rectificacion.nuevoTransportista;

    return rectificacion;
  }

  /**
   * Marca la expedición como entregada
   */
  marcarEntregado() {
    this.fechaEntrega = new Date().toISOString();
  }
}

/**
 * Modelo para las notificaciones automáticas de envío dirigidas al comprador (FR-004)
 */
export class AvisoEnvio {
  constructor({
    id = crypto.randomUUID(),
    codigoReferencia,
    tipo,
    canal = 'email_simulado',
    destinatarioEmail,
    destinatarioNombre,
    asunto,
    cuerpoTexto,
    transportista,
    numeroSeguimiento,
    fechaEmision = new Date().toISOString()
  }) {
    this.id = id;
    this.codigoReferencia = codigoReferencia;
    this.tipo = tipo;
    this.canal = canal;
    this.destinatarioEmail = destinatarioEmail;
    this.destinatarioNombre = destinatarioNombre;
    this.asunto = asunto;
    this.cuerpoTexto = cuerpoTexto;
    this.transportista = transportista;
    this.numeroSeguimiento = numeroSeguimiento;
    this.fechaEmision = fechaEmision;
  }

  /**
   * Genera el aviso de salida de tienda / inicio de viaje (FR-004)
   */
  static crearAvisoSalida({ pedido, transportista, numeroSeguimiento }) {
    const asunto = `¡Tu pedido ${pedido.codigoReferencia} ha salido del taller artesanal!`;
    const cuerpoTexto = [
      `Hola ${pedido.clienteNombre},`,
      '',
      `Nos alegra comunicarte que los artículos artesanales de tu pedido ya han sido empaquetados y han salido de nuestro taller.`,
      '',
      `Detalles de la expedición:`,
      `- Empresa de transporte: ${transportista}`,
      `- Número de seguimiento: ${numeroSeguimiento}`,
      `- Referencia del pedido: ${pedido.codigoReferencia}`,
      `- Importe total: ${Number(pedido.total).toFixed(2).replace('.', ',')} €`,
      '',
      `Puedes consultar el avance del transporte en cualquier momento introduciendo tu referencia en nuestra web o confirmando la recepción una vez tengas la pieza en tus manos.`,
      '',
      `¡Gracias por apoyar la artesanía local!`
    ].join('\n');

    return new AvisoEnvio({
      codigoReferencia: pedido.codigoReferencia,
      tipo: CONSTANTS.NOTICE_TYPES.DISPATCH,
      destinatarioEmail: pedido.clienteEmail,
      destinatarioNombre: pedido.clienteNombre,
      asunto,
      cuerpoTexto,
      transportista,
      numeroSeguimiento
    });
  }

  /**
   * Genera el aviso de rectificación de errata en el código (Edge Case 2)
   */
  static crearAvisoRectificacion({ pedido, transportista, numeroSeguimiento, motivo = '' }) {
    const asunto = `Actualización de seguimiento para tu pedido ${pedido.codigoReferencia}`;
    const cuerpoTexto = [
      `Hola ${pedido.clienteNombre},`,
      '',
      `Te informamos de que hemos actualizado el código de seguimiento de tu envío para corregir una errata en la etiqueta de transporte.`,
      '',
      `Datos actualizados de entrega:`,
      `- Empresa de transporte: ${transportista}`,
      `- Nuevo número de seguimiento: ${numeroSeguimiento}`,
      motivo ? `- Motivo: ${motivo}` : '',
      '',
      `Tu paquete continúa su curso de entrega habitual.`,
      '',
      `Atentamente, el equipo de artesanía.`
    ].filter(Boolean).join('\n');

    return new AvisoEnvio({
      codigoReferencia: pedido.codigoReferencia,
      tipo: CONSTANTS.NOTICE_TYPES.RECTIFICATION,
      destinatarioEmail: pedido.clienteEmail,
      destinatarioNombre: pedido.clienteNombre,
      asunto,
      cuerpoTexto,
      transportista,
      numeroSeguimiento
    });
  }

  /**
   * Genera el aviso de confirmación de entrega (FR-005)
   */
  static crearAvisoEntrega({ pedido }) {
    const asunto = `Confirmación de entrega: tu pedido ${pedido.codigoReferencia} ha sido entregado`;
    const cuerpoTexto = [
      `Hola ${pedido.clienteNombre},`,
      '',
      `Te confirmamos que tu pedido ${pedido.codigoReferencia} ha sido marcado como entregado satisfactoriamente.`,
      '',
      `Esperamos que disfrutes de tu pieza artesanal única. Si tienes cualquier consulta sobre su cuidado y conservación, estamos a tu disposición.`,
      '',
      `¡Muchas gracias por tu confianza!`
    ].join('\n');

    return new AvisoEnvio({
      codigoReferencia: pedido.codigoReferencia,
      tipo: CONSTANTS.NOTICE_TYPES.DELIVERY,
      destinatarioEmail: pedido.clienteEmail,
      destinatarioNombre: pedido.clienteNombre,
      asunto,
      cuerpoTexto,
      transportista: pedido.envio?.transportista || 'Mensajería',
      numeroSeguimiento: pedido.envio?.numeroSeguimiento || 'N/A'
    });
  }
}
