# Quickstart: 005 - Sistema de Valoraciones y Comentarios de Productos

**Branch**: `feat/valoraciones`  
**Date**: 2026-11-10  
**Feature Spec**: [spec.md](./spec.md)  
**Data Model**: [data-model.md](./data-model.md)  
**Contract API**: [resenas-api.yaml](./contracts/resenas-api.yaml)

---

## 1. Prerrequisitos y Preparación del Entorno

1. **Entorno Node.js**: Node.js versión 18+ instalado.
2. **Dependencias**: Express 4.x instalado en el proyecto.
3. **Servidor activo**:
   ```bash
   node backend/src/server.js
   ```
   El servidor arrancará por defecto en `http://localhost:3000`.

---

## 2. Escenarios de Validación Ejecutables

### Escenario 1: Restricción para Usuarios Sin Compra Previa (FR-001, FR-002, US-3)

**Objetivo**: Demostrar que un usuario que no ha comprado el producto no puede publicar una reseña y recibe un aviso informativo adecuado.

1. **Paso 1**: Consultar la elegibilidad para el producto `art-001` sin credenciales de compra:
   ```bash
   curl -s -X GET "http://localhost:3000/api/resenas/elegibilidad/art-001" \
     -H "x-usuario-id: usr-anonimo"
   ```
   **Resultado esperado**:
   - HTTP 200 con `puedeValorar: false`, `motivo: "SIN_COMPRA"` y mensaje en español indicando que se requiere compra previa.

2. **Paso 2**: Intentar enviar directamente una reseña para `art-001`:
   ```bash
   curl -s -X POST "http://localhost:3000/api/resenas" \
     -H "Content-Type: application/json" \
     -H "x-usuario-id: usr-sin-compra" \
     -d '{"productoId": "art-001", "puntuacion": 4, "comentario": "Me gustaría comprarlo"}'
   ```
   **Resultado esperado**:
   - HTTP 403 Forbidden con código `COMPRA_REQUERIDA` y mensaje explicativo: *"Solo los clientes que hayan comprado previamente este producto pueden valorarlo."*.

---

### Escenario 2: Publicación de Reseña por Comprador Verificado (FR-003, FR-004, FR-005, FR-009, US-1)

**Objetivo**: Permitir a un cliente con pedido completado publicar una calificación de 5 estrellas con comentario.

1. **Paso 1**: Registrar o verificar un pedido completado/entregado para el usuario `usr-comprador-1` con email `comprador@example.com` que contenga el producto `art-001`.
2. **Paso 2**: Comprobar la elegibilidad del comprador verificado:
   ```bash
   curl -s -X GET "http://localhost:3000/api/resenas/elegibilidad/art-001" \
     -H "x-usuario-id: usr-comprador-1" \
     -H "x-usuario-email: comprador@example.com"
   ```
   **Resultado esperado**:
   - HTTP 200 con `puedeValorar: true` y `motivo: "COMPRA_VERIFICADA"`.

3. **Paso 3**: Enviar la valoración y reseña:
   ```bash
   curl -s -X POST "http://localhost:3000/api/resenas" \
     -H "Content-Type: application/json" \
     -H "x-usuario-id: usr-comprador-1" \
     -H "x-usuario-nombre: Carlos Mendoza" \
     -H "x-usuario-email: comprador@example.com" \
     -d '{"productoId": "art-001", "puntuacion": 5, "comentario": "Excelente calidad de gres y esmalte, exactamente lo que buscaba."}'
   ```
   **Resultado esperado**:
   - HTTP 201 Created con mensaje: *"¡Gracias por tu valoración! Tu reseña ha sido publicada con éxito."*, los datos de la reseña y el resumen actualizado del producto.

---

### Escenario 3: Límite Estricto de Única Valoración por Producto (FR-007, FR-008, US-2)

**Objetivo**: Demostrar que el sistema bloquea cualquier intento de reseña duplicada para el mismo producto y usuario.

