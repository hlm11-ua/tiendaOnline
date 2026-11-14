# Implementation Plan: 004 - Cuentas de Usuario y Seguimiento de Fases de Pedido

**Branch**: `004-cuentas-seguimiento` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-cuentas-seguimiento/spec.md` tras completar la sesión interactiva de clarificación formal.

---

## Summary

Implementar el módulo completo de cuentas de usuario, persistencia de sesión durante 30 días, historial privado de pedidos y seguimiento visual de las 4 fases oficiales de pedido ("pendiente", "pagado", "salido de la tienda", "entregado").

La solución incorpora:
1. **Autenticación nativa y segura**: Registro de usuarios con validación de contraseña de mínimo 8 caracteres (FR-001) y derivación de contraseñas mediante `node:crypto.scryptSync` y `salt` aleatorio de 16 bytes (Principio V).
2. **Sesión persistente de 30 días**: Emisión de tokens de sesión con vigencia de 30 días renovable por actividad y almacenamiento local en el navegador del cliente para mantener la sesión abierta tras reinicios (FR-002, SC-002).
3. **Área privada "Mis compras"**: Listado cronológico de compras asociadas al usuario autenticado (`cuentaId`), mostrando importes en euros (`€`), fecha, artículos y estado en tiempo real (FR-003, FR-004).
4. **Trazabilidad visual de las 4 fases de pedido**: Representación en interfaz de las fases visuales "Pendiente", "Pagado", "Salido de la tienda" y "Entregado" (FR-005, SC-003), alineada internamente con los códigos oficiales `CONSTANTS.ORDER_STATUS` (`'pendiente'`, `'pagado'`, `'salido_tienda'`, `'entregado'` y asimilando `'en_preparacion'`) para plena coherencia con logística (007) e informes de ventas (008).
5. **Gestión manual de fases y código de seguimiento por Administrador**: Endpoint administrativo restringido que permite al personal de la tienda actualizar la fase del pedido y registrar el código de seguimiento (6 a 32 caracteres) al transicionar a "salido de la tienda", integrándose con `DatosExpedicion` y `order.envio` para interoperar con el sistema logístico (FR-006, FR-007).
6. **Aislamiento estricto contra IDOR y soporte de autorización dual**: Protección de rutas y consultas para impedir el acceso a pedidos ajenos entre diferentes clientes (Edge Case 2) y soporte de autenticación dual en `requireAdminRole` (tokens de sesión de administrador y cabecera de control `x-user-role`).
7. **Orden riguroso de enrutamiento**: Registro de rutas específicas de `/api/pedidos/mis-compras` antes del parámetro dinámico `/:codigoReferencia` para evitar colisiones de rutas en Express.

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules, Node.js LTS v24 compatible) en backend; Vanilla JavaScript (ES2022) y CSS3 moderno en frontend.  
**Primary Dependencies**: Express 4.x, módulos nativos de Node.js (`node:crypto` para derivación scrypt y tokens, `node:test` y `node:assert` para pruebas). Cero dependencias npm externas superfluas (Principio I).  
**Storage**: Almacén transaccional en memoria `backend/src/models/store.js` ampliado con colecciones `accounts` (`Map<id, Account>`), `accountsByEmail` (`Map<email, id>`) y `sessions` (`Map<token, Session>`), reutilizando la colección existente `orders`.  
**Testing**: Node.js Test Runner nativo (`node --test tests/**/*.test.js`) con pruebas de contrato OpenAPI y pruebas de integración de flujo end-to-end.  
**Target Platform**: Navegadores web modernos (Chrome, Firefox, Safari, Edge) y entorno Node.js multiplataforma (Windows / Linux / macOS).  
**Project Type**: Aplicación web completa (Backend REST API en Express + Frontend Vanilla JS/CSS interactivo servido estáticamente).  
**Performance Goals**: Registro e inicio de sesión completado en $< 40$ segundos (SC-001); resolución de consultas de "Mis compras" en $< 100$ ms.  
**Constraints**: 100% en español de España (`es-ES`), importes en euros (`€`), contraseñas con mínimo 8 caracteres (FR-001), vigencia de sesión de 30 días (SC-002), cero datos no solicitados (Principio V).  
**Scale/Scope**: Taller artesanal con usuarios registrados y trazabilidad individual de pedidos por cliente.  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|--------------------------|--------|------------------------------|
| **I. Simplicidad ante todo** | **PASADO** | Se utiliza el módulo nativo `node:crypto` para hashing seguro (`scryptSync`) y tokens, evitando dependencias externas como `bcrypt` o librerías de sesión pesadas. El almacenamiento se integra naturalmente en el `store.js` en memoria existente sin requerir bases de datos externas. |
| **II. Idioma y mercado** | **PASADO** | Todo el sistema (vistas, etiquetas de las 4 fases, mensajes informativos y de error como *"La contraseña debe tener al menos 8 caracteres"*) está en español de España (`es-ES`) y todos los precios y subtotales se expresan en euros (`€`). |
| **III. Cero alcance fantasma** | **PASADO** | La solución se ciñe estrictamente a los 7 requisitos funcionales (FR-001 a FR-007) y a los acuerdos de clarificación. Se declaran expresamente fuera de alcance la recuperación por email, edición de perfil y OAuth para la v1. |
| **IV. Verificable por personas no técnicas** | **PASADO** | La página `/cuenta` permite a cualquier persona no técnica registrarse, iniciar sesión, ver su historial de pedidos con la barra visual de las 4 fases y comprobar el código de seguimiento tras el despacho del taller. Todo descrito en `quickstart.md`. |
| **V. Respeto por los datos del usuario** | **PASADO** | Se solicitan exclusivamente nombre, email y contraseña. No se almacenan contraseñas en texto plano ni se introducen claves o secretos en el código fuente. |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-cuentas-seguimiento/
├── spec.md                     # Especificación funcional con clarificaciones formales
├── plan.md                     # Este documento de arquitectura e implementación
├── research.md                 # Fase 0: Decisiones técnicas y análisis de alternativas
├── data-model.md               # Fase 1: Entidades, atributos, validaciones y máquina de estados
├── contracts/
│   └── cuentas-seguimiento-api.yaml # Fase 1: Contrato OpenAPI de autenticación y pedidos
└── quickstart.md               # Fase 1: Guía de validación paso a paso de escenarios
```

