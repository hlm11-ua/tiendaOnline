# Feature Specification: 003 - Pago Seguro con Tarjeta y Confirmación Condicionada

**Feature Branch**: `003-pago-tarjeta`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero realizar de forma segura los pagos con tarjeta, de modo que el pedido solo se dé por confirmado una vez que la entidad de pago haya autorizado efectivamente el cargo."

**Responsable asignado**: Desarrollador 3 (Equipo: Persona 3 de 4)

## Clarifications

### Session 2026-10-14
- Q: ¿En qué momento del ciclo de compra debe crearse el registro del pedido en la base de datos respecto a la respuesta de la entidad bancaria? (FR-003) → A: Creación exclusiva tras cobro autorizado: El pedido se inserta directamente en la base de datos con estado "pagado" únicamente tras la confirmación positiva de la pasarela. Si el pago falla o se interrumpe, no se guarda ningún pedido y se conserva el carrito intacto.
- Q: ¿Cómo debe actuar el sistema si el stock de algún artículo se agota justo antes de procesar la solicitud de cobro con la entidad bancaria? (FR-005) → A: Reserva temporal de existencias: Se bloquea el stock de los artículos del carrito durante un tiempo límite de 10 minutos al iniciar el proceso de pago. Si el pago se autoriza dentro de ese plazo, el descuento pasa a definitivo; si el tiempo expira, el usuario cancela o el cobro falla definitivamente, el stock reservado se libera automáticamente.
- Q: ¿Debe el proceso de pago incluir el paso de autenticación reforzada del comprador (3D Secure / verificación con código en la app bancaria)? (FR-002) → A: 3D Secure condicional por importe: Se requiere verificación bancaria interactiva reforzada (desafío 3DS simulado mediante código de seguridad bancario) únicamente para compras con importe total superior a 100 €. Los pagos por importe igual o inferior a 100 € se procesan mediante autorización directa sin pantalla de desafío.
- Q: ¿Debe el backend exponer un endpoint de notificación asíncrona entre servidores (webhook) para registrar pagos si el usuario cierra el navegador? → A: Endpoint de webhook asíncrono (server-to-server): El backend DEBE exponer un endpoint seguro de notificación bancaria que verifique la autenticidad del mensaje de la pasarela, cree el pedido en estado "pagado", consolide el stock y vacíe el carrito, garantizando la confirmación de la compra aunque el usuario haya cerrado la ventana del navegador.
- Q: ¿Debe exigirse al comprador tener una cuenta de usuario registrada para completar el pago con tarjeta o se permite la compra como invitado? → A: Compra como invitado con datos mínimos: No se exige registro ni inicio de sesión previo. El formulario de pago solicita únicamente el nombre y el correo electrónico de contacto para emitir y remitir el recibo de compra en euros, asociándolo a una cuenta de usuario únicamente si el cliente ya tuviese una sesión activa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pasarela de Pago con Tarjeta y Confirmación de Compra (Priority: P1)

Como comprador (con o sin cuenta registrada) con artículos en el carrito, quiero introducir mis datos básicos de contacto (nombre y correo electrónico) y de forma segura los datos de mi tarjeta para procesar el cobro, de tal manera que el pedido se considere formalmente confirmado y pagado única y exclusivamente cuando la entidad bancaria autorice de forma efectiva el cargo, impidiendo la creación o reserva de pedidos confirmados sin respaldo financiero.

**Why this priority**: Es la transacción económica central del comercio. Garantiza que el artesano reciba el dinero antes de comprometer su producción y previene ventas fallidas o reservas fantasma.

**Independent Test**: Se realiza un intento de compra introduciendo datos de tarjeta con saldo insuficiente o datos denegados; el sistema muestra el error bancario y no crea ningún pedido ni descuenta el stock de forma irreversible, liberando cualquier bloqueo temporal. Se realiza una compra autorizada por importe menor o igual a 100 €, comprobando que el cobro y pedido se autorizan de forma directa sin pantalla intermedia. Finalmente, se realiza una compra superior a 100 €, verificando que el sistema solicita el código 3D Secure, confirma el cobro solo tras su correcta introducción, crea el pedido en estado "pagado", consolida el stock y muestra el justificante con importe en euros. Asimismo, se simula el cierre del navegador tras la autorización en la pasarela, verificando que el webhook del backend recibe la notificación, crea el pedido con estado "pagado" y consolida el stock sin duplicidades.

**Acceptance Scenarios**:
1. **Given** un usuario en el proceso de pago con el importe total en euros, **When** introduce los datos de tarjeta y la entidad financiera rechaza la transacción, **Then** el sistema muestra un mensaje de error explicativo en español, no genera pedido confirmado, libera la reserva temporal de existencias y mantiene los artículos en el carrito para reintentar.
2. **Given** una operación autorizada positivamente por la entidad de pago dentro del plazo de reserva, **When** se recibe la confirmación de cobro, **Then** el sistema crea y persiste de forma atómica el pedido con estado "pagado", le asigna un identificador de pedido único, consolida el descuento de stock definitivo y vacía la cesta.
3. **Given** un comprador esperando la confirmación, **When** la comunicación con la pasarela se interrumpe antes de la autorización, **Then** el pedido permanece como no confirmado y no se emite recibo de compra.
4. **Given** un comprador en la pantalla de pago que supera los 10 minutos sin completar la operación, **When** la reserva temporal de stock expira, **Then** el sistema libera las existencias bloqueadas, no permite procesar el cargo y solicita al usuario revisar el carrito antes de reintentar.
5. **Given** un comprador que procesa un pago con importe total superior a 100 €, **When** envía los datos de la tarjeta, **Then** el sistema presenta un paso de verificación 3D Secure solicitando un código de confirmación bancaria antes de autorizar el cargo.
6. **Given** un comprador en el paso de verificación 3D Secure, **When** introduce un código erróneo o cancela el desafío, **Then** la transacción bancaria queda denegada, no se genera pedido y se libera la reserva de stock.
7. **Given** un comprador que cierra la ventana tras autorizar el pago, **When** la entidad de pago emite la notificación al endpoint de webhook del backend dentro de los 10 minutos de reserva, **Then** el sistema verifica la firma de la notificación, crea y persiste el pedido en estado "pagado", consolida el descuento de existencias e invalida el carrito.