1. **Paso 1**: El usuario `usr-comprador-1` intenta enviar una segunda reseña para `art-001`:
   ```bash
   curl -s -X POST "http://localhost:3000/api/resenas" \
     -H "Content-Type: application/json" \
     -H "x-usuario-id: usr-comprador-1" \
     -H "x-usuario-nombre: Carlos Mendoza" \
     -H "x-usuario-email: comprador@example.com" \
     -d '{"productoId": "art-001", "puntuacion": 4, "comentario": "Segundo comentario para el mismo producto."}'
   ```
   **Resultado esperado**:
   - HTTP 409 Conflict con código `VALORACION_DUPLICADA` y mensaje: *"Ya has publicado una valoración para este producto."*.

2. **Paso 2**: Comprobar la elegibilidad actualizada del usuario:
   ```bash
   curl -s -X GET "http://localhost:3000/api/resenas/elegibilidad/art-001" \
     -H "x-usuario-id: usr-comprador-1" \
     -H "x-usuario-email: comprador@example.com"
   ```
   **Resultado esperado**:
   - HTTP 200 con `puedeValorar: false`, `motivo: "YA_VALORADO"`, incluyendo el objeto `resenaPrevia` emitido anteriormente.

---

### Escenario 4: Validación de Campos Obligatorios y Rango de Estrellas (FR-004, FR-005, FR-006)

**Objetivo**: Demostrar el rechazo de envíos con datos incompletos o fuera de rango.

1. **Paso 1**: Enviar reseña con comentario vacío o solo espacios:
   ```bash
   curl -s -X POST "http://localhost:3000/api/resenas" \
     -H "Content-Type: application/json" \
     -H "x-usuario-id: usr-comprador-2" \
     -H "x-usuario-email: comprador2@example.com" \
     -d '{"productoId": "art-001", "puntuacion": 5, "comentario": "   "}'
   ```
   **Resultado esperado**:
   - HTTP 400 Bad Request con código `COMENTARIO_OBLIGATORIO`.

2. **Paso 2**: Enviar reseña con puntuación fuera de rango (ej. 6 estrellas o 0 estrellas):
   ```bash
   curl -s -X POST "http://localhost:3000/api/resenas" \
     -H "Content-Type: application/json" \
     -H "x-usuario-id: usr-comprador-2" \
     -H "x-usuario-email: comprador2@example.com" \
     -d '{"productoId": "art-001", "puntuacion": 6, "comentario": "Muy buen producto"}'
   ```
   **Resultado esperado**:
   - HTTP 400 Bad Request con código `PUNTUACION_INVALIDA`.

---

### Escenario 5: Visualización Pública y Recálculo Inmediato de Nota Media (FR-011, FR-012, FR-013, US-4)

**Objetivo**: Comprobar que cualquier usuario puede consultar el resumen y listado de opiniones, y que la nota media refleja de forma inmediata nuevas valoraciones.

1. **Paso 1**: Consultar las valoraciones del producto `art-001`:
   ```bash
   curl -s -X GET "http://localhost:3000/api/resenas/producto/art-001"
   ```
   **Resultado esperado**:
   - HTTP 200 con `media`, `total`, `distribucion` y lista `items` con las reseñas ordenadas por fecha más reciente.

2. **Paso 2**: Si un producto no tiene reseñas (ej. producto nuevo):
   ```bash
   curl -s -X GET "http://localhost:3000/api/resenas/producto/art-nuevo"
   ```
   **Resultado esperado**:
   - HTTP 200 con `media: 0`, `total: 0`, `items: []`. En la interfaz se muestra el aviso amigable: *"Este producto aún no cuenta con valoraciones. ¡Sé el primero en opinar tras comprarlo!"*.

---

## 3. Validación de Pruebas Automatizadas

Ejecutar la suite completa de pruebas del sistema:
```bash
npm test
```
o la prueba de integración específica una vez implementada:
```bash
node --test tests/integration/quickstart-resenas.test.js
```
