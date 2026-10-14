# Implementation Plan: 003 - Pago Seguro con Tarjeta y Confirmación Condicionada

**Branch**: `003-pago-tarjeta` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-pago-tarjeta/spec.md` tras el proceso de clarificación completado.

---

## Summary

Implementar la pasarela de pago seguro con tarjeta para la tienda online de artesanías, garantizando que el pedido únicamente se formalice e inserte en base de datos con estado "pagado" cuando la entidad financiera autorice efectivamente el cobro (FR-003). La solución incorpora:
1. Formulario seguro en cliente con tokenización sin almacenamiento de datos PAN/CVV en backend (Principio V, SC-003).
2. Reserva temporal de stock durante 10 minutos al iniciar el checkout (FR-005).
3. Autenticación reforzada 3D Secure condicional para importes superiores a 100 € (FR-002).
4. Endpoint de webhook bancario asíncrono e idempotente ante eventuales cierres de navegador (FR-007, SC-004).
5. Compra como invitado solicitando únicamente datos imprescindibles (nombre y correo electrónico) (FR-001).

---

## Technical Context

**Language/Version**: JavaScript (Node.js v24 LTS / ES2022) en backend; Vanilla JavaScript (ES Modules, ES2022) en frontend conforme a las directrices de desarrollo web del proyecto.

**Primary Dependencies**:
- Backend: Express.js (o módulo HTTP nativo de Node.js) para enrutamiento REST, middleware de parsing y webhook.
- Frontend: Vanilla HTML5 y CSS3 moderno (Custom Properties, Flexbox/Grid, estados interactivos) sin frameworks pesados ni dependencias externas de UI.

**Storage**:
- Repositorio ligero de persistencia de datos (JSON / SQLite integrado o almacén en memoria con persistencia atómica a archivo para pedidos, inventario y reservas temporales), permitiendo arranque inmediato y validación autónoma sin requerir servidores de bases de datos externos.

**Testing**:
- Pruebas automatizadas de contratos y endpoints con Node test runner (`node --test`) o Vitest.
- Pruebas de integración de flujo de compra con pasarela simulada.
- Verificación manual paso a paso descrita en [quickstart.md](./quickstart.md).

**Target Platform**: Navegadores web modernos (Chrome, Firefox, Safari, Edge) y entorno de ejecución local multiplataforma (Windows/Linux/macOS).

**Project Type**: Aplicación web completa (Web Application: Frontend cliente + Backend API/servicios).

**Performance Goals**:
- Descuento y consolidación de stock en $< 1$ segundo tras la autorización bancaria (SC-002).
- Procesamiento de webhook bancario e idempotencia en $< 2$ segundos (SC-004).
- Carga reactiva de formulario y cálculo de importe en $< 200$ ms.

**Constraints**:
- Ventana de expiración estricta de 10 minutos para reservas temporales de existencias (FR-005).
- 0 datos de tarjeta (PAN o CVV) persistidos en el backend o registrados en logs (SC-003, Principio V).
- Todo en español de España (`es-ES`) y moneda oficial Euro (`€`) con formato estándar (Principio II).
- Soporte para compra como invitado con nombre y correo electrónico (FR-001).

**Scale/Scope**:
- Comercio de piezas artesanales con inventario unitario o limitado por variante.
- Cobertura de 5 escenarios de prueba interactivos y 7 requisitos funcionales formales.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Regla Aplicable | Evaluación en la Planificación | Estado |
|--------------------------|-----------------|---------------------------------|--------|
| **I. Simplicidad ante todo** | Arquitectura con la menor cantidad de capas posible; prohibida la complejidad anticipada o sobreingeniería. | Implementación mediante Node.js/Express ligero y Vanilla JS/CSS sin dependencias superfluas. Modelo atómico sin estados huérfanos. | **PASSED** |
| **II. Idioma y mercado** | Todo el producto en `es-ES`. Moneda única Euro (`€`) con formato estándar español. | Todos los contratos, mensajes de la pasarela simulada, pantallas y textos de error en español y con importes en euros (`XX,XX €`). | **PASSED** |
| **III. Cero alcance fantasma** | Solo implementar lo redactado y aprobado en `spec.md`. | Se cubren con exactitud los requisitos FR-001 a FR-007 resultantes de la especificación y las 5 clarificaciones. 0 extras no autorizados. | **PASSED** |
| **IV. Verificable por no técnicos** | Escenarios evaluables de principio a fin usando la app sin consultar bases de datos. | Guía detallada en [quickstart.md](./quickstart.md) con tarjetas de prueba predefinidas y simulador visual de pasarela y 3DS. | **PASSED** |
| **V. Respeto por los datos** | Solicitar únicamente información imprescindible. 0 credenciales ni secretos en repositorio. 0 datos de tarjeta guardados. | Se piden solo nombre y email; 0 PAN/CVV almacenados (SC-003); pasarela desacoplada por tokens. | **PASSED** |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-pago-tarjeta/
├── spec.md              # Especificación funcional y clarificaciones
├── plan.md              # Este archivo (Plan de implementación de arquitectura)
├── research.md          # Fase 0: Decisiones técnicas y análisis de alternativas
├── data-model.md        # Fase 1: Entidades, atributos, validaciones y diagramas de estados
├── quickstart.md        # Fase 1: Guía de ejecución y validación de escenarios de prueba
├── contracts/           # Fase 1: Especificación de interfaces y contratos API
│   └── checkout-api.yaml
└── checklists/
    └── requirements.md  # Lista de calidad y verificación de la especificación
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js             # Parámetros de timeout (10 min), umbral 3DS (100 €)
│   ├── controllers/
│   │   ├── checkout.controller.js   # Iniciar checkout, procesar pago y verificar 3DS
│   │   ├── webhook.controller.js    # Notificación asíncrona de la pasarela e idempotencia
│   │   └── order.controller.js      # Consulta y emisión del comprobante de compra
│   ├── models/
│   │   ├── order.model.js           # Entidad Pedido y Línea de Pedido
│   │   ├── stock-reservation.model.js # Gestión y expiración de reservas de existencias
│   │   └── transaction.model.js     # Comprobante bancario inmutable sin PAN/CVV
│   ├── services/
│   │   ├── payment-gateway.service.js # Integración y simulación de la pasarela bancaria
│   │   ├── stock-reservation.service.js # Lógica de cálculo de stock disponible y bloqueo
│   │   └── order.service.js         # Transacción atómica de consolidación y persistencia
│   ├── routes/
│   │   ├── payment.routes.js        # Rutas /api/pagos/*
│   │   └── order.routes.js          # Rutas /api/pedidos/*
│   └── server.js                    # Servidor Express y middlewares
└── tests/
    ├── contract/
    │   └── checkout-api.test.js     # Validación automatizada contra checkout-api.yaml
    └── integration/
        └── checkout-flow.test.js    # Pruebas integradas de pago, 3DS y webhook

frontend/
├── src/
│   ├── components/
│   │   ├── checkout-form.js         # Formulario de datos mínimos y tarjeta tokenizada
│   │   ├── payment-3ds-modal.js     # Modal interactivo para desafío bancario 3D Secure
│   │   ├── reservation-timer.js     # Temporizador visual de reserva de stock (10 min)
│   │   └── order-receipt.js         # Pantalla de confirmación con datos del pedido pagado
│   ├── services/
│   │   ├── payment-api.service.js   # Cliente HTTP para interactuar con /api/pagos
│   │   └── card-tokenizer.service.js # Componente seguro de tokenización simulada
│   └── styles/
│       ├── checkout.css             # Estilos modernos para el checkout
│       └── modal-3ds.css            # Estilos del diálogo bancario 3D Secure
└── public/
    └── checkout.html                # Página principal del proceso de pago
```

