/**
 * Middleware centralizado de gestión de errores
 * Garantiza respuestas JSON estructuradas y mensajes en español (Principio II)
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, codigo = 'ERROR_GENERICO') {
    super(message);
    this.statusCode = statusCode;
    this.codigo = codigo;
  }
}

export function errorHandler(err, req, res, next) {
  // Registrar error técnico sin exponer datos confidenciales
  const statusCode = err.statusCode || err.status || 500;
  const codigo = err.codigo || (statusCode === 500 ? 'ERROR_SERVIDOR' : 'ERROR_SOLICITUD');
  const mensaje = err.message || 'Ha ocurrido un error interno al procesar la solicitud.';

  const responseBody = {
    error: codigo,
    codigo,
    mensaje
  };

  if (err.varianteId !== undefined) {
    responseBody.varianteId = err.varianteId;
  }
  if (err.stockDisponible !== undefined) {
    responseBody.stockDisponible = err.stockDisponible;
  }
  if (err.cantidadSolicitada !== undefined) {
    responseBody.cantidadSolicitada = err.cantidadSolicitada;
  }

  res.status(statusCode).json(responseBody);
}
