# Implementation Plan: 006 - Administración de Productos y Alertas de Stock Bajo

**Branch**: `006-administracion-catalogo` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-administracion-catalogo/spec.md`

---

## Summary

Implementar el módulo completo de administración de catálogo y monitorización de inventario para la tienda artesanal. Permite a los administradores gestionar categorías temáticas (crear, editar, archivar con validación de no orfandad), dar de alta y editar fichas de productos con precio base en euros (€), asignar artesano, subir hasta 5 fotografías (JPG, PNG, WebP de hasta 5 MB c/u), definir variantes de producto con inventario independiente (con creación automática de la variante estándar "Única" si no hay opciones diferenciadas), fijar umbrales numéricos de seguridad y visualizar alertas inmediatas en el panel de control cuando las existencias desciendan a niveles críticos o se agoten, sincronizado en tiempo real con las ventas del checkout.

---

## Technical Context

**Language/Version**: JavaScript / Node.js v18+ (ES Modules)  
**Primary Dependencies**: Express 4.x, Node native modules (`node:crypto`, `node:test`, `node:assert`, `node:path`)  
**Storage**: Almacén en memoria reactivo en `backend/src/models/store.js` extendido con colecciones de categorías, productos y variantes unificadas con el inventario transaccional existente  
**Testing**: Node.js Test Runner (`node --test tests/**/*.test.js`) con pruebas unitarias, de contrato y de integración de flujo completo  
**Target Platform**: Navegadores web modernos (Desktop / Tablet / Móvil) y servidor Node.js local  
**Project Type**: Aplicación web (Backend REST API en `/api/admin/*` + Frontend Vanilla JS/CSS con componentes modulares en `/public/admin/`)  
**Performance Goals**: Publicación completa de ficha con fotos y variantes en $< 2$ minutos (`SC-001`); cálculo y renderizado de alertas en $< 100$ ms; descuento inmediato de inventario al venderse en tienda pública (`SC-003`)  
**Constraints**: 100% en español de España (`es-ES`), importes en euros (`€`), límite estricto de 5 fotos de 5 MB por producto, todas las variantes comparten el precio base del producto, alertas exclusivamente visuales en panel (canales externos fuera de alcance)  
**Scale/Scope**: Catálogo artesanal de taller con decenas de productos, variantes y categorías, con control de concurrencia y preservación histórica de pedidos  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|--------------------------|--------|------------------------------|
| **I. Simplicidad ante todo** | **PASADO** | No se introducen ORMs pesados ni bases de datos externas en v1; se extiende `store.js` de manera consistente. Todas las variantes comparten el precio base evitando modelos complejos de tarificación. Alertas calculadas dinámicamente sin colas de mensajería. |
| **II. Idioma y mercado** | **PASADO** | Formularios, tablas, mensajes de validación, errores y distintivos de estado redactados en español de España (`es-ES`). Precios e importes exclusivamente en euros (`€`). |
| **III. Cero alcance fantasma** | **PASADO** | Se implementa estrictamente lo redactado en `spec.md` (FR-001 a FR-007) y las 5 clarificaciones acordadas. Se deja explícitamente fuera de alcance el envío de correos o SMS para alertas de stock. |
| **IV. Verificable por personas no técnicas** | **PASADO** | Interfaz visual intuitiva para crear productos, badges claros ("Agotado" en rojo, "Stock bajo: X unidades" en naranja) y mensajes de bloqueo comprensibles (ej. al intentar archivar una categoría con productos). |
| **V. Respeto por los datos del usuario** | **PASADO** | Solo se recogen datos esenciales de la ficha del producto y la artesanía. Sin secretos en el código ni exposición de información sensible. |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-administracion-catalogo/
├── spec.md                  # Especificación funcional con clarificaciones integradas
├── plan.md                  # Este documento de planificación técnica
├── research.md              # Decisiones técnicas y análisis de alternativas
├── data-model.md            # Entidades, relaciones y máquinas de estado
├── contracts/
│   └── catalogo-admin-api.yaml # Contrato OpenAPI 3.0 de endpoints administrativos
└── quickstart.md            # Guía de validación y escenarios de prueba ejecutables
```

### Source Code & Tests Architecture

```text
backend/
├── src/
│   ├── config/
│   │   └── constants.js            # Umbrales por defecto, límites de fotos y roles
│   ├── middleware/
│   │   └── auth.js                 # Middleware simple de verificación de rol admin (FR-001)
│   ├── models/
│   │   ├── store.js                # Extensión con categorías, productos y variantes
│   │   ├── category.model.js       # Entidad y validaciones de Categoria
│   │   └── product.model.js        # Entidad y validaciones de Producto y Variante
│   ├── services/
│   │   └── catalog-admin.service.js # Lógica de negocio, integridad referencial y alertas
│   ├── controllers/
│   │   └── catalog-admin.controller.js # Controladores REST (/api/admin/*)
│   └── routes/
│       └── catalog-admin.routes.js # Definición de rutas administrativas
frontend/
├── public/
│   └── admin/
│       └── catalogo.html           # Panel de administración de catálogo e inventario
└── src/
    ├── components/admin/
    │   ├── category-manager.js     # Componente de gestión y archivado de categorías
    │   ├── product-form.js         # Formulario de alta/edición con fotos y variantes
    │   ├── product-list-table.js   # Tabla de productos con badges visuales de alerta
    │   └── stock-alerts-widget.js  # Resumen y filtro rápido de stock bajo y agotados
    ├── services/
    │   └── catalog-admin-api.service.js # Cliente HTTP del panel de administración
    └── styles/
        └── admin-catalogo.css      # Estilos del panel de administración y alertas
tests/
├── contract/
│   └── catalogo-admin-api.test.js  # Pruebas de contrato OpenAPI para /api/admin/*
├── unit/
│   └── catalog-admin.service.test.js # Pruebas unitarias de reglas de negocio y stock
└── integration/
    └── catalog-flow.test.js        # Prueba e2e: alta producto -> venta -> alerta stock bajo
```

---

## Complexity Tracking

> **Sin violaciones constitucionales. Todas las soluciones adoptadas son las más simples y directas (Principio I).**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|------------|------------------|----------------------|
| **Almacenamiento** | Extensión en memoria en `store.js` | Mantiene la cohesión con el inventario actual y evita bases de datos externas en v1. |
| **Precio de Variantes** | Compartir `precioBase` del producto | Evita cálculos complejos por variante y simplifica el catálogo artesanal. |
| **Alertas de Stock** | Cálculo reactivo en lectura | No requiere servicios de segundo plano ni colas asíncronas para evaluar umbrales. |
| **Límites de Imágenes** | Validación nativa de 5 fotos de 5 MB | Evita dependencias nativas en C++ (como Sharp) o almacenamiento en la nube en v1. |
| **Variante por Defecto** | Generación automática de "Única" | Unifica el modelo de inventario sin ramificar flujos para productos sin opciones. |
