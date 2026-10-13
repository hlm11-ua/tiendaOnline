# Feature Specification: 004 - Cuentas de Usuario y Seguimiento de Fases de Pedido

**Feature Branch**: `004-cuentas-seguimiento`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero poder crear una cuenta e iniciar sesión para mantener mi sesión activa, consultar el historial de mis compras y hacer seguimiento del recorrido de mi pedido y sus fases (pendiente, pagado, salido de la tienda o entregado)."

**Responsable asignado**: Desarrollador 2 (Equipo: Persona 2 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro, Sesión Persistente y Panel de Historial de Pedidos (Priority: P1)

Como comprador, quiero crear una cuenta personal e iniciar sesión para conservar mi sesión abierta en el navegador, acceder a mi área privada para revisar todas mis compras pasadas y consultar en cualquier momento la fase actual en la que se encuentra cada pedido: pendiente, pagado, salido de la tienda o entregado.

**Why this priority**: Dota al comprador de autonomía para consultar el estado de sus pedidos artesanales sin requerir llamadas de soporte, y constituye el requisito previo para poder asociar reseñas a compras verificadas.

**Independent Test**: Un nuevo cliente se registra con correo y contraseña. Cierra el navegador y vuelve a acceder directamente al sitio confirmando que sigue autenticado. Accede a "Mis compras" y ve su pedido anterior con su fecha, desglose de piezas, total en euros y una barra visual o distintivo indicando en cuál de las 4 fases (pendiente, pagado, salido de la tienda o entregado) está.

**Acceptance Scenarios**:
1. **Given** un visitante en el formulario de registro, **When** introduce su nombre, email válido y contraseña, **Then** el sistema crea la cuenta, inicia sesión automáticamente y redirige a la tienda.
2. **Given** un usuario registrado con sesión cerrada, **When** introduce sus credenciales correctas, **Then** inicia sesión y su sesión permanece activa entre navegaciones y reinicios del navegador.
3. **Given** un usuario autenticado en la sección "Mis compras", **When** consulta sus pedidos, **Then** visualiza un listado cronológico con identificador, fecha, importe total en euros y el estado exacto en una de las cuatro fases oficiales.
4. **Given** un pedido en fase "salido de la tienda", **When** el cliente entra en el detalle, **Then** visualiza el código de seguimiento asignado por la tienda.

### Edge Cases

- **Intento de registro con email ya existente**: El sistema notifica de forma clara que el correo electrónico ya se encuentra registrado y ofrece el enlace para iniciar sesión.
- **Acceso a compras de otro cliente**: El sistema aísla estrictamente los datos de pedidos por usuario, impidiendo que cualquier cliente acceda a los pedidos de otro modificando identificadores en la URL.
- **Transición de fases en tiempo real**: Al actualizarse una fase en el almacén, el usuario ve el cambio en su panel al refrescar o consultar el pedido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios crear una cuenta proporcionando nombre, correo electrónico y contraseña.
- **FR-002**: El sistema DEBE permitir iniciar y cerrar sesión, conservando la sesión activa en el navegador del usuario.
- **FR-003**: El sistema DEBE ofrecer una sección privada de "Mis compras" accesible únicamente para el usuario autenticado.
- **FR-004**: El sistema DEBE mostrar el historial cronológico de compras con fecha, referencia, artículos adquiridos, importe en euros y fase del pedido.
- **FR-005**: El sistema DEBE soportar y representar visualmente las 4 fases obligatorias de cada pedido: "pendiente", "pagado", "salido de la tienda" y "entregado".
- **FR-006**: Si el pedido está en fase "salido de la tienda" o "entregado", el sistema DEBE mostrar el código de seguimiento del envío registrado.

### Key Entities

- **Usuario**: Cuenta del cliente (identificador, nombre, correo electrónico, fecha de creación).
- **Pedido**: Compra del cliente con estado en una de las 4 fases ("pendiente", "pagado", "salido de la tienda", "entregado").
- **Historial de Fases**: Registro de fechas y cambios de estado del pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario completa el registro y queda autenticado en menos de 40 segundos.
- **SC-002**: La sesión de usuario se mantiene activa tras cerrar y volver a abrir el navegador.
- **SC-003**: El 100% de los pedidos de un usuario reflejan con exactitud su fase actual entre las cuatro posibles.

## Assumptions

- No se solicitan datos innecesarios en el registro (solo nombre, email y contraseña segura), respetando el Principio V de la Constitución.
