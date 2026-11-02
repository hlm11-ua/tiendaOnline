# Implementation Plan: 007 - Procesamiento Logístico y Notificación de Envío

**Branch**: `007-logistica-envios` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-logistica-envios/spec.md`

---

## Summary

Implementar el módulo completo de gestión logística y despachos para el taller artesanal. Permite a los administradores visualizar los pedidos pagados, avanzar su empaquetado al estado `"en preparación"`, asignar la empresa de mensajería (Correos, SEUR, MRW, GLS, DHL u otra) junto con el código de seguimiento (6 a 32 caracteres) para transicionar a `"salido de la tienda"`, disparar notificaciones multicanal automáticas inmediatas (registro de email simulado y actualización en la cuenta del cliente), permitir rectificaciones de tracking y culminar la entrega física confirmada tanto por el comercio como por el comprador.

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules)  
**Primary Dependencies**: Express 4.x, Node native modules (`node:crypto`, `node:test`, `node:assert`, `node:path`)  
**Storage**: Almacén transaccional en memoria en `backend/src/models/store.js` extendido con métodos logísticos y de avisos  
**Testing**: Node.js Test Runner (`node --test tests/**/*.test.js`) con pruebas de contrato y flujo completo de integración  
**Target Platform**: Navegadores web modernos (Desktop / Tablet / Móvil) y servidor Node.js local  
**Project Type**: Aplicación web (Backend REST API + Frontend Vanilla JS/CSS interactivo)  
**Performance Goals**: Generación y entrega del aviso automático de envío en $< 1$ segundo ($< 3$ s según SC-002)  
**Constraints**: 100% en español de España (`es-ES`), importes en euros (`€`), cero sobreingeniería en transportistas (Principio I)  
**Scale/Scope**: Taller artesanal con decenas de pedidos simultáneos, catálogo de productos y trazabilidad unitaria por referencia  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|--------------------------|--------|------------------------------|
| **I. Simplicidad ante todo** | **PASADO** | No se integran APIs externas propietarias de transportistas ni servidores SMTP pesados. La selección de transportista es directa y el aviso se emula de forma transparente en el sistema. |
| **II. Idioma y mercado** | **PASADO** | Interfaz, botones, estados (`pagado`, `en preparación`, `salido de la tienda`, `entregado`), avisos de correo y errores redactados íntegramente en español de España (`es-ES`). |
| **III. Cero alcance fantasma** | **PASADO** | Cada endpoint y componente responde estrictamente a los 6 requisitos funcionales (FR-001 a FR-006) y a las clarificaciones acordadas en `spec.md`. |
| **IV. Verificable por personas no técnicas** | **PASADO** | Se incluye un panel visual de taller con botones claros ("Empaquetar", "Despachar", "Marcar Entregado") y una bandeja de avisos emitidos donde cualquier evaluador puede ver el correo generado con su tracking. |
| **V. Respeto por los datos del usuario** | **PASADO** | Solo se gestionan datos indispensables (nombre, email y código de tracking). Sin almacenamiento de credenciales externas ni secretos en código. |

---

## Project Structure

### Documentation (this feature)

```text
specs/007-logistica-envios/
├── spec.md              # Especificación funcional con clarificaciones integradas
├── plan.md              # Este documento de planificación técnica
├── research.md          # Decisiones de arquitectura y máquina de estados
├── data-model.md        # Definición de entidades y máquina de estados
├── contracts/
│   └── logistica-api.yaml # Contrato OpenAPI de la API logística
└── quickstart.md        # Guía de validación paso a paso ejecutable
```

### Source Code & Tests Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js       # Estados logísticos y transportistas predefinidos
│   ├── models/
│   │   ├── store.js           # Extensión de store con búsquedas y transiciones
│   │   └── shipment.model.js  # Modelo de expedición y aviso de envío
│   ├── services/
│   │   └── logistics.service.js # Lógica de empaquetado, tracking y avisos automáticos
│   ├── controllers/
│   │   └── logistics.controller.js # Controladores REST (/api/logistica)
│   └── routes/
│       └── logistics.routes.js     # Definición de rutas logísticas
frontend/
├── public/
│   └── logistica.html         # Panel de gestión del taller y seguimiento de pedidos
└── src/
    ├── components/
    │   ├── logistics-orders-table.js # Tabla de pedidos y filtros por estado
    │   ├── dispatch-modal.js         # Modal para asignar transportista y tracking
    │   ├── tracking-view.js          # Vista pública de seguimiento para el cliente
    │   └── shipping-notice-modal.js  # Visualizador de correos de aviso emitidos
    ├── services/
    │   └── logistics-api.service.js  # Cliente HTTP de logística y seguimiento
    └── styles/
        └── logistica.css             # Estilos responsivos del panel de taller y seguimiento
tests/
├── contract/
│   └── logistica-api.test.js  # Validación de contratos de endpoints logísticos
└── integration/
    └── logistica-flow.test.js # Prueba del ciclo pagado -> preparación -> salido -> entregado
```

---

## Complexity Tracking

> **Sin violaciones constitucionales. Todas las soluciones adoptadas son las más simples y directas (Principio I).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|------------|------------------|----------------------|
| **Transportistas** | Lista desplegable con opción "Otro" | Evita integrar SDKs o APIs cerradas de Correos/SEUR en v1 |
| **Avisos de Envío** | Emulador observable con vista de email | Evita dependencias de servidores SMTP o servicios cloud externos |
| **Persistencia** | `MemoryStore` compartido en memoria | Unifica el estado con Feature 003 sin configurar bases de datos externas |
