// Datos de partida para las demos (clientes y pedidos ficticios de prueba)
import { Order, OrderLine } from '../../backend/src/models/order.model.js';

export const PRODUCTOS = {
  jarron: { productoId: 'art-001', varianteId: 'var-001-azul', titulo: 'Jarrón de Cerámica Esmaltada Azul', precio: 45.00 },
  manta: { productoId: 'art-002', varianteId: 'var-002-natural', titulo: 'Manta de Lana Merina Tejida a Mano', precio: 140.00 },
  tabla: { productoId: 'art-003', varianteId: 'var-003-olivo', titulo: 'Tabla de Corte en Madera de Olivo', precio: 28.50 },
  cobre: { productoId: 'art-004', varianteId: 'var-004-unico', titulo: 'Pieza Única de Orfebrería en Cobre', precio: 220.00 }
};

/** Registra un cliente mediante la API pública y devuelve su id de cuenta. */
export async function registrarCliente(base, { nombre, email, password }) {
  const res = await fetch(`${base}/api/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password })
  });
  const cuerpo = await res.json();
  if (res.status !== 201) throw new Error(`No se pudo registrar ${email}: ${cuerpo.mensaje || res.status}`);
  return cuerpo.usuario.id;
}

/** Crea un pedido ya cobrado (o en otra fase) directamente en el almacén en memoria. */
export function crearPedido(store, { cliente, email, cuentaId = null, estado = 'pagado', lineas, diasAtras = 1 }) {
  const fecha = new Date(Date.now() - diasAtras * 86400000);
  const lineasPedido = lineas.map(([producto, cantidad]) => new OrderLine({
    productoId: producto.productoId,
    varianteId: producto.varianteId,
    titulo: producto.titulo,
    precioUnitario: producto.precio,
    cantidad,
    subtotal: producto.precio * cantidad
  }));
  const pedido = new Order({
    clienteNombre: cliente,
    clienteEmail: email,
    cuentaId,
    total: lineasPedido.reduce((s, l) => s + l.subtotal, 0),
    estado,
    fechaCreacion: fecha.toISOString(),
    transaccionId: `tx-demo-${Math.random().toString(36).slice(2, 10)}`,
    lineas: lineasPedido
  });
  store.saveOrder(pedido);
  return pedido;
}
