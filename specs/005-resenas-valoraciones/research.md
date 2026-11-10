# Technical Research & Decisions: 005 - Sistema de Valoraciones y Comentarios de Productos

**Branch**: `feat/valoraciones`  
**Date**: 2026-11-10  
**Status**: Completed  
**Feature Spec**: [spec.md](./spec.md)

---

## 1. Verificación de Compra Previa (Purchase Verification)

### Contexto y Necesidad
El requisito fundamental de HU-05 (FR-001, FR-002, FR-003, SC-001) exige que únicamente los usuarios que hayan adquirido previamente el producto artesanal en un pedido válido puedan publicar una valoración y comentario. Si el usuario no ha realizado una compra o no está autenticado, la interfaz debe ocultar el formulario o mostrar un aviso informativo claro en español.

### Decisión
- Implementar la verificación en `backend/src/services/review.service.js` consultando directamente el registro de pedidos en `backend/src/models/store.js`.
- Criterios de validación de compra verificado:
  1. El pedido debe pertenecer al usuario (coincidencia de `cuentaId === usuarioId` o `clienteEmail === usuarioEmail`).
  2. El pedido debe encontrarse en estado cerrado/válido:
     - `CONSTANTS.ORDER_STATUS.PAID` (`'pagado'`)
     - `CONSTANTS.ORDER_STATUS.DELIVERED` (`'entregado'`)
     - `CONSTANTS.ORDER_STATUS.IN_PREPARATION` (`'en_preparacion'`) o `CONSTANTS.ORDER_STATUS.SHIPPED` (`'salido_tienda'`)
     - Estados excluidos: pedidos en `'pendiente'`, cancelados o reembolsados.
  3. Las líneas del pedido (`order.lineas`) deben contener el identificador del producto (`productoId`) o una de sus variantes asociadas.
- Exponer un endpoint de verificación rápida: `GET /api/resenas/elegibilidad/:productoId` para que el frontend pueda comprobar en milisegundos si muestra el formulario de creación, el mensaje de "ya valorado" o el aviso de "solo compradores verificados".

### Razón
- Reutiliza la estructura existente de pedidos en `store.js` sin duplicar datos ni requerir bases de datos secundarias.
- Cumple el Principio I de la Constitución (Simplicidad ante todo) y garantiza que el 100% de las valoraciones publicadas provengan de compradores reales (`SC-001`).

### Alternativas Consideradas
- **Tabla independiente de autorizaciones o tokens de compra**: Descartada por sobreingeniería (Principio I); la consulta sobre los pedidos existentes es inmediata y garantiza una única fuente de verdad.
- **Validación únicamente en cliente (frontend)**: Descartada de plano por seguridad; la verificación debe ser estricta tanto en backend (controlador y servicio) como en interfaz gráfica.

---

## 2. Límite de Única Valoración por Usuario y Producto

### Contexto y Necesidad
Según FR-004, FR-007 y FR-008, cada usuario puede registrar como máximo una (1) sola opinión por producto del catálogo, independientemente de si compró varias unidades o realizó compras repetidas en el tiempo. Intentos posteriores deben bloquearse impidiendo duplicados.

### Decisión
- Indexar las valoraciones en `backend/src/models/store.js` bajo una clave única compuesta: `${usuarioId}:${productoId}`.
- Al intentar publicar:
  1. Si ya existe un registro con dicha clave única, el servicio lanza un error con código `CONFLICTO_VALORACION_DUPLICADA` (HTTP 409) con el mensaje: *"Ya has publicado una valoración para este producto."*.
  2. La interfaz de usuario comprueba la elegibilidad al cargar el producto y, si detecta una valoración previa, sustituye el formulario por un bloque informativo: *"Ya has valorado este producto"*, mostrando la calificación otorgada.

### Razón
- Previene inconsistencias, sesgos en la reputación y distorsión de la nota media del catálogo.
- La clave hash garantiza una comprobación en tiempo constante $O(1)$.

### Alternativas Consideradas
- **Permitir edición/reemplazo de reseña anterior**: Descartada para v1 atendiendo al Principio III (Cero alcance fantasma) y Principio I (Simplicidad ante todo), ciñéndose al requisito literal: *"un único comentario y valoración de cada artículo"*.

---

## 3. Cálculo de la Nota Media y Métricas de Calificación