**Structure Decision**: Se adopta la estructura estándar de aplicación web desacoplada en `backend/` (servicios de lógica de negocio, validaciones transaccionales y webhook) y `frontend/` (componentes visuales de checkout, temporizador de reserva y modal de seguridad bancaria), permitiendo ejecutar y evaluar de forma independiente las pruebas de API y la experiencia interactiva del comprador.

---

## Complexity Tracking

> **Sin violaciones constitucionales detectadas**. La solución planteada no introduce dependencias innecesarias, respeta estrictamente los principios de simplicidad y privacidad, y se ajusta rigurosamente a los requisitos de la especificación funcional.

| Aspecto | Solución Elegida | Justificación |
|---------|------------------|---------------|
| Persistencia de Pedidos | Creación atómica post-autorización | Elimina la necesidad de recolectores de basura para pedidos pendientes abandonados. |
| Reserva de Stock | Marcas de tiempo de 10 min | Evita bloqueos indefinidos sin sobrecargar con colas complejas. |
| Autenticación 3DS | Desafío condicional $> 100\text{ \euro}$ | Cumple PSD2 reduciendo fricción en microcompras. |
| Cuentas de Usuario | Soporte como invitado | Desacopla la pasarela de la Feature 004 manteniendo autonomía en pruebas. |
