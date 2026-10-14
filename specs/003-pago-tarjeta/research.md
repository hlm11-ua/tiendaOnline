# Research: 003 - Pago Seguro con Tarjeta y Confirmación Condicionada

**Feature**: `003-pago-tarjeta` | **Fecha**: 2026-10-14  
**Objetivo**: Resolver todas las decisiones técnicas, patrones de integración y requerimientos de arquitectura identificados en la especificación y clarificación de la funcionalidad de pago seguro con tarjeta.

---

## Decisiones Técnicas y de Diseño

### 1. Captura Segura de Tarjeta y Cumplimiento PCI-DSS sin Custodia de Datos

- **Decisión**: Utilizar un componente seguro de formulario con tokenización de tarjeta en cliente. Los datos bancarios confidenciales (número de tarjeta / PAN, fecha de caducidad y código CVV) son procesados por el componente de la pasarela y convertidos en una referencia temporal de transacción (`tokenTransaccion`). El backend de la aplicación nunca recibe, manipula ni almacena en base de datos ni logs los datos crudos de la tarjeta, cumpliendo de forma estricta el **Criterio SC-003** y el **Principio V de la Constitución** (Respeto por los datos del usuario).
- **Razón**: Permite mantener el flujo de compra fluido dentro de la tienda (FR-001) eliminando cualquier riesgo de seguridad o fuga de datos sensibles y evitando requerimientos de certificación PCI-DSS de nivel servidor para la tienda.
- **Alternativas consideradas**:
  - *Custodia local en base de datos*: Descartada terminantemente por vulnerar la directiva PCI-DSS y el Principio V de la Constitución.
  - *Redirección externa obligatoria*: Ofrece seguridad pero degrada la experiencia de usuario en dispositivos móviles al forzar múltiples saltos de dominio cuando un componente tokenizador integrado ofrece idénticas garantías de aislamiento.

---

### 2. Reserva Temporal de Existencias (10 Minutos) y Prevención de Sobrevents

- **Decisión**: Implementar un mecanismo de reserva temporal de stock con ventana de expiración estricta de 10 minutos al iniciar el proceso de checkout (`POST /api/pagos/iniciar`). El stock disponible se calcula como `stockFisico - sum(reservasActivas)`. Al confirmarse el pago, la reserva transita atómicamente a descuento definitivo. Si transcurren más de 10 minutos sin autorización, o si el usuario cancela o el cobro falla definitivamente, la reserva se marca como `expirada` o `liberada` y el stock vuelve a estar disponible para otros compradores.
- **Razón**: Resuelve la clarificación pactada en la sesión 2026-10-14 (FR-005). Previene ventas concurrentes sin existencias físicas (impidiendo pedidos impagables o roturas de stock imprevistas para los artesanos) y evita el bloqueo indefinido de productos si el usuario abandona la página de pago.
- **Alternativas consideradas**:
  - *Comprobación de stock únicamente post-pago*: Descartada porque cobraría la tarjeta bancaria de un cliente por un artículo que otro comprador pudo haber adquirido un segundo antes, generando incidencias financieras.
  - *Cron jobs pesados en servidor para limpieza*: Descartada conforme al Principio I (Simplicidad ante todo). La expiración se resuelve mediante comparación de marcas de tiempo (`expiresAt <= now`) en cada validación transaccional y un temporizador ligero en segundo plano.

---

### 3. Autenticación Reforzada (3D Secure) Condicional por Importe (> 100 €)

- **Decisión**: La pasarela bancaria evalúa el importe total a cobrar:
  - Si el importe es **menor o igual a 100,00 €**: Se ejecuta la autorización bancaria directa en un solo paso (`direct_authorization`), aprobando o rechazando el pago según los fondos y validez de la tarjeta.
  - Si el importe es **superior a 100,00 €**: La pasarela devuelve una respuesta con estado `requires_action` (desafío 3D Secure). El frontend despliega un modal bancario interactivo seguro donde el comprador debe introducir un código de confirmación (ej. SMS/OTP bancario de prueba). Solo tras validar el código se emite la autorización definitiva.
