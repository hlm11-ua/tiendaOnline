# Feature Specification: 003 - Pago Seguro con Tarjeta y Confirmación Condicionada

**Feature Branch**: `003-pago-tarjeta`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero realizar de forma segura los pagos con tarjeta, de modo que el pedido solo se dé por confirmado una vez que la entidad de pago haya autorizado efectivamente el cargo."

**Responsable asignado**: Desarrollador 3 (Equipo: Persona 3 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pasarela de Pago con Tarjeta y Confirmación de Compra (Priority: P1)

Como comprador con artículos en el carrito, quiero introducir de forma segura los datos de mi tarjeta y procesar el cobro, de tal manera que el pedido se considere formalmente confirmado y pagado única y exclusivamente cuando la entidad bancaria autorice de forma efectiva el cargo, impidiendo la creación o reserva de pedidos confirmados sin respaldo financiero.

**Why this priority**: Es la transacción económica central del comercio. Garantiza que el artesano reciba el dinero antes de comprometer su producción y previene ventas fallidas o reservas fantasma.

**Independent Test**: Se realiza un intento de compra introduciendo datos de tarjeta con saldo insuficiente o datos denegados; el sistema muestra el error bancario y no crea ningún pedido en estado confirmado ni descuenta el stock de forma irreversible. Se repite la operación con datos autorizados; la entidad financiera confirma el cobro, el pedido pasa de inmediato a estado "pagado", se descuenta el stock y se muestra el justificante con número de pedido e importe en euros.

**Acceptance Scenarios**:
1. **Given** un usuario en el proceso de pago con el importe total en euros, **When** introduce los datos de tarjeta y la entidad financiera rechaza la transacción, **Then** el sistema muestra un mensaje de error explicativo en español, no genera pedido confirmado y mantiene los artículos en el carrito para reintentar.
2. **Given** una operación autorizada positivamente por la entidad de pago, **When** se recibe la confirmación de cobro, **Then** el pedido pasa inmediatamente a estado "pagado", se genera un identificador de pedido único y se descuentan las existencias correspondientes.
3. **Given** un comprador esperando la confirmación, **When** la comunicación con la pasarela se interrumpe antes de la autorización, **Then** el pedido permanece como no confirmado y no se emite recibo de compra.

### Edge Cases

- **Cierre involuntario de ventana durante el pago**: Si el usuario cierra el navegador mientras la entidad bancaria procesa el pago, el pedido solo se marcará como pagado si la pasarela comunica la autorización efectiva mediante confirmación asíncrona segura.
- **Doble clic en botón de pago**: El sistema bloquea el botón de confirmación tras el primer envío para evitar cobros duplicados al usuario.
- **Protección de datos de pago**: El sistema en ningún caso almacena números completos de tarjeta ni códigos CVV en sus bases de datos o código fuente (cumpliendo con el Principio V de la Constitución).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE presentar un formulario seguro de pago con tarjeta con el desglose del importe total a abonar en euros (€).
- **FR-002**: El sistema DEBE conectarse con la entidad de pago bancaria para solicitar la autorización del cargo.
- **FR-003**: El sistema DEBE registrar el pedido como "pagado" y confirmado ÚNICAMENTE cuando la entidad de pago devuelva una respuesta de cargo autorizado exitosa.
- **FR-004**: Si la entidad bancaria deniega el cobro, el sistema DEBE notificar el motivo genérico del rechazo al usuario y permitir un nuevo intento sin perder la cesta.
- **FR-005**: Al confirmarse el pago, el sistema DEBE descontar de forma definitiva el inventario de las variantes adquiridas y vaciar el carrito activo.
- **FR-006**: El sistema DEBE generar una pantalla de confirmación con el código de referencia del pedido, fecha, artículos adquiridos e importe total pagado en euros.

### Key Entities

- **Pedido**: Registro de compra (identificador, cliente, total en €, fase actual: "pagado", fecha).
- **Línea de Pedido**: Artículos individuales y unidades adquiridas.
- **Transacción de Cobro**: Comprobante bancario (identificador de transacción, referencia de entidad de pago, importe en €, estado: autorizado/denegado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0% de pedidos marcados como confirmados o pagados sin una autorización positiva explícita de la entidad bancaria.
- **SC-002**: El 100% de los pagos autorizados descuentan el stock exacto en menos de 1 segundo tras recibir la confirmación.
- **SC-003**: 0 datos de tarjeta (PAN, CVV) almacenados en bases de datos internas del proyecto.

## Assumptions

- Se integra una pasarela de pago compatible con estándares PCI-DSS (mediante componente seguro o entorno de pruebas bancario sin custodia de tarjetas).
