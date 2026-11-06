# Technical Research & Decisions: 001 - Catálogo de productos con filtros y sincronización de URL

**Branch**: `001-catalogo-filtros`  
**Date**: 2026-11-06  
**Status**: Completed  
**Feature Spec**: [spec.md](./spec.md)

---

## 1. Sincronización Bidireccional de Filtros y URL (SEO y Navegación)

### Contexto y Necesidad
El requisito fundamental de HU-01 (FR-003, FR-004, FR-006, FR-007) exige que cualquier interacción en los filtros de la interfaz (categoría, rango de precio mínimo/máximo, artesano/productor, y disponibilidad en stock) se refleje de manera inmediata en la cadena de consulta de la URL (`window.location.search`). Asimismo, al acceder mediante una URL directa o compartida, la interfaz debe restaurar el estado exacto de los filtros y realizar la búsqueda sin desajustes, permitiendo además la navegación coherente mediante los botones "Atrás" y "Adelante" del navegador.

### Decisión
- Utilizar la API nativa del navegador `URLSearchParams` junto con `history.pushState()` para cambios significativos de filtro (ej. cambio de categoría o aplicación manual de filtros) y `history.replaceState()` para ajustes continuos o saneamiento de parámetros inválidos.
- Escuchar el evento estándar `window.addEventListener('popstate', ...)` para sincronizar automáticamente el estado visual de los componentes de filtro y el listado de productos cuando el usuario use el historial del navegador.
- Definir un esquema canónico de parámetros de consulta:
  - `categoria`: slug en minúsculas de la categoría activa (ej. `ceramica`, `textil`, `madera`, `joyeria-y-metal`). Si no se selecciona ninguna o se elige "todas", se omite el parámetro.
  - `minPrecio`: número entero o decimal no negativo con hasta dos decimales (ej. `15.00` o `15`).
  - `maxPrecio`: número entero o decimal no negativo con hasta dos decimales (ej. `50.00` o `50`).
  - `productor`: nombre normalizado o identificador del artesano (ej. `Taller Hermanos Alfareros`).
  - `enStock`: valor booleano en texto (`true`). Si no está activado, se omite el parámetro para mantener URLs limpias y legibles.

### Razón
- Plenamente soportado en todos los navegadores modernos sin librerías externas (Principio I: Simplicidad ante todo).
- Los motores de búsqueda indexan directamente rutas con `query params` semánticos y legibles.
- Evita recargas completas de página (SPA liviana sin framework pesado).

### Alternativas Consideradas
- **Rutas basadas en hash (`/#/categoria/ceramica?min=10`)**: Rechazado porque los fragmentos de hash (`#`) no son enviados al servidor y son subóptimos para indexación SEO estándar.
- **Librerías de enrutamiento frontend externas (Navigo, Page.js)**: Rechazado para cumplir con el Principio I (Simplicidad ante todo) de la Constitución; la API estándar `URLSearchParams` y `history.pushState` resuelven la necesidad con menos de 40 líneas de código nativo.

---

## 2. Arquitectura de Componentes Frontend y Estado Reactivo

### Contexto y Necesidad
El frontend debe ofrecer una experiencia fluida con controles interactivos: selector de categorías, selector o lista desplegable de artesanos/productores, campos numéricos de precio mínimo y máximo en euros, casilla o interruptor para "Solo en stock", mensaje de estado vacío y botón único para restablecer filtros.

### Decisión
- Implementar una arquitectura modular en JavaScript Vanilla (ES Modules) siguiendo el mismo patrón ya probado con éxito en el panel de administración (`frontend/src/components/admin/`) y en el checkout (`frontend/src/components/`):
  - `frontend/public/catalogo.html`: Vista principal con marcado semántico accesible (`<main>`, `<aside role="search">`, `<section role="region" aria-label="Catálogo">`).
  - `frontend/src/components/catalogo/catalog-filters.js`: Componente encargado de renderizar y gestionar los controles de filtro, capturar eventos de usuario y disparar eventos personalizados de cambio.
  - `frontend/src/components/catalogo/product-grid.js`: Componente de renderizado de la cuadrícula de tarjetas de productos, badges de stock y estado vacío con botón de restablecimiento.
  - `frontend/src/services/catalog-api.service.js`: Capa de servicio cliente para interactuar con los endpoints `/api/catalogo/productos` y `/api/catalogo/filtros`.
  - `frontend/src/styles/catalogo.css`: Hoja de estilos con variables CSS acordes a la identidad visual artesanal, responsive y accesible.

### Razón
- Consistencia arquitectónica con el resto del proyecto.
- Cero dependencias adicionales (sin React, Vue ni transpiladores).
- Alta velocidad de carga y renderizado (< 1,5 segundos conforme a `SC-003`).

### Alternativas Consideradas
- **Renderizado exclusivo del lado del servidor (SSR con plantillas EJS/Pug)**: Rechazado porque la especificación exige sincronización en tiempo real e interactividad fluida sin recarga de página al alternar filtros.
- **Framework React/Svelte**: Rechazado tajantemente por la Constitución del proyecto (Principio I: Simplicidad ante todo y prohibición de complejidad anticipada).

---

## 3. Endpoints REST y Modelo de Filtrado en Backend

### Contexto y Necesidad
El backend debe proporcionar a los clientes los datos del catálogo filtrado y los metadatos necesarios para poblar los filtros dinámicos (categorías activas con conteo de productos, lista de artesanos disponibles y rango de precios límite).

### Decisión
- Exponer dos rutas REST públicas bajo `/api/catalogo`:
  1. `GET /api/catalogo/productos`:
     - Parámetros query: `categoria` (slug o id), `minPrecio` (número), `maxPrecio` (número), `productor` (cadena), `enStock` (booleano).
     - Respuesta: Colección JSON de productos formateados, con precio base en euros, imagen principal, categoría, artesano y disponibilidad en stock (`enStock: boolean`, `stockDisponible: number`).
  2. `GET /api/catalogo/filtros`:
     - Proporciona los metadatos globales para inicializar los controles de filtro: lista de categorías activas, lista ordenada de artesanos/productores presentes en catálogo, y límites mínimo y máximo de precio en la tienda.
- Saneamiento y tolerancia a fallos:
  - Si `minPrecio > maxPrecio`, el backend intercambia o ajusta los valores sin fallar.
  - Si un productor o categoría no existe, devuelve una lista vacía `[]` con código 200 en lugar de un error 500, permitiendo al frontend mostrar el mensaje de estado vacío ("No se han encontrado productos con los filtros seleccionados").

### Razón
- Modelo de filtrado declarativo y limpio, directamente compatible con las consultas URL.
- Facilita pruebas de integración y contratos OpenAPI.

### Alternativas Consideradas
- **Filtrado 100% en el cliente (descarga de todo el catálogo)**: Aunque viable con catálogos pequeños, delegar el filtrado al backend con soporte de query params permite coherencia con el servicio REST, indexación crawler y escalabilidad ante catálogos mayores sin romper el contrato cliente-servidor.

---

## 4. Gestión de Moneda, Idioma y Principios Constitucionales

### Contexto y Necesidad
Cumplir estrictamente los Principios II (Idioma y mercado) y IV (Verificable por personas no técnicas).

### Decisión
- Formateo de precios: Utilizar `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` en frontend y backend para garantizar que todos los precios aparezcan con dos decimales y el símbolo monetario oficial (ej. `45,00 €`).
- Textos y mensajes: 100% en español de España (`es-ES`), incluyendo mensajes descriptivos como "No se han encontrado productos con los filtros seleccionados" y etiquetas de accesibilidad `aria-label`.
