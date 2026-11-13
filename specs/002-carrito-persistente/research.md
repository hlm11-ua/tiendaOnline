# Phase 0: Research & Technical Decisions - Carrito de Compras Persistente con Control de Stock

**Feature**: `specs/002-carrito-persistente/spec.md`  
**Responsable**: Desarrollador 2  
**Fecha**: 2026-10-19 (Actualizado: 2026-11-02)

---

## 1. Persistencia Dual: Almacenamiento en Cliente (Anónimos) y Servidor (Registrados)

### Contexto y Requisitos
- **FR-003**: Persistencia indefinida en `LocalStorage` para usuarios anónimos hasta vaciar, comprar o limpiar datos.
- **FR-007**: Carrito asociado a la cuenta de usuario para usuarios autenticados.
- **SC-002**: Persistencia en el 100% de los casos al reabrir el navegador en el mismo perfil de usuario.

### Decisión
- Para **visitantes anónimos**: Utilizar `window.localStorage` bajo la clave `tienda_online_cart_v1`. Estructura serializada en JSON conteniendo `id`, `usuarioId`, `items` (array de objetos `{ varianteId, productoId, titulo, precioUnitario, cantidad, stockDisponible, estado }`), `gastosEnvioEstimados` y `fechaActualizacion`.
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

## 2. Estrategia de Verificación de Stock en Tiempo Real y Catálogo

### Contexto y Requisitos
- **FR-002 / FR-006**: Validar stock obligatoriamente; reajustar automáticamente si el stock disminuyó por compras concurrentes en tres momentos críticos: al abrir la cesta, al modificar cualquier cantidad y al pulsar "Tramitar pedido".
- **FR-005**: Sincronizar precios con catálogo vigente (`006-administracion-catalogo`).
- **FR-008**: Detectar piezas eliminadas o archivadas en catálogo.
- **Out of Scope**: Quedan excluidas las reservas de stock con temporizador en el carrito (solo se reservan en el checkout final de `003-pago-tarjeta`).

### Decisión
- Implementar un endpoint síncrono ligero: `POST /api/carrito/validar-stock`.
- El frontend envía la lista de `{ varianteId, cantidad }`. El backend consulta:
  1. La disponibilidad real mediante `store.getAvailableStock(varianteId)`, la cual descuenta de forma síncrona las unidades bloqueadas en reservas temporales de checkout activas de `003-pago-tarjeta`.
  2. El precio oficial vigente a través de `store.getProductById(productoId)?.precioBase` compartido por todas las variantes en `006`.
  3. El estado en catálogo: si la variante o producto no existe en `store.inventory`/`store.variants` o su estado es `'archivado'`/`'archivada'`, se marca como `'no_disponible'`.
- Devuelve:
  - `valido`: booleano (`true` si todas las cantidades deseadas son <= stock disponible y no hay piezas no disponibles).
  - `bloqueaTramitacion`: booleano (`true` si existe alguna línea `'agotado'` o `'no_disponible'`).
  - `items`: array con `{ varianteId, stockDisponible, cantidadAjustada, precioVigente, estado: 'disponible' | 'reajustado' | 'agotado' | 'no_disponible' }`.
  - `avisos`: array de `AvisoReajuste` informando de variaciones de stock, precio o disponibilidad.

### Razones
- Respeto estricto del alcance: sin temporizadores en cesta, verificación bajo demanda en los 3 puntos clave exigidos por la spec.
- Consistencia con el servicio de inventario y reservas de `003-pago-tarjeta` y la administración de catálogo de `006`.

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
     - Obtener `stockDisponible = store.getAvailableStock(localItem.varianteId)`.
     - Si la pieza está archivada o no existe en inventario:
       - Registrar línea con estado `'no_disponible'`, cantidad 0 y registrar advertencia `{ tipo: 'producto_no_disponible' }`.
     - Si `stockDisponible <= 0`:
       - Registrar línea con estado `'agotado'`, cantidad 0 y registrar advertencia `{ tipo: 'stock_agotado' }`.
     - Si existe en `remotoItems`:
       - `suma = remotoItem.cantidad + localItem.cantidad`.
       - Si `suma <= stockDisponible`: `cantidadFinal = suma`.
       - Si `suma > stockDisponible`: `cantidadFinal = stockDisponible`, registrar advertencia `{ tipo: 'stock_reajustado', cantidadPrevia: suma, cantidadNueva: stockDisponible }`.
     - Si no existe en `remotoItems`:
       - `cantidadFinal = min(localItem.cantidad, stockDisponible)`.
       - Si `localItem.cantidad > stockDisponible`, registrar advertencia `{ tipo: 'stock_reajustado', cantidadPrevia: localItem.cantidad, cantidadNueva: stockDisponible }`.
  3. Guardar el nuevo carrito unificado en la cuenta del usuario (`store.carts.set(usuarioId, carrito)`).
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
     - Si el valor es `0`: invocar la eliminación inmediata de la línea (FR-004).
     - Si el valor está vacío, `parseado <= 0`, es decimal, negativo o `isNaN`: restaurar el último valor entero válido (la entrada vacía no elimina la línea).
     - Si `parseado > stockDisponible`: rechazar la entrada, restaurar el último valor válido (que nunca supera el stock) y mostrar alerta en línea `Cantidad máxima disponible alcanzada (N unidad(es))`.
- **Backend**: En los endpoints de modificación de cantidad (`PUT /api/carrito/items/:varianteId`):
  - Validar con `Number.isInteger(cantidad) && cantidad >= 0`.
  - Si `cantidad === 0`, eliminar la línea.
  - Si `cantidad > stockDisponible`, responder `409 Conflict` con detalle del stock disponible.

---

## 5. Visualización y Reglas Monetarias (Principio II)

### Decisión
- Utilizar `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` para todas las representaciones de subtotales, totales y gastos de envío.
- La estimación de gastos de envío estándar se fija en `0,00 €` (envío gratuito en v1, FR-005).
- Todos los cálculos internos operan con números de coma flotante redondeados a 2 decimales (`Math.round(val * 100) / 100`).

---

## 6. Integración y Flujo hacia Checkout / Vaciado de Cesta (FR-003, 003-pago-tarjeta)

### Contexto y Requisitos
- FR-003 exige que el carrito persista hasta que el comprador "formalice la compra".
- La pasarela de pago y checkout es gestionada por `003-pago-tarjeta` en `/checkout` (`checkout.html`).

### Decisión
1. **Traspaso a Checkout**:
   - Al pulsar "Tramitar pedido" en `cart-view.js`, se valida el stock (`POST /api/carrito/validar-stock`). Si el resultado es válido, se redirige al comprador a `/checkout`.
   - `checkout.html` inicializa la sesión de cobro llamando a `PaymentApiService.iniciarPago` con los artículos leídos de `LocalStorage` (`tienda_online_cart_v1`) o mediante la API de carrito si el usuario está autenticado.
2. **Vaciado tras Confirmación de Compra**:
   - Tras confirmarse el pago de forma autorizada (`finalizarConExito` en `checkout.html`), se invoca `cartStorage.clearCart()`, el cual elimina la clave `tienda_online_cart_v1` del `LocalStorage` y, si hay sesión autenticada, envía `DELETE /api/carrito` al backend.
   - De este modo, al volver a la tienda o abrir la cesta tras una compra completada, el carrito se encuentra en su estado *Zero-state* ("Tu cesta está vacía").
