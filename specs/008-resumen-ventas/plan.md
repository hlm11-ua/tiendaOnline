# Implementation Plan: 008 - Resumen de Ventas y Exportación de Métricas

**Branch**: `008-resumen-ventas` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-resumen-ventas/spec.md`

---

## Summary

Implementar el módulo de inteligencia de negocio y exportación de ventas para los administradores de la tienda online de artesanías. Proporciona un cuadro de mando interactivo con el cálculo de ingresos totales brutos en euros (€), recuento de pedidos confirmados y cobrados, ranking de los 5 artículos más vendidos (Top 5) ordenados por unidades y desempate por facturación, y filtrado temporal (últimos 7 días, último mes, último año o rango de fechas personalizado). Incorpora la función de descarga de un archivo estructurado CSV delimitado por punto y coma (`;`), separador decimal en coma (`,`) y codificación UTF-8 con BOM para su análisis nativo e inmediato en hojas de cálculo (Microsoft Excel y LibreOffice en `es-ES`).

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules)  
**Primary Dependencies**: Express 4.x, módulos nativos de Node.js (`node:crypto`, `node:test`, `node:assert`, `node:path`)  
**Storage**: Almacén en memoria centralizado en `backend/src/models/store.js` consultado por el servicio de ventas  
**Testing**: Node.js Test Runner (`node --test tests/**/*.test.js`) con pruebas de contrato y validación automatizada de escenarios quickstart  
**Target Platform**: Navegadores web modernos (Desktop / Tablet) y servidor Node.js local  
**Project Type**: Aplicación web (Backend REST API + Frontend Vanilla JS/CSS interactivo)  
**Performance Goals**: Renderizado de métricas en $< 1$ s (SC-001); inicio de descarga CSV en $< 2$ s (SC-002)  
**Constraints**: 100% en español de España (`es-ES`), importes monetarios en euros (`€`), cero dependencias externas de BI pesadas (Principio I)  
**Scale/Scope**: Consultas de períodos de hasta 12 meses de actividad comercial sin demoras perceptibles  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|--------------------------|--------|------------------------------|
| **I. Simplicidad ante todo** | **PASADO** | No se integran herramientas de Business Intelligence ni bases de datos analíticas complejas. Las métricas y el ranking Top 5 se calculan en memoria mediante un servicio ligero (`sales-report.service.js`) y el CSV se genera directamente en memoria en milisegundos. |
| **II. Idioma y mercado** | **PASADO** | Interfaz del cuadro de mando, selectores temporales, columnas del CSV (`Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)`), separador decimal en coma y moneda única en euros (`€`) conforme al estándar de España (`es-ES`). |
| **III. Cero alcance fantasma** | **PASADO** | Se implementan estrictamente los 6 requisitos funcionales (FR-001 a FR-006) y las 5 clarificaciones acordadas en la sesión de spec-kit. No se añaden filtros no especificados (como artesanos o categorías) ni gráficos sobredimensionados. |
| **IV. Verificable por personas no técnicas** | **PASADO** | Se entrega una interfaz web en `/admin/ventas.html` con selectores claros de fecha, tarjetas con los totales en euros, tabla visual del Top 5 y un botón visible "Exportar a CSV" que descarga un archivo legible al instante con doble clic en Excel en español. |
| **V. Respeto por los datos del usuario** | **PASADO** | Solo los administradores autorizados tienen acceso al panel (FR-001). En el CSV y en el informe no se exportan ni almacenan datos sensibles de pago, números de tarjeta ni contraseñas. |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-resumen-ventas/
├── spec.md                  # Especificación funcional con clarificaciones integradas
├── plan.md                  # Este documento de planificación técnica
├── research.md              # Phase 0: Decisiones de arquitectura y formato CSV es-ES
├── data-model.md            # Phase 1: Entidades, estructuras y validaciones
├── contracts/
│   └── ventas-admin-api.yaml # Phase 1: Contrato OpenAPI de la API administrativa de ventas
├── quickstart.md            # Phase 1: Guía de validación paso a paso observable
└── checklists/
    └── requirements.md      # Lista de control de calidad de la especificación
```

### Source Code & Tests Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js            # Períodos estándar y etiquetas en español
│   ├── models/
│   │   ├── store.js                # Acceso a colección de pedidos confirmados
│   │   └── sales-report.model.js   # Modelos de reporte y ranking de productos
│   ├── services/
│   │   └── sales-report.service.js # Cálculo de agregaciones, Top 5 y generación CSV
│   ├── controllers/
│   │   └── sales-report.controller.js # Controladores REST (/api/admin/ventas)
│   ├── routes/
│   │   └── sales-report.routes.js  # Rutas protegidas con middleware de rol admin
│   └── server.js                   # Montaje de rutas de ventas y servicio de ventas.html
frontend/
├── public/
│   └── admin/
│       └── ventas.html             # Cuadro de mando visual de informes de venta
└── src/
    ├── components/
    │   └── admin/
    │       └── sales-report-view.js # Componente interactivo de filtros, métricas y descarga
    ├── services/
    │   └── sales-report-api.service.js # Cliente HTTP frontend para la API de ventas
    └── styles/
        └── admin-ventas.css         # Estilos visuales del cuadro de mando
tests/
├── contract/
│   └── ventas-admin-api.test.js    # Pruebas de contrato de /resumen y /exportar
└── integration/
    └── quickstart-ventas.test.js   # Batería automatizada de los escenarios de quickstart.md
```

---

## Complexity Tracking

> **Sin violaciones constitucionales. Todas las soluciones adoptadas son las más simples y directas (Principio I).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|---|---|---|
| **Cálculo de métricas** | Reducción funcional directa en memoria | Elimina infraestructura externa y responde en $< 20$ ms para 12 meses de datos. |
| **Ranking de artículos** | Agrupación en memoria + ordenación Top 5 | Algoritmo determinista sin librerías de terceros ni paginación en v1. |
| **Generación de CSV** | Serialización directa de strings con UTF-8 BOM | Apertura nativa en Excel sin instalar paquetes pesados de hojas de cálculo binarias. |
| **Seguridad y roles** | Middleware `requireAdmin` existente (`x-user-role: admin`) | Reutiliza el mecanismo de control de acceso estándar del proyecto sin nuevos servicios de autenticación. |

---

## Execution Phases

### Phase 0: Outline & Research
- Generación de `research.md` resolviendo decisiones de agregación en memoria, formato CSV adaptado a `es-ES`, criterios de imputación temporal y control de acceso.

### Phase 1: Design & Contracts
- Generación de `data-model.md` con las entidades `SalesReportSummary`, `ProductRankingItem`, `SalesTransactionDetail` y reglas de validación.
- Generación de `contracts/ventas-admin-api.yaml` con la especificación OpenAPI 3.0.3 para `/api/admin/ventas/resumen` y `/api/admin/ventas/exportar`.
- Generación de `quickstart.md` con los 6 escenarios ejecutables paso a paso para validación no técnica y de testing automatizado.

### Phase 2: Tasks & Implementation
- Generación posterior del plan de tareas accionables `tasks.md` mediante `/speckit-tasks`.
