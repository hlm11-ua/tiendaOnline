# Implementation Plan: 002 - Carrito de Compras Persistente con Control de Stock

**Branch**: `002-carrito-persistente` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-carrito-persistente/spec.md` (revisada y clarificada con 5 sesiones integradas).

---

## Summary

Implementar un sistema de carrito de compras resiliente y transparente para la tienda de artesanías que garantice:
1. **Persistencia dual**: Uso de `window.localStorage` en el navegador para visitantes anónimos y almacenamiento en memoria del servidor (`MemoryStore`) para usuarios autenticados.
2. **Control estricto de inventario**: Validación síncrona en el backend al consultar y modificar el carrito, utilizando la disponibilidad de stock calculada por el servicio de inventario compartido. Al iniciar el checkout, la funcionalidad 003-pago-tarjeta revalidará la disponibilidad y gestionará las reservas temporales.
3. **Fusión determinista con advertencias**: Al iniciar sesión, combinar los carritos sumando cantidades coincidentes hasta el límite de stock disponible y notificando al comprador en caso de recorte.
4. **Respeto a la Constitución**: Moneda oficial euro (`€`) con formato `es-ES`, estimación de envío gratuito fija en `0,00 €` en v1, tratamiento de cesta vacía (*Zero-state*) y ausencia total de complejidad anticipada o reservas artificiales con temporizador en la cesta.

---

## Technical Context

**Language/Version**: JavaScript (Node.js con ES Modules nativos en backend y ES2022 en navegador), utilizando la versión de Node.js definida en la configuración común del repositorio.

**Primary Dependencies**:
- Backend: `express` (^4.21.2) sin dependencias adicionales pesadas.
- Frontend: Vanilla JavaScript nativo, HTML5 y CSS3 sin frameworks externos (React/Vue/etc.).

**Storage**:
- Visitantes anónimos: `window.localStorage` (clave `tienda_online_cart_v1`).
- Usuarios registrados / Backend: `MemoryStore` en `backend/src/models/store.js` (`store.carts`), reutilizando el almacenamiento y el servicio de inventario compartidos con checkout. La persistencia de carritos tras reiniciar el servidor dependerá del mecanismo de almacenamiento común adoptado por el proyecto.

**Testing**: Test runner nativo de Node.js (`node:test` y `node:assert`), ejecutado mediante `npm test`.

**Target Platform**: Servidor Node.js multiplataforma y navegadores web modernos (Chrome, Firefox, Safari, Edge).

**Project Type**: Aplicación web de comercio electrónico (Backend REST Express + Frontend estático servido desde Express).

**Performance Goals**:
- Bloqueo de incremento por encima del stock disponible en menos de 100 ms (SC-001).
- Recálculo dinámico de subtotales y total global en menos de 200 ms (SC-003).

**Constraints**:
- Persistencia del 100% al reabrir el navegador en el mismo perfil de usuario (SC-002).
- Prohibición estricta de reservas temporales desde el carrito. La funcionalidad 003-pago-tarjeta gestiona las reservas de stock durante el checkout, y el descuento definitivo de existencias se realiza conforme al flujo de confirmación del pedido.
- Formato monetario estricto en euros con convención española `es-ES` (ej. `45,00 €`).

**Scale/Scope**: Catálogo artesanal de piezas únicas o series limitadas (< 100 variantes activas), volumen ágil de compra sin concurrencia masiva.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación / Cumplimiento |
| :--- | :---: | :--- |
| **I. Simplicidad ante todo** | **PASS** | Solución directa: `LocalStorage` en cliente y `MemoryStore` en backend. Sin bases de datos pesadas ni ORMs prematuros para v1. |
| **II. Idioma y mercado** | **PASS** | Idioma español `es-ES` en todos los mensajes, avisos y contratos. Moneda única euro (`€`) formateada con `Intl.NumberFormat`. Tarifa plana estándar de envío fijada en 0,00 € en v1. |
| **III. Cero alcance fantasma** | **PASS** | No se incluyen cupones, temporizadores de reserva ni listas de deseos (todos explícitamente en *Out of Scope*). |
| **IV. Verificable por personas no técnicas** | **PASS** | Los 7 escenarios de aceptación se pueden comprobar íntegramente mediante la interfaz de usuario en el navegador sin inspeccionar bases de datos. |
| **V. Respeto por los datos del usuario** | **PASS** | No se solicitan ni almacenan datos personales en el carrito anónimo; solo variantes, cantidades y precios. Cero secretos en código. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-carrito-persistente/
├── plan.md              # Este plan técnico de implementación
├── research.md          # Fase 0: Decisiones arquitectónicas e investigación
├── data-model.md        # Fase 1: Entidades, validaciones y diagramas de estados
├── quickstart.md        # Fase 1: Guía de ejecución y validación de escenarios
├── contracts/           # Fase 1: Contrato OpenAPI 3.0 para la API REST del carrito
│   └── cart-api.yaml
└── checklists/
    ├── requirements.md  # Checklist de calidad de la especificación (16/16 superados)
    └── quality.md       # Checklist extendido de revisión de requisitos
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js            # Parámetros de cesta y formatos es-ES
│   ├── controllers/
│   │   ├── cart.controller.js      # Controlador de endpoints /api/carrito
│   │   └── order.controller.js     # [Existente] Controlador de pedidos
│   ├── middleware/
│   │   └── error-handler.js        # [Existente] Manejador centralizado de errores
│   ├── models/
│   │   ├── cart.model.js           # Lógica y validaciones del modelo de Carrito
│   │   └── store.js                # [Existente] MemoryStore extendido con `store.carts`
│   ├── routes/
│   │   ├── cart.routes.js          # Definición de rutas Express de la cesta
│   │   └── order.routes.js         # [Existente] Rutas de pedidos
│   ├── services/
│   │   └── cart.service.js         # Lógica de cálculo, validación de stock y fusión
│   └── server.js                   # Montaje de cart.routes en /api/carrito

frontend/
├── public/
│   ├── cart.html                   # Vista dedicada del carrito y cesta de compras
│   └── checkout.html               # [Existente] Pasarela de pago integrada. Se reutiliza e integra con 003-pago-tarjeta, sin duplicar su implementación.
└── src/
    ├── components/
    │   └── cart-view.js            # Renderizado reactivo de la tabla de artículos y avisos
    ├── services/
    │   ├── cart-storage.service.js # Capa de abstracción LocalStorage / API
    │   └── cart-api.service.js     # Cliente HTTP fetch hacia /api/carrito
    └── styles/
        └── cart.css                # Estilos visuales acordes a la identidad de la tienda

tests/
├── contract/
│   └── cart-api.contract.test.js   # Pruebas de conformidad OpenAPI
├── integration/
│   ├── cart-flow.test.js           # Pruebas de integración del flujo de cesta
│   └── cart-sync.test.js           # Pruebas de sincronización y validación de stock
└── unit/
    ├── cart-service.test.js        # Pruebas unitarias de cálculo y validaciones
    └── cart-merge.test.js          # Pruebas unitarias del algoritmo de fusión
```

**Structure Decision**: Se mantiene la arquitectura modular de dos capas ya presente en el repositorio (`backend/` y `frontend/`), reutilizando la infraestructura existente de Express en `server.js` y el catálogo en `store.js`, integrando limpiamente el router `/api/carrito`.
Los archivos compartidos de configuración, servidor, inventario y pedidos se reutilizarán sin duplicar su implementación. Las modificaciones deberán mantener la compatibilidad con 003-pago-tarjeta, que es responsable del flujo de checkout, las reservas temporales y el procesamiento del pago.

---

## Complexity Tracking

> Ninguna violación constitucional identificada. No se requiere justificación de complejidad adicional.

| Violación | Por qué se necesita | Alternativa más simple rechazada porque |
| :--- | :--- | :--- |
| *Ninguna* | N/A | N/A |
