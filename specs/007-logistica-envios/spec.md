# Feature Specification: 007 - Procesamiento Logístico y Notificación de Envío

**Feature Branch**: `007-logistica-envios`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa quiero procesar los pedidos, empaquetarlos y registrar el número de seguimiento al enviarlos para que el cliente reciba un aviso automático de que su compra está en camino."

**Responsable asignado**: Desarrollador 3 (Equipo: Persona 3 de 4)

## Clarifications

### Session 2026-10-14
- Q: ¿Debe existir un estado oficial persistido "en preparación" entre el pago y la salida de la tienda? (FR-002) → A: Estado "en preparación" formal: El pedido transita formalmente por `pagado` → `en preparación` al iniciar su empaquetado en el taller, y posteriormente a `salido de la tienda` al asignar el código de seguimiento.
- Q: ¿A través de qué canal debe generarse y presentarse el aviso automático de despacho para el cliente? (FR-004) → A: Multicanal coordinado (Email + Vista de Pedido + Panel de Cuenta): Se emite un aviso por correo electrónico simulado dirigido al email de la compra, se actualiza el código en la pantalla de seguimiento del pedido y, si el usuario tiene cuenta registrada, se registra además en su panel de notificaciones.
- Q: ¿Debe el gestor indicar la empresa de transporte o mensajería junto con el número de seguimiento al despachar el pedido? (FR-003) → A: Transportista obligatorio mediante selector: El administrador selecciona la compañía de mensajería (Correos, SEUR, MRW, GLS, DHL u otra) junto con el número de seguimiento al registrar la salida de la tienda.
- Q: ¿Quién tiene la capacidad de registrar la transición del pedido al estado final "entregado"? (FR-005) → A: Doble vía (Administrador y Cliente): El gestor puede actualizar el estado a "entregado" desde el panel de pedidos y el comprador puede confirmar la recepción directamente mediante la acción "Confirmar recepción / He recibido mi pedido" en su pantalla de seguimiento.
- Q: ¿Qué validación de formato debe exigirse al número de seguimiento y cómo se gestiona la notificación si el administrador rectifica una errata antes de la entrega? (FR-003, Edge Cases) → A: Validación alfanumérica (6-32 caracteres) y aviso de rectificación: El código de seguimiento debe contener entre 6 y 32 caracteres alfanuméricos; si se rectifica antes de la entrega, se actualiza el envío y se genera un aviso automático notificando al comprador la corrección del código de seguimiento.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Ciclo de Despacho y Aviso de Seguimiento (Priority: P2)

Como gestor de pedidos de la tienda, quiero gestionar los pedidos formalizados en estado "pagado", preparar su empaquetado, asignarles el código de seguimiento facilitado por la empresa de mensajería y marcar el pedido como "salido de la tienda", asegurando que el comprador reciba una notificación automática inmediata para que sepa que su compra artesanal ya está en camino.

**Why this priority**: Culmina el ciclo de entrega física de los productos. Un envío con trazabilidad elimina la incertidumbre del comprador y reduce las consultas sobre el estado de la entrega.

**Independent Test**: El administrador accede a la sección de pedidos del panel, localiza un pedido en estado "pagado", pulsa la opción de empaquetar, introduce el número de seguimiento "TRACK-ES-9988" y confirma el envío. Se verifica que el pedido transiciona a "salido de la tienda", que el número de seguimiento queda guardado y que el cliente recibe el aviso automático (notificación en su cuenta o correo).

**Acceptance Scenarios**:
1. **Given** un pedido en estado "pagado", **When** el administrador lo prepara en el taller y lo marca como empaquetado, **Then** el estado operativo del pedido avanza formalmente a "en preparación".
2. **Given** un pedido empaquetado, **When** el administrador selecciona la empresa de transporte (ej. Correos, SEUR) e introduce el código de seguimiento del transportista y confirma la expedición, **Then** el pedido pasa al estado oficial "salido de la tienda".
3. **Given** un pedido que transiciona a "salido de la tienda", **When** se guarda el cambio con el código de seguimiento, **Then** se dispara el aviso automático por correo electrónico (con asunto, destinatario y código), se actualiza la vista de seguimiento del pedido y se refleja en el buzón de la cuenta si el comprador está registrado.
4. **Given** un pedido en estado "salido de la tienda", **When** el administrador actualiza el pedido desde el panel o el cliente pulsa "Confirmar recepción" en su vista de seguimiento, **Then** el pedido pasa al estado definitivo "entregado".

### Edge Cases

- **Intento de marcar como salido sin transportista o código de seguimiento inválido**: El sistema valida que el número de seguimiento contenga entre 6 y 32 caracteres alfanuméricos y que se haya seleccionado un transportista antes de permitir marcar el pedido como "salido de la tienda".
- **Modificación o corrección de código de seguimiento erróneo**: Si el administrador comete una errata al teclear el código de seguimiento, el sistema permite editarlo antes de que transicione a entregado, actualizando el registro y generando un aviso de rectificación con el nuevo código para el cliente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar al administrador la lista de pedidos confirmados ordenados por fecha y estado.
- **FR-002**: El sistema DEBE permitir avanzar el estado del pedido a lo largo de su flujo de trabajo operativo secuencial: "pagado" → "en preparación" → "salido de la tienda" → "entregado".
- **FR-003**: El sistema DEBE requerir obligatoriamente la selección de la empresa de transporte y el registro de un número de seguimiento válido de paquetería (cadena alfanumérica de 6 a 32 caracteres) al cambiar el estado a "salido de la tienda".
- **FR-004**: Al registrar la salida de la tienda con número de seguimiento, el sistema DEBE disparar un aviso automático al cliente comunicando que su compra está en camino: emitiendo el registro de correo electrónico simulado, habilitando el código en la pantalla de consulta de pedido y registrando la notificación en la cuenta del usuario si este dispone de ella.
- **FR-005**: El sistema DEBE permitir registrar la transición a "entregado" tanto al administrador desde el panel de control como al comprador desde su vista de seguimiento mediante la confirmación explícita de recepción.
- **FR-006**: Todos los estados y avisos DEBEN presentarse en español de España (`es-ES`).

### Key Entities

- **Pedido**: Entidad central con fases: "pendiente", "pagado", "en preparación", "salido de la tienda", "entregado".
- **Expedición / Envío**: Datos logísticos (empresa de transporte seleccionada, número de seguimiento, fecha de salida, fecha de entrega).
- **Aviso de Envío**: Notificación generada automáticamente para el cliente (canales: registro de email simulado y buzón de cuenta de usuario).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los pedidos en estado "salido de la tienda" cuentan con número de seguimiento asignado.
- **SC-002**: El aviso automático al cliente se genera en menos de 3 segundos tras confirmar el despacho del paquete.
- **SC-003**: El cliente puede ver el código de seguimiento en su panel inmediatamente después de la actualización.

## Assumptions

- Para la versión 1, el código de seguimiento es alfanumérico proporcionado por la empresa de paquetería habitual sin necesidad de integrar APIs privadas complejas de transportistas, manteniendo el Principio I de simplicidad.
