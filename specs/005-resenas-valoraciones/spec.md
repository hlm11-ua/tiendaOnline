# Feature Specification: 005 - Reseñas y Valoraciones Únicas por Comprador Verificado

**Feature Branch**: `005-resenas-valoraciones`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero dejar un único comentario y valoración de cada artículo que he comprado únicamente."

**Responsable asignado**: Desarrollador 1 (Equipo: Persona 1 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Valoración y Reseña de Productos Comprados (Priority: P2)

Como comprador que ha adquirido un artículo artesanal, quiero valorar con una puntuación numérica (de 1 a 5 estrellas) y redactar un comentario explicando mi experiencia con la pieza que ya tengo en casa, de modo que el sistema solo me permita opinar si realmente he comprado ese artículo y restrinja mi participación a una única valoración por producto.

**Why this priority**: Crea confianza social real y transparente en la comunidad artesanal, premiando el buen oficio de los productores y protegiendo el catálogo de valoraciones ficticias.

**Independent Test**: Un usuario que nunca ha comprado el "Cuenco de Barro" accede a su ficha y comprueba que el formulario de reseña no está disponible y muestra el mensaje "Solo disponible para compradores verificados". Otro usuario con un pedido confirmado que incluye dicho cuenco accede a la ficha, envía una valoración de 5 estrellas con su texto y comprueba que se publica de inmediato y que el formulario se bloquea para impedir un segundo envío.

**Acceptance Scenarios**:
1. **Given** un usuario que no ha comprado el producto X, **When** visita la ficha de dicho producto, **Then** no puede enviar valoraciones ni comentarios y se le indica que requiere compra previa.
2. **Given** un cliente que ha comprado el producto X en un pedido pagado/entregado, **When** accede a la ficha del producto y completa el formulario con estrellas (1 a 5) y comentario, **Then** la reseña se publica y se asocia al producto con el nombre del comprador y la fecha.
3. **Given** un cliente que ya publicó una reseña sobre el producto X, **When** vuelve a consultar la ficha de ese producto, **Then** visualiza su reseña previa y el sistema le impide enviar un nuevo comentario para el mismo producto.

### Edge Cases

- **Múltiples unidades o compras del mismo producto en pedidos diferentes**: Si el cliente compra 3 unidades en el mismo pedido o compra el mismo artículo nuevamente meses después, la regla de negocio de "una única opinión por artículo" se mantiene firme: puede editar su comentario existente si lo desea, pero no publicar un segundo hilo.
- **Cancelación o reembolso**: Si un pedido es cancelado antes de su pago o entrega, no computa como compra verificada para publicar reseñas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE comprobar automáticamente en el historial de compras del usuario si existe al menos un pedido pagado o entregado que contenga el producto a valorar.
- **FR-002**: Si el usuario no ha comprado el producto, el sistema DEBE deshabilitar el formulario de opinión informando que las reseñas están restringidas a compradores reales.
- **FR-003**: El sistema DEBE permitir seleccionar una puntuación de 1 a 5 estrellas y escribir un texto de comentario explicativo.
- **FR-004**: El sistema DEBE garantizar que cada comprador verificado pueda emitir como máximo una única valoración y comentario por cada producto del catálogo.
- **FR-005**: Las reseñas publicadas DEBEN mostrar la puntuación en estrellas, el comentario, el nombre del cliente y la fecha en la ficha pública del producto.
- **FR-006**: La ficha del producto DEBE calcular y mostrar la media de valoraciones de todos los compradores verificados.

### Key Entities

- **Reseña**: Opinión verificada (identificador, usuario autor, producto, puntuación de 1 a 5, texto de comentario, fecha).
- **Comprobación de Compra**: Verificación entre el usuario y las líneas de pedidos confirmados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las valoraciones publicadas en la tienda pertenecen a clientes con compra verificada del producto.
- **SC-002**: 0 casos de clientes con más de una reseña activa para el mismo producto artesanal.
- **SC-003**: El promedio de valoración de la ficha de producto se recalcula de forma inmediata tras guardar una nueva opinión.

## Assumptions

- No se requiere moderación manual previa para la publicación en v1: si el comprador es verificado, la opinión se publica directamente para garantizar agilidad y transparencia.