- **Razón**: Cumple el acuerdo de clarificación Q3 (FR-002) y la normativa europea PSD2/SCA, ofreciendo una experiencia ágil para microcompras de artesanía e introduciendo la verificación reforzada para compras de mayor cuantía.
- **Alternativas consideradas**:
  - *3D Secure para todos los pagos*: Descartada por añadir fricción innecesaria en compras pequeñas.
  - *Sin 3D Secure en v1*: Descartada por no ajustarse a los requerimientos de mercado europeo clarificados.

---

### 4. Notificación Asíncrona Server-to-Server (Webhook Bancario) e Idempotencia

- **Decisión**: El backend expondrá una ruta segura `POST /api/pagos/webhook` para recibir notificaciones directas de la pasarela bancaria. Cada notificación incluye la firma de seguridad del banco, el identificador único de transacción y el resultado (`autorizado` o `denegado`). El procesamiento implementa una comprobación de idempotencia estricta:
  - Si el pedido ya fue registrado por el retorno síncrono del navegador, el webhook responde con `200 OK` inmediatamente sin alterar datos ni duplicar pedidos.
  - Si el usuario cerró el navegador durante el pago, el webhook localiza la reserva temporal de stock activa mediante el identificador de transacción, crea el `Pedido` con estado "pagado", consolida el descuento de existencias y vacía el carrito asociado.
- **Razón**: Garantiza el cumplimiento del Edge Case de cierre involuntario del navegador (FR-007, SC-004) pactado en la clarificación Q4, evitando que compras legítimamente cobradas por el banco se pierdan en el sistema.
- **Alternativas consideradas**:
  - *Sondeo por polling desde frontend*: Inútil si el usuario apaga el dispositivo o cierra la pestaña.
  - *Reconciliación manual*: No admisible para un comercio electrónico que debe confirmar el pedido de forma inmediata al artesano.

---

### 5. Compra como Invitado con Datos Mínimos de Contacto

- **Decisión**: El formulario de pago no exige inicio de sesión previo ni creación forzosa de cuenta (FR-001, clarificación Q5). Únicamente se solicitan:
  1. Nombre completo del comprador (para el recibo y titularidad).
  2. Correo electrónico (para el envío automático del justificante de compra digital).
  Si el usuario ya tuviese una sesión activa de cuenta abierta (Feature 004), el pedido se asocia automáticamente a su identificador de cliente; de lo contrario, se crea como compra de invitado ("guest").
- **Razón**: Respeta estrictamente el Principio V de la Constitución (solicitar la información imprescindible), reduce la tasa de abandono de carritos y desacopla la Feature 003 de la Feature 004, permitiendo su desarrollo y validación independiente (Principio IV).
- **Alternativas consideradas**:
  - *Registro obligatorio*: Descartada por aumentar la fricción y crear dependencia artificial con el sistema de usuarios.
  - *Solicitud de DNI/NIF obligatoria en checkout*: Descartada para v1 (solamente necesaria si se requiere factura comercial formal, postergable a logística o facturación avanzada).

---

## Resumen de Compatibilidad con la Constitución

| Principio Constitucional | Evaluación en el Diseño | Estado |
|--------------------------|-------------------------|--------|
| **I. Simplicidad ante todo** | Arquitectura modular sin frameworks pesados innecesarios; reservas en memoria/BD ligera; 0 sobreingeniería. | **CUMPLE** |
| **II. Idioma y mercado** | Moneda única Euro (`€`), formato estándar español (`123,45 €`), textos y mensajes de error bancario en `es-ES`. | **CUMPLE** |
| **III. Cero alcance fantasma** | Se ciñe con precisión a las 5 clarificaciones y los 7 requisitos funcionales de `spec.md`. | **CUMPLE** |
| **IV. Verificable por no técnicos** | Escenarios completos ejecutables desde el navegador con tarjetas de prueba predefinidas y simulador visual. | **CUMPLE** |
| **V. Respeto por los datos** | 0 datos de tarjeta (PAN, CVV) almacenados en backend; solo se solicitan nombre y email; 0 secretos en el repositorio. | **CUMPLE** |
