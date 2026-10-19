# Phase 0: Research & Technical Decisions - Carrito de Compras Persistente con Control de Stock

**Feature**: `specs/002-carrito-persistente/spec.md`  
**Responsable**: Desarrollador 2  
**Fecha**: 2026-10-19  

---

## 1. Persistencia Dual: Almacenamiento en Cliente (Anónimos) y Servidor (Registrados)

### Contexto y Requisitos
- **FR-003**: Persistencia indefinida en `LocalStorage` para usuarios anónimos hasta vaciar, comprar o limpiar datos.
- **FR-007**: Carrito asociado a la cuenta de usuario para usuarios autenticados.
- **SC-002**: Persistencia en el 100% de los casos al reabrir el navegador en el mismo perfil de usuario.

### Decisión
- Para **visitantes anónimos**: Utilizar `window.localStorage` bajo la clave `tienda_online_cart_v1`. Estructura serializada en JSON conteniendo `items` (array de objetos `{ varianteId, productoId, titulo, precioUnitario, cantidad, stockDisponible }`) y `fechaActualizacion`.
- Para **usuarios autenticados**: Almacenar el carrito en el backend dentro de `MemoryStore` (`store.carts.get(usuarioId)`), garantizando consistencia entre dispositivos una vez iniciada la sesión.
- Clase cliente unificada `CartStorageService` que abstrae el origen de datos (`LocalStorage` o sincronización con API) ofreciendo una interfaz única al UI.

### Razones
- **Simplicidad ante todo (Principio I)**: `LocalStorage` es nativo del navegador, no requiere cookies, configuraciones de servidor ni librerías externas.
- **Rendimiento (SC-003)**: El acceso a `LocalStorage` toma < 2 ms, cumpliendo holgadamente el objetivo de actualización < 200 ms.
- **Robustez**: Si `LocalStorage` no estuviera disponible (ej. modo incógnito restrictivo), se degradará graciosamente a un objeto en memoria durante la sesión activa informando al usuario.

### Alternativas Rechazadas
- *IndexedDB*: Descartado por sobreingeniería para estructuras pequeñas (< 20 artículos).
- *Cookies de sesión*: Descartado por límite de 4 KB y porque se enviarían innecesariamente en cada petición HTTP estática.

---

## 2. Estrategia de Verificación de Stock en Tiempo Real

### Contexto y Requisitos
- **FR-002 / FR-006**: Validar stock obligatoriamente; reajustar automáticamente si el stock disminuyó por compras concurrentes en tres momentos críticos: al abrir la cesta, al modificar cualquier cantidad y al pulsar "Tramitar pedido".
- **Out of Scope**: Quedan excluidas las reservas de stock con temporizador en el carrito (solo se reservan en el checkout final).

### Decisión
- Implementar un endpoint síncrono ligero: `POST /api/carrito/validar-stock`.
- El frontend envía la lista de `{ varianteId, cantidad }`. El backend consulta el inventario en `store.inventory`, calcula la disponibilidad actual y devuelve:
  - `valido`: booleano (`true` si todas las cantidades deseadas son <= stock real).
  - `items`: array con `{ varianteId, stockDisponible, cantidadAjustada, estado: 'disponible' | 'reajustado' | 'agotado' | 'no_disponible' }`.
- Si el backend detecta artículos agotados o con stock reducido, el frontend actualiza automáticamente el estado local, recalcula subtotales y muestra el aviso visual en línea.

### Razones
- Respeto estricto del alcance: sin temporizadores en cesta, verificación bajo demanda en los 3 puntos clave exigidos por la spec.
- No sobrecarga la red con sockets o polling innecesario.

### Alternativas Rechazadas
- *WebSockets / Server-Sent Events*: Descartado por complejidad y consumo innecesario de conexiones en una tienda de producción artesanal pequeña.
- *Bloqueo de stock al añadir al carrito*: Prohibido explícitamente en la especificación y en las asunciones del proyecto.

---

## 3. Algoritmo Determinista de Fusión de Carritos (FR-007)

### Contexto y Requisitos
- Al iniciar sesión con un carrito local y otro remoto en la cuenta, se deben sumar unidades coincidentes sin superar el stock y unir artículos diferentes.
- Si una cantidad es recortada para no superar el stock, se debe notificar de forma destacada al usuario.

### Decisión
- Endpoint: `POST /api/carrito/fusionar`.
- Algoritmo en backend:
  1. Obtener carrito remoto del usuario (`remotoItems`).
  2. Para cada artículo del carrito local anónimo (`localItem`):
     - Si existe en `remotoItems`:
       - `suma = remotoItem.cantidad + localItem.cantidad`.
       - Si `suma <= stockReal`: `cantidadFinal = suma`.
       - Si `suma > stockReal`: `cantidadFinal = stockReal`, registrar advertencia `{ varianteId, cantidadSolicitada: suma, cantidadAsignada: stockReal, motivo: 'stock_insuficiente' }`.
     - Si no existe en `remotoItems`:
       - `cantidadFinal = min(localItem.cantidad, stockReal)`.
       - Si `localItem.cantidad > stockReal`, registrar advertencia.
  3. Guardar el nuevo carrito unificado en la cuenta del usuario.
  4. Devolver el carrito completo y la lista de `avisosReajuste`.
  5. El cliente vacía el `LocalStorage` local y adopta el carrito fusionado devuelto.

### Razones
- Algoritmo puro, determinista y testeable unitariamente.
- Evita que compras concurrentes o inicios de sesión múltiples superen el inventario.

---

## 4. Validación de Entradas en el Selector de Cantidad (FR-004)

### Contexto y Requisitos
- Solo se admiten números enteros positivos entre 1 y el stock disponible.
- 0 elimina el artículo.
- Decimales, números negativos y caracteres no numéricos deben descartarse restaurando el último valor válido.

### Decisión
- **Frontend**: Componente o helper `QuantityInputHandler`:
  - Escuchar eventos `keydown` e `input` para restringir teclas permitidas (dígitos 0-9).
  - Al perder el foco (`blur`) o presionar Enter:
    - Si el valor es `0` o está vacío: solicitar confirmación / invocar eliminación inmediata de la línea.
    - Si `parseado <= 0` o `isNaN`: restaurar el valor anterior.
    - Si `parseado > stockDisponible`: fijar en `stockDisponible` y mostrar alerta en línea "Cantidad ajustada al stock máximo".
- **Backend**: En los endpoints de modificación de cantidad (`PUT /api/carrito/items/:varianteId`):
  - Validar con `Number.isInteger(cantidad) && cantidad >= 0`.
  - Si `cantidad === 0`, eliminar la línea.
  - Si `cantidad > stock`, responder `400 Bad Request` o `409 Conflict` con detalle del stock disponible.

---

## 5. Visualización y Reglas Monetarias (Principio II)

### Decisión
- Utilizar `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` para todas las representaciones de subtotales, totales y gastos de envío.
- La estimación de gastos de envío estándar se fija en `0,00 €` (envío gratuito en v1, FR-005).
- Todos los cálculos internos operan con números de coma flotante redondeados a 2 decimales (`Math.round(val * 100) / 100`).
