# Implementation Plan: 005 - Sistema de Valoraciones y Comentarios de Productos

**Branch**: `feat/valoraciones` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-resenas-valoraciones/spec.md`

---

## Summary

Implementar el sistema de reputación, opiniones y puntuaciones para la tienda online de artesanías. Garantiza que solo los compradores verificados (usuarios autenticados con un pedido cerrado o entregado que contenga el artículo) puedan publicar una valoración y comentario. Restringe la participación a un límite estricto de una (1) única reseña por comprador y producto para prevenir duplicidades y fraudes. Incluye validación de puntuación (1 a 5 estrellas) y comentario explicativo obligatorio, recálculo dinámico e inmediato de la nota media del producto (con un decimal) y listado público cronológico de reseñas con feedback informativo en español (`es-ES`).

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules)  
**Primary Dependencies**: Express 4.x, módulos nativos de Node (`node:crypto`, `node:path`, `node:url`, `node:test`, `node:assert`)  
**Storage**: Almacén reactivo en memoria en `backend/src/models/store.js`, indexando reseñas bajo claves compuestas `${usuarioId}:${productoId}` y colecciones por producto, contrastando con el historial de pedidos en `this.orders`  
**Testing**: Node.js Test Runner nativo (`node --test tests/**/*.test.js`), cubriendo pruebas de contrato OpenAPI, pruebas de integración de flujo y validación de escenarios de quickstart  
**Target Platform**: Servidor Node.js local y navegadores web modernos (Desktop / Móvil)  
**Project Type**: Aplicación web completa (Backend REST API en `/api/resenas/*` + Componentes Frontend Vanilla JS/CSS integrados en el catálogo público)  
**Performance Goals**: Comprobación de elegibilidad $< 10$ ms; cálculo de nota media y agregación $< 5$ ms; renderizado de opiniones en pantalla $< 100$ ms  
**Constraints**: 100% en español de España (`es-ES`), validación obligatoria de 1-5 estrellas y comentario, cero dependencias pesadas en frontend, idempotencia y restricción estricta de compra verificada  
**Scale/Scope**: Catálogo de artesanías con decenas de productos, cientos de pedidos y miles de opiniones de compradores verificados  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|---|:---:|---|
| **I. Simplicidad ante todo** | **PASADO** | No se introducen bases de datos complejas ni frameworks frontend adicionales. Se utiliza JavaScript Vanilla modular y almacenamiento en memoria sobre `store.js` con clave hash compuesta `$usuarioId:$productoId` para garantizar unicidad y agilidad v1. |
| **II. Idioma y mercado** | **PASADO** | Toda la interfaz, etiquetas de estrellas, mensajes de confirmación ("¡Gracias por tu valoración!"), estados informativos y códigos de error están rigurosamente redactados en español de España (`es-ES`). Precios formateados en euros (`€`). |
| **III. Cero alcance fantasma** | **PASADO** | Se implementan exclusivamente los cuatro requisitos acordados en la HU-05 (compra previa, única valoración, estructura 1-5 estrellas + texto, visualización y feedback). Se descartan deliberadamente flujos de edición o moderación que no forman parte del alcance v1. |
| **IV. Verificable por personas no técnicas** | **PASADO** | Todos los escenarios y criterios de éxito pueden ser comprobados directamente desde la interfaz web o mediante peticiones directas legibles documentadas en `quickstart.md`. |
| **V. Respeto por los datos del usuario** | **PASADO** | Únicamente se almacena la información necesaria para la reseña (puntuación, comentario, fecha y nombre visible del comprador), sin recabar datos personales superfluos. |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-resenas-valoraciones/
├── spec.md                  # Especificación funcional de requerimientos
├── plan.md                  # Este documento de planificación técnica
├── research.md              # Decisiones técnicas y análisis de alternativas
├── data-model.md            # Entidades, relaciones y reglas de negocio
├── contracts/
│   └── resenas-api.yaml     # Contrato OpenAPI 3.0 de endpoints REST de reseñas
├── quickstart.md            # Guía de validación y escenarios de prueba ejecutables
└── checklists/
    └── requirements.md      # Lista de verificación de calidad de la especificación
```

### Source Code Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js             # Constantes de reseñas (rangos 1-5, mensajes y códigos)
│   ├── models/
│   │   ├── review.model.js          # Modelo de entidad Resena y validaciones
│   │   └── store.js                 # Métodos de almacenamiento, índice usuario-producto y consulta
│   ├── services/
│   │   └── review.service.js        # Lógica de elegibilidad, cálculo de nota media y publicación
│   ├── controllers/
│   │   └── review.controller.js     # Controladores REST (/api/resenas/*)
│   ├── routes/
│   │   └── review.routes.js         # Definición de rutas Express de reseñas
│   └── server.js                    # Registro y montaje de /api/resenas
frontend/
├── public/
│   └── catalogo.html                # Integración visual del disparador de reseñas y modal
└── src/
    ├── components/
    │   ├── catalogo/
    │   │   └── product-grid.js      # Visualización de estrellas y enlace "Opiniones" en cada tarjeta
    │   └── resenas/
    │       └── product-reviews-modal.js # Componente modal de visualización, formulario y avisos
    ├── services/
    │   └── review-api.service.js    # Cliente HTTP para interactuar con /api/resenas
    └── styles/
        └── resenas.css              # Estilos del sistema de reseñas, estrellas y modal
tests/
├── contract/
│   └── resenas-api.test.js          # Pruebas de contrato OpenAPI para /api/resenas
└── integration/
    └── quickstart-resenas.test.js   # Batería de validación automatizada de escenarios de quickstart
```

---

## Complexity Tracking

> **Sin violaciones constitucionales. Todas las soluciones adoptadas son las más simples y directas (Principio I).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|---|---|---|
| **Verificación de Compra** | Consulta sobre `store.orders` existente | Evita tablas intermedias y reutiliza los pedidos ya pagados o entregados. |
| **Garantía de Unicidad** | Clave Map `${usuarioId}:${productoId}` | Detección atómica en $O(1)$ de reseñas duplicadas sin bloqueos ni transacciones pesadas. |
| **Nota Media** | Cálculo aritmético dinámico bajo demanda | Elimina problemas de desincronización y mutación innecesaria del catálogo base. |
| **Componente Frontend** | Modal Vanilla JS modular con Custom Events | Cero dependencias y compatibilidad directa con `catalogo.html`. |