### Edge Cases

- **Cierre involuntario de ventana durante el pago**: Si el usuario cierra el navegador mientras la entidad bancaria procesa el pago, el backend recibe la notificación a través de su endpoint de webhook asíncrono, valida la firma bancaria y formaliza el pedido como "pagado" de manera desatendida dentro del plazo de reserva de stock.
- **Doble clic en botón de pago**: El sistema bloquea el botón de confirmación tras el primer envío para evitar cobros duplicados al usuario.
- **Protección de datos de pago**: El sistema en ningún caso almacena números completos de tarjeta ni códigos CVV en sus bases de datos o código fuente (cumpliendo con el Principio V de la Constitución).
- **Expiración de la reserva temporal de stock**: Si transcurren más de 10 minutos en la pantalla de pago sin completar la transacción bancaria, el sistema libera el stock bloqueado y avisa al comprador para que verifique la disponibilidad en la cesta.
- **Fallo o cancelación en verificación 3D Secure**: Si el usuario abandona o falla el desafío 3DS para importes superiores a 100 €, no se ejecuta ningún cargo a la tarjeta, se notifica el rechazo en español y se conserva la cesta para un nuevo intento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE presentar un formulario seguro de pago que solicite los datos imprescindibles de contacto (nombre y correo electrónico del comprador) y los datos de la tarjeta bancaria, mostrando el desglose del importe total a abonar en euros (€), permitiendo la compra como invitado sin forzar el registro de una cuenta previa.
- **FR-002**: El sistema DEBE conectarse con la entidad de pago bancaria para solicitar la autorización del cargo, requiriendo un paso de verificación 3D Secure interactivo (código de seguridad bancario) únicamente cuando el importe total supere los 100 €, y autorizando de forma directa para importes de 100 € o inferiores.
- **FR-003**: El sistema DEBE crear y persistir el registro del pedido en la base de datos (con estado "pagado") ÚNICAMENTE tras recibir la autorización exitosa del cargo por parte de la entidad de pago, impidiendo la existencia de pedidos huérfanos o en estados previos no autorizados.
- **FR-004**: Si la entidad bancaria deniega el cobro, el sistema DEBE notificar el motivo genérico del rechazo al usuario y permitir un nuevo intento sin perder la cesta.
- **FR-005**: Al iniciar el proceso de pago, el sistema DEBE bloquear temporalmente el stock de las variantes seleccionadas durante un máximo de 10 minutos; una vez autorizada la transacción bancaria, DEBE consolidar dicho descuento de inventario como definitivo y vaciar el carrito activo. Si la sesión de pago expira o es cancelada, la reserva DEBE liberarse automáticamente.
- **FR-006**: El sistema DEBE generar una pantalla de confirmación con el código de referencia del pedido, fecha, artículos adquiridos e importe total pagado en euros.
- **FR-007**: El sistema DEBE exponer un endpoint seguro de notificación asíncrona (webhook bancario / IPN) que verifique la firma de la pasarela y cree de forma desatendida el pedido pagado y la consolidación de existencias si el comprador no retorna al navegador.

### Key Entities

- **Pedido**: Registro de compra persistido de forma atómica exclusivamente tras el cobro (identificador único, cliente: nombre y correo electrónico con referencia opcional a cuenta registrada, total en €, estado inicial y final: "pagado", fecha).
- **Línea de Pedido**: Artículos individuales y unidades adquiridas.
- **Reserva Temporal de Stock**: Bloqueo de existencias asociado a la sesión de pago (artículos, cantidades, marca de tiempo de expiración: 10 minutos).
- **Transacción de Cobro**: Comprobante bancario (identificador de transacción, referencia de entidad de pago, importe en €, estado: autorizado/denegado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0% de pedidos marcados como confirmados o pagados sin una autorización positiva explícita de la entidad bancaria.
- **SC-002**: El 100% de los pagos autorizados descuentan el stock exacto en menos de 1 segundo tras recibir la confirmación.
- **SC-003**: 0 datos de tarjeta (PAN, CVV) almacenados en bases de datos internas del proyecto.
- **SC-004**: El 100% de las notificaciones válidas recibidas en el webhook bancario confirman el pedido y consolidan el stock en menos de 2 segundos, garantizando idempotencia para evitar pedidos duplicados ante la concurrencia del retorno web.

## Assumptions

- Se integra una pasarela de pago compatible con estándares PCI-DSS (mediante componente seguro o entorno de pruebas bancario sin custodia de tarjetas).
