# Feature Specification: 004 - Cuentas de Usuario y Seguimiento de Fases de Pedido

**Feature Branch**: `004-cuentas-seguimiento`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero poder crear una cuenta e iniciar sesión para mantener mi sesión activa, consultar el historial de mis compras y hacer seguimiento del recorrido de mi pedido y sus fases (pendiente, pagado, salido de la tienda o entregado)."

**Responsable asignado**: Desarrollador 2 (Equipo: Persona 2 de 4)

## Clarifications

### Session 2026-11-09

- Q: ¿Quién tiene permiso para cambiar la fase de un pedido (p. ej., de «pendiente» a «pagado», o de «pagado» a «salido de la tienda»)? → A: Un administrador/empleado lo cambia manualmente desde un panel de administración.
- Q: ¿Cómo se asigna y registra el código de seguimiento de un pedido cuando pasa a la fase «salido de la tienda»? (FR-006) → A: El administrador introduce manualmente el código de seguimiento al cambiar la fase a «salido de la tienda».
- Q: ¿Cuáles son las reglas mínimas de validación para la contraseña en el registro de usuarios? (FR-001) → A: Longitud mínima de 8 caracteres, sin restricciones adicionales.
- Q: ¿Durante cuánto tiempo debe permanecer activa la sesión persistente del usuario en el navegador antes de solicitar credenciales de nuevo? (SC-002) → A: 30 días desde el último acceso o hasta que el usuario cierre sesión explícitamente.
- Q: ¿Quedan expresamente fuera de alcance para esta versión inicial (v1) la recuperación de contraseña por correo y la edición del perfil de usuario? → A: Sí, recuperación de contraseña y edición de perfil quedan fuera de alcance para la v1.

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
- **Contraseña con menos de 8 caracteres**: El sistema rechaza el registro con un mensaje claro indicando que la contraseña debe tener al menos 8 caracteres.
- **Acceso a compras de otro cliente**: El sistema aísla estrictamente los datos de pedidos por usuario, impidiendo que cualquier cliente acceda a los pedidos de otro modificando identificadores en la URL.
- **Transición de fases en tiempo real**: Al actualizarse una fase en el almacén, el usuario ve el cambio en su panel al refrescar o consultar el pedido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios crear una cuenta proporcionando nombre, correo electrónico válido y contraseña (con un mínimo de 8 caracteres).
- **FR-002**: El sistema DEBE permitir iniciar y cerrar sesión, conservando la sesión activa en el navegador del usuario durante 30 días desde el último acceso o hasta el cierre explícito de la misma.
- **FR-003**: El sistema DEBE ofrecer una sección privada de "Mis compras" accesible únicamente para el usuario autenticado.
- **FR-004**: El sistema DEBE mostrar el historial cronológico de compras con fecha, referencia, artículos adquiridos, importe en euros y fase del pedido.
- **FR-005**: El sistema DEBE soportar y representar visualmente las 4 fases obligatorias de cada pedido: "pendiente", "pagado", "salido de la tienda" y "entregado".
- **FR-006**: Si el pedido pasa a fase "salido de la tienda" o "entregado", el administrador DEBE introducir manualmente el código de seguimiento del envío, y el sistema DEBE mostrarlo al cliente en la sección de "Mis compras" y en el detalle del pedido.
- **FR-007**: El sistema DEBE permitir exclusivamente a usuarios con rol de Administrador modificar manualmente la fase de cualquier pedido desde un panel privado.

### Key Entities

- **Usuario**: Cuenta del cliente (identificador, nombre, correo electrónico, fecha de creación).
- **Administrador**: Empleado de la tienda con permiso exclusivo para cambiar manualmente la fase de cualquier pedido.
- **Pedido**: Compra del cliente con estado en una de las 4 fases ("pendiente", "pagado", "salido de la tienda", "entregado").
- **Historial de Fases**: Registro de fechas y cambios de estado del pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario completa el registro y queda autenticado en menos de 40 segundos.
- **SC-002**: La sesión de usuario se mantiene activa durante 30 días tras el último acceso o hasta el cierre manual, persistiendo tras cerrar y volver a abrir el navegador.
- **SC-003**: El 100% de los pedidos de un usuario reflejan con exactitud su fase actual entre las cuatro posibles.

## Assumptions

- No se solicitan datos innecesarios en el registro (solo nombre, email y contraseña de al menos 8 caracteres), respetando el Principio V de la Constitución.

## Out of Scope

- Recuperación o restablecimiento de contraseñas mediante correo electrónico (servidores SMTP / correo transaccional).
- Edición o modificación de datos de perfil de usuario (nombre, correo o contraseña) tras el registro en esta v1.
- Eliminación de cuenta automatizada o procesos de autoservicio de baja.
- Métodos de autenticación externa o de terceros (OAuth, Google, Apple, etc.).
