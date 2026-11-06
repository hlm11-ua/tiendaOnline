# Implementation Plan: 001 - Catálogo de productos con filtros y sincronización de URL

**Branch**: `001-catalogo-filtros` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-catalogo-filtros/spec.md`

---

## Summary

Implementar la experiencia pública de navegación y descubrimiento de productos artesanales en la tienda online. Permite a cualquier visitante explorar categorías temáticas de artesanías, aplicar filtros combinados de rango de precio (mínimo y máximo en €), productor o taller artesanal, y disponibilidad en stock (ocultando artículos sin existencias), con sincronización bidireccional en tiempo real con los parámetros query de la URL (`URLSearchParams` + `history.pushState`/`popstate`). Incluye estado amigable cuando no existen coincidencias, botón de restablecimiento total de filtros y visualización de precios en euros (`€`) con interfaz íntegramente en español (`es-ES`).

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules)  
**Primary Dependencies**: Express 4.x, Node native modules (`node:path`, `node:url`, `node:crypto`, `node:test`, `node:assert`)  
**Storage**: Almacén reactivo en memoria en `backend/src/models/store.js`, consultando productos activos, categorías y stock consolidado de variantes  
**Testing**: Node.js Test Runner (`node --test tests/**/*.test.js`) con pruebas unitarias, de contrato OpenAPI y de integración end-to-end  
**Target Platform**: Navegadores web modernos (Desktop / Tablet / Móvil) y servidor Node.js local  
**Project Type**: Aplicación web (Backend REST API en `/api/catalogo/*` + Frontend Vanilla JS/CSS en `frontend/public/catalogo.html`, componentes modulares en `frontend/src/components/catalogo/` y servicio cliente en `frontend/src/services/catalog-api.service.js`)  
**Performance Goals**: Filtrado reactivo en pantalla $< 500$ ms; carga completa de URL compartida con filtros en $< 1,5$ s (`SC-003`); localización de producto en $< 20$ s (`SC-001`)  
**Constraints**: 100% en español de España (`es-ES`), precios en euros (`€`) con 2 decimales, compatibilidad total con SEO mediante URLs limpias y legibles, sin dependencias externas en frontend (Vanilla JS)  
**Scale/Scope**: Catálogo de artesanías con decenas de piezas, categorías temáticas y artesanos, con sincronización de inventario en tiempo real  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|---|:---:|---|
| **I. Simplicidad ante todo** | **PASADO** | No se introducen frameworks frontend pesados (React/Vue) ni routers externos; se utiliza JavaScript nativo modular (`URLSearchParams`, `history.pushState`, ES Modules). El filtrado reutiliza el almacén en memoria en `store.js` sin bases de datos adicionales en v1. |
| **II. Idioma y mercado** | **PASADO** | Toda la interfaz de usuario, selectores, controles, etiquetas de accesibilidad, mensajes de estado vacío y documentación están en español de España (`es-ES`). Los importes se presentan exclusivamente en euros con dos decimales y el símbolo oficial (`€`). |
| **III. Cero alcance fantasma** | **PASADO** | Se implementan con rigor y exclusividad los requerimientos acordados en `spec.md` (FR-001 a FR-011 y User Stories 1 a 4). Se descartan búsquedas libres predictivas o suscripciones que no formen parte de HU-01. |
| **IV. Verificable por personas no técnicas** | **PASADO** | El catálogo y los filtros se pueden verificar de principio a fin interactuando visualmente con la web o compartiendo URLs entre pestañas del navegador, sin necesidad de comandos técnicos. |
| **V. Respeto por los datos del usuario** | **PASADO** | No se recopilan datos personales ni se requiere registro o autenticación para navegar por el catálogo y aplicar filtros. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-catalogo-filtros/
├── spec.md                  # Especificación funcional de requerimientos
├── plan.md                  # Este documento de planificación técnica
├── research.md              # Decisiones técnicas y análisis de alternativas
├── data-model.md            # Entidades, relaciones y reglas de filtrado
├── contracts/
│   └── catalogo-api.yaml    # Contrato OpenAPI 3.0 de endpoints públicos del catálogo
├── quickstart.md            # Guía de validación y escenarios de prueba ejecutables
└── checklists/
    └── requirements.md      # Lista de verificación de calidad
```

### Source Code & Tests Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js             # Constantes globales, rutas y configuración
│   ├── models/
│   │   ├── store.js                 # Métodos de consulta y filtrado de productos y stock
│   │   ├── category.model.js        # Modelo de categorías
│   │   └── product.model.js         # Modelo de productos y variantes
│   ├── services/
│   │   └── catalog.service.js       # Lógica de filtrado multidimensional y metadatos
│   ├── controllers/
│   │   └── catalog.controller.js    # Controladores REST (/api/catalogo/*)
│   ├── routes/
│   │   └── catalog.routes.js        # Definición de rutas públicas de catálogo
│   └── server.js                    # Registro de rutas y servicio estático de /catalogo.html
frontend/
├── public/
│   └── catalogo.html                # Vista principal pública del catálogo y filtros
└── src/
    ├── components/catalogo/
    │   ├── catalog-filters.js       # Controles interactivos de categorías, precios, artesanos y stock
    │   └── product-grid.js          # Renderizado de fichas de producto y estado vacío
    ├── services/
    │   └── catalog-api.service.js   # Cliente HTTP para consultar /api/catalogo/*
    └── styles/
        └── catalogo.css             # Estilos de maquetación, filtros, grid y badges
tests/
├── contract/
│   └── catalogo-api.test.js         # Pruebas de contrato OpenAPI para /api/catalogo/*
└── integration/
    └── quickstart-catalogo.test.js  # Validación automatizada de escenarios de quickstart
```

---

## Complexity Tracking

> **Sin violaciones constitucionales. Todas las soluciones adoptadas son las más simples y directas (Principio I).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|---|---|---|
| **Sincronización URL** | `URLSearchParams` + `history.pushState` / `popstate` nativos | Evita librerías de enrutamiento externas manteniendo soporte total de historial y SEO. |
| **Componentes UI** | Vanilla JS con Custom Events y ES Modules | Respeta el Principio I evitando compiladores, empaquetadores complejos o frameworks pesados. |
| **Filtrado Backend** | Servicio `catalog.service.js` sobre `store.js` | Reutiliza los datos consolidados en memoria garantizando tiempos de respuesta mínimos. |
| **Saneamiento de Rangos** | Inversión automática si `minPrecio > maxPrecio` | Evita bloqueos en la interfaz y ofrece una experiencia resiliente al usuario. |