### Contexto y Necesidad
Conforme a FR-009, FR-011, FR-012 y SC-004, cada producto debe exhibir su nota media numérica con un decimal (ej. `4,5 / 5`), el total de opiniones recibidas y la lista cronológica de comentarios. Tras registrarse una nueva opinión, los valores deben actualizarse al instante.

### Decisión
- El cálculo de la media se realiza dinámicamente en el servicio `review.service.js` sobre las reseñas activas del producto:
  $$\text{notaMedia} = \frac{\sum_{i=1}^N \text{puntuacion}_i}{N}$$
  redondeada a un decimal: `Math.round((suma / total) * 10) / 10`.
- Si el producto no tiene reseñas ($N = 0$), se devuelven `media: 0`, `total: 0` y la interfaz presenta el mensaje: *"Este producto aún no cuenta con valoraciones. ¡Sé el primero en opinar tras comprarlo!"*.
- En cada tarjeta del catálogo (`product-grid.js`) se añade un indicador visual de valoración media (ej. `★ 4.5 (3)`) para informar al usuario antes de entrar en detalle.

### Razón
- Almacenamiento en memoria ultrarrápido ($< 1$ ms para decenas de reseñas).
- Elimina riesgos de desincronización entre agregados precalculados y las entidades reales.

### Alternativas Consideradas
- **Persistir la media como atributo estático en el modelo Producto**: Rechazado para v1 para evitar inconsistencias de concurrencia y sobrecarga de mutación de catálogo.

---

## 4. Estructura y Validación de la Valoración (1 a 5 Estrellas y Comentario)

### Contexto y Necesidad
FR-004, FR-005, FR-006 y SC-003 exigen puntuación entera obligatoria de 1 a 5 estrellas y un comentario de texto no vacío.

### Decisión
- Validación estricta en el modelo `Review`:
  - `puntuacion`: Número entero obligatorio, $1 \le \text{puntuacion} \le 5$. Valores nulos, decimales (ej. 3.5) o fuera de rango se rechazan con HTTP 400 (`PUNTUACION_INVALIDA`).
  - `comentario`: Cadena de texto obligatoria, tras aplicar `.trim()`, longitud mínima de 3 caracteres y máxima de 1.000 caracteres. Textos vacíos o compuestos únicamente por espacios son rechazados con HTTP 400 (`COMENTARIO_OBLIGATORIO`).
  - `usuarioNombre`: Extraído de la cabecera `x-usuario-nombre` o del cuerpo, garantizando que figure el nombre del cliente en la reseña pública.
  - `fechaCreacion`: Timestamp ISO-8601 (`new Date().toISOString()`), formateado en interfaz según la configuración local de España (`es-ES`).

### Razón
- Máxima robustez de datos.
- Previene reseñas basura o spam de espacios en blanco.

---

## 5. Arquitectura de Componentes Frontend y Experiencia de Usuario

### Contexto y Necesidad
La interfaz debe ser intuitiva, accesible para usuarios no técnicos (Principio IV de la Constitución) y 100% en español de España (Principio II).

### Decisión
- **Componente Modal/Panel de Reseñas** (`frontend/src/components/resenas/product-reviews-modal.js`):
  - Integrado de manera no intrusiva con `frontend/public/catalogo.html`.
  - En cada tarjeta de producto (`product-grid.js`), un botón *"Ver opiniones y valorar"* abre el modal accesible con foco gestionado y soporte de tecla Escape.
  - Selector interactivo de estrellas mediante botones de radio o botones accesibles con atributos `aria-label="1 estrella"`, etc.
  - Mensajes de feedback con alertas dinámicas en español:
    - Éxito: *"¡Gracias por tu valoración! Tu reseña ha sido publicada con éxito."*
    - Errores claros con indicaciones precisas.
- **Servicio Cliente API** (`frontend/src/services/review-api.service.js`):
  - Encapsula las llamadas HTTP a `/api/resenas` con manejo estructurado de errores y soporte de cabeceras de usuario (`x-usuario-id`, `x-usuario-nombre`, `x-usuario-email`).
- **Estilos dedicados** (`frontend/src/styles/resenas.css`):
  - Respetan la paleta cromática de la tienda artesanal (tonos ámbar para las estrellas doradas, contraste WCAG AA, diseño responsive).

### Razón
- Cumplimiento de los principios de simplicidad y verificación no técnica.
- No requiere librerías externas ni transpilación.