### Source Code & Tests Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js            # Constantes de sesión (30 días), roles y estados de fases
│   ├── models/
│   │   ├── account.model.js        # Entidad Usuario / Cuenta con hash scrypt determinista
│   │   ├── session.model.js        # Entidad Sesion para persistencia durante 30 días
│   │   ├── order.model.js          # Reutilización del modelo Order (cuentaId, historialFases)
│   │   └── store.js                # Extensión de MemoryStore con accounts, sessions y filtros de pedidos
│   ├── services/
│   │   ├── auth.service.js         # Registro, autenticación de credenciales, tokens y sesiones
│   │   └── account-order.service.js# Filtrado de "Mis compras", validación IDOR y cambio de fase
│   ├── controllers/
│   │   ├── auth.controller.js      # Controladores REST de /api/auth (registro, login, me, logout)
│   │   └── account-order.controller.js # Controladores REST de /api/pedidos/mis-compras y /api/pedidos/:ref/fase
│   ├── middleware/
│   │   ├── auth.js                 # Reutilización de requireAdminRole
│   │   └── account-auth.js         # Middleware requireAuth para verificar sesiones de cliente
│   └── routes/
│       ├── auth.routes.js          # Rutas REST de autenticación (/api/auth)
│       └── order.routes.js         # Extensión modular de rutas de pedidos (mis-compras y fase)
frontend/
├── public/
│   └── cuenta.html                 # Vista cliente de acceso, registro y panel privado "Mis compras"
└── src/
    ├── components/
    │   └── cuenta/
    │       ├── auth-form.js        # Componente interactivo de login y registro
    │       ├── order-history.js    # Componente de listado cronológico de compras
    │       └── phase-stepper.js    # Componente visual del trazador de las 4 fases de pedido
    ├── services/
    │   └── account-api.service.js  # Cliente HTTP para auth y consulta de pedidos privados
    └── styles/
        └── cuenta.css              # Estilos responsivos de formularios, tabla de compras y stepper
tests/
├── contract/
│   └── cuentas-seguimiento-api.test.js # Validación de contratos OpenAPI de /api/auth y pedidos
└── integration/
    └── cuentas-seguimiento-flow.test.js # Flujo completo: registro -> login -> compra -> seguimiento -> admin fase
```

---

## Complexity Tracking

> **Sin violaciones constitucionales detectadas. Todas las decisiones técnicas se adhieren al Principio I (Simplicidad ante todo) y Principio V (Respeto por los datos).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|------------|------------------|----------------------|
| **Cifrado de contraseñas** | `node:crypto.scryptSync` nativo | Elimina la necesidad de dependencias npm externas compiladas en C++ (`bcrypt`). |
| **Persistencia de sesión** | Token opaco en memoria y `localStorage` | Evita configuraciones complejas de cookies/SameSite en entornos de desarrollo y pruebas automatizadas. |
| **Almacenamiento de datos** | Ampliación de `MemoryStore` (`store.js`) | Reutiliza la arquitectura existente del proyecto sin introducir servidores de base de datos externos. |
| **Vinculación de pedidos** | Campo `cuentaId` en `Order` | Aprovecha el campo ya diseñado en Feature 003 sin crear tablas intermedias. |
