# Feature Specification: 007 - Procesamiento Logístico y Notificación de Envío

**Feature Branch**: `007-logistica-envios`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa quiero procesar los pedidos, empaquetarlos y registrar el número de seguimiento al enviarlos para que el cliente reciba un aviso automático de que su compra está en camino."

**Responsable asignado**: Desarrollador 3 (Equipo: Persona 3 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Ciclo de Despacho y Aviso de Seguimiento (Priority: P2)

Como gestor de pedidos de la tienda, quiero gestionar los pedidos formalizados en estado "pagado", preparar su empaquetado, asignarles el código de seguimiento facilitado por la empresa de mensajería y marcar el pedido como "salido de la tienda", asegurando que el comprador reciba una notificación automática inmediata para que sepa que su compra artesanal ya está en camino.

**Why this priority**: Culmina el ciclo de entrega física de los productos. Un envío con trazabilidad elimina la incertidumbre del comprador y reduce las consultas sobre el estado de la entrega.

**Independent Test**: El administrador accede a la sección de pedidos del panel, localiza un pedido en estado "pagado", pulsa la opción de empaquetar, introduce el número de seguimiento "TRACK-ES-9988" y confirma el envío. Se verifica que el pedido transiciona a "salido de la tienda", que el número de seguimiento queda guardado y que el cliente recibe el aviso automático (notificación en su cuenta o correo).

**Acceptance Scenarios**:
1. **Given** un pedido en estado "pagado", **When** el administrador lo prepara en el taller y lo marca como empaquetado, **Then** el estado operativo avanza hacia la preparación del envío.
2. **Given** un pedido empaquetado, **When** el administrador introduce el código de seguimiento del transportista y confirma la expedición, **Then** el pedido pasa al estado oficial "salido de la tienda".
3. **Given** un pedido que transiciona a "salido de la tienda", **When** se guarda el cambio, **Then** se dispara un aviso automático al comprador con los detalles y el código de seguimiento.
4. **Given** el transportista o cliente confirmando la recepción final, **When** se actualiza el pedido, **Then** pasa al estado definitivo "entregado".

### Edge Cases

- **Intento de marcar como salido sin código de seguimiento**: El sistema exige obligatoriamente la introducción de un número de seguimiento válido antes de permitir marcar el pedido como "salido de la tienda".
- **Modificación o corrección de código de seguimiento erróneo**: Si el administrador comete una errata al teclear el código de seguimiento, el sistema permite editarlo antes de que transicione a entregado, notificando la corrección.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar al administrador la lista de pedidos confirmados ordenados por fecha y estado.
- **FR-002**: El sistema DEBE permitir avanzar el estado del pedido a lo largo de su flujo de trabajo operativo.
- **FR-003**: El sistema DEBE requerir obligatoriamente el registro de un número de seguimiento de paquetería al cambiar el estado a "salido de la tienda".
- **FR-004**: Al registrar la salida de la tienda con número de seguimiento, el sistema DEBE disparar un aviso automático al cliente comunicando que su compra está en camino e incluyendo dicho código.
- **FR-005**: El sistema DEBE permitir avanzar los pedidos a la fase final de "entregado" una vez recibidos.
- **FR-006**: Todos los estados y avisos DEBEN presentarse en español de España (`es-ES`).

### Key Entities

- **Pedido**: Entidad central con fases: "pendiente", "pagado", "salido de la tienda", "entregado".
- **Expedición / Envío**: Datos logísticos (número de seguimiento, empresa de transporte, fecha de salida, fecha de entrega).
- **Aviso de Envío**: Notificación generada automáticamente para el cliente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de los pedidos en estado "salido de la tienda" cuentan con número de seguimiento asignado.
- **SC-002**: El aviso automático al cliente se genera en menos de 3 segundos tras confirmar el despacho del paquete.
- **SC-003**: El cliente puede ver el código de seguimiento en su panel inmediatamente después de la actualización.

## Assumptions

- Para la versión 1, el código de seguimiento es alfanumérico proporcionado por la empresa de paquetería habitual sin necesidad de integrar APIs privadas complejas de transportistas, manteniendo el Principio I de simplicidad.
