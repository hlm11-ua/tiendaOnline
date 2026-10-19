# Feature Specification: 002 - Carrito de Compras Persistente con Control de Stock

**Feature Branch**: `002-carrito-persistente`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero guardar en mi carrito $n$ productos y que el carrito persista si abandono la sesión y vuelvo más tarde, sin que supere la cantidad real que hay del mismo en el stock."

**Responsable asignado**: Desarrollador 2 (Equipo: Persona 2 de 4)

## Clarifications

### Session 2026-10-19
- Q: ¿Cómo debe resolverse el carrito cuando un usuario anónimo con productos en su cesta inicia sesión en una cuenta que ya contenía un carrito guardado previamente? → A: Fusionar ambos carritos sumando cantidades de artículos coincidentes (respetando el límite de stock real) y añadiendo los artículos distintos.
- Q: ¿En qué momentos debe el sistema comprobar el stock en tiempo real para reajustar cantidades o marcar productos como agotados por compras concurrentes? → A: Validar al abrir/cargar la vista del carrito, al modificar cualquier cantidad y al pulsar "Tramitar pedido".
- Q: ¿Qué funcionalidades quedan explícitamente fuera del alcance (Out of Scope) para la versión inicial (v1) del carrito de compras? → A: Quedan fuera de alcance cupones/códigos de descuento, reservas temporales de stock con temporizador y listas de deseos; se incluye la estimación previa de gastos de envío en la cesta.
- Q: ¿Cuánto tiempo deben conservarse los datos del carrito de un visitante anónimo en el almacenamiento local del navegador antes de caducar? → A: Persistencia indefinida en LocalStorage hasta que el usuario vacíe la cesta, formalice la compra o borre los datos del navegador.
- Q: ¿Cómo debe comportarse la cesta si un producto guardado en el carrito es despublicado o eliminado del catálogo por el artesano antes de tramitar la compra? → A: Marcar el artículo como "No disponible", excluirlo del importe total y bloquear la tramitación hasta que el comprador lo retire.
- Q: ¿Qué tarifa o regla de cálculo debe aplicarse para la estimación previa de gastos de envío estándar en el carrito? → A: Envío gratuito estándar estimado (0,00 €) en la cesta para todos los pedidos en la versión v1.
- Q: ¿Cómo debe actuar el sistema si el artesano modifica el precio unitario de un producto en el catálogo mientras este ya se encuentra guardado en el carrito? → A: Actualizar automáticamente al precio vigente de catálogo al cargar la cesta o pulsar "Tramitar pedido", recalculando subtotales y avisando al usuario mediante notificación si varía el importe.
- Q: ¿Cómo debe representarse el estado de carrito vacío ("zero-state") en la interfaz y qué acciones deben permitirse? → A: Mostrar un mensaje "Tu cesta está vacía", un botón o enlace para volver a explorar el catálogo de piezas y el botón "Tramitar pedido" completamente inhabilitado.
- Q: ¿Qué restricciones y validaciones debe aplicar el selector de cantidad ante entradas manuales no válidas (negativos, decimales o texto)? → A: Aceptar solo números enteros positivos entre 1 y el stock real disponible; si se introduce 0 se elimina el producto; cualquier carácter no numérico, decimal o valor negativo se descarta restaurando inmediatamente el último valor válido.
- Q: ¿Cómo debe comunicarse al usuario el ajuste cuando la fusión de carritos recorta la cantidad por superar el stock disponible? → A: Mostrar una notificación informativa destacada tras iniciar sesión detallando los productos cuyas unidades han sido reajustadas al stock máximo disponible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Carrito y Persistencia con Límite de Stock (Priority: P1)

Como comprador, quiero añadir $n$ unidades de productos o variantes a mi cesta de compra, ajustar las unidades deseadas o eliminarlas, y que dicho carrito se mantenga intacto si cierro la sesión o el navegador y vuelvo más tarde, con la garantía absoluta de que en ningún caso se me permitirá añadir o comprar más unidades de las existencias reales en stock.

**Why this priority**: Es la pieza clave de la conversión comercial. Perder los artículos de la cesta desincentiva la compra y vender por encima de existencias arruina la operativa del pequeño artesano.

**Independent Test**: Un usuario añade 2 unidades de un producto que tiene exactamente 2 unidades en inventario. Comprueba que el selector de cantidad no permite subir a 3 unidades. Cierra el navegador por completo, lo reabre al cabo de unos minutos y comprueba que la cesta mantiene los 2 artículos con sus subtotales en euros y el aviso de cantidad máxima alcanzada.

**Acceptance Scenarios**:
1. **Given** un producto con 4 unidades disponibles, **When** el usuario selecciona 3 unidades y pulsa "Añadir al carrito", **Then** la cesta se actualiza sumando las 3 unidades y muestra el importe total en euros correspondiente con el desglose de 0,00 € de gastos de envío estándar estimados.
2. **Given** un producto con 2 unidades en inventario, **When** el usuario intenta seleccionar 3 o más unidades, **Then** el sistema bloquea el incremento, fija la cantidad en 2 y muestra un aviso visual claro indicando el límite de existencias.
3. **Given** un usuario con artículos en su carrito, **When** cierra la pestaña o el navegador y regresa posteriormente, **Then** los artículos y cantidades previamente seleccionadas se recuperan íntegramente.
4. **Given** un usuario con 3 unidades en el carrito, **When** otro comprador adquiere 2 de esas unidades reduciendo el stock a 1, **Then** al volver a consultar la cesta, el sistema ajusta automáticamente la cantidad a 1 unidad disponible y notifica el reajuste al usuario.
5. **Given** un usuario anónimo con productos en su cesta local, **When** inicia sesión en su cuenta que ya tenía un carrito previo guardado, **Then** el sistema fusiona ambos carritos sumando las unidades de artículos coincidentes (sin exceder el stock disponible de cada uno) e incorporando los artículos no repetidos, y muestra una notificación informativa si alguna cantidad fue ajustada al límite de existencias.
6. **Given** un producto guardado en la cesta con un precio unitario de 20,00 €, **When** el artesano modifica el precio en catálogo a 25,00 € y el usuario abre el carrito o pulsa "Tramitar pedido", **Then** el sistema actualiza el precio a 25,00 €, recalcula el total y muestra una notificación informativa advirtiendo del cambio de importe.
7. **Given** un carrito sin artículos o tras vaciar todas sus líneas, **When** el usuario visualiza la cesta, **Then** el sistema muestra el mensaje "Tu cesta está vacía", proporciona un enlace para volver al catálogo de piezas y mantiene el botón "Tramitar pedido" inhabilitado con un total de 0,00 €.

### Edge Cases

- **Stock agotado mientras el artículo está en la cesta**: La verificación de existencias se ejecuta de forma síncrona al cargar/abrir la vista de la cesta, al alterar cualquier cantidad y al pulsar "Tramitar pedido". Si las existencias de un producto bajan a 0 antes de iniciar el pago, el artículo se marca visualmente como "Agotado" dentro del carrito, su importe se excluye del subtotal y del total global, y se bloquea el botón de tramitación hasta que el usuario retire dicho artículo.
- **Variación de precio en catálogo**: Al abrir la vista del carrito o pulsar "Tramitar pedido", el sistema comprueba los precios unitarios contra el catálogo vigente del artesano; si difieren, actualiza automáticamente el precio al vigente, recalcula subtotales y el total global en euros, y muestra un aviso visual informativo al comprador indicando la actualización del importe.
- **Carrito vacío ("Zero-state")**: Cuando la cesta contiene 0 artículos (tanto al inicio como tras eliminar todos los productos), el sistema muestra el mensaje visible "Tu cesta está vacía", ofrece un botón o enlace para explorar el catálogo y mantiene el botón "Tramitar pedido" estrictamente inhabilitado con importe total de 0,00 €.
- **Producto despublicado o eliminado del catálogo**: Si un producto o variante presente en la cesta es eliminado o despublicado por el artesano, el sistema lo marca visualmente como "No disponible", excluye su importe del cálculo total y bloquea el botón de tramitación hasta que el usuario lo retire del carrito.
- **Eliminación, vaciado y validación de cantidades**: El selector de cantidad restringe la entrada a números enteros positivos entre 1 y el stock disponible de la variante. Si el comprador indica 0 o pulsa el botón de eliminar, la línea se retira de la cesta de forma inmediata. Entradas no válidas (números negativos, decimales o caracteres no numéricos) son rechazadas de inmediato, restableciendo el último valor entero válido.
- **Artistas con producción limitada**: El cálculo del stock se realiza por cada variante específica de la pieza artesanal, no de forma genérica.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir añadir productos y variantes al carrito de compra indicando la cantidad deseada; ante una cesta vacía (0 artículos), DEBE presentar el mensaje informativo "Tu cesta está vacía", enlace al catálogo y el botón "Tramitar pedido" inhabilitado.
- **FR-002**: El sistema DEBE validar de forma obligatoria que la cantidad en el carrito para cada variante no supere nunca las unidades reales en stock.
- **FR-003**: El sistema DEBE persistir los datos del carrito de forma indefinida en el almacenamiento local del cliente (LocalStorage) para usuarios anónimos hasta que se formalice la compra, el usuario lo vacíe manualmente o limpie los datos del navegador, recuperándolos íntegramente al reiniciar el navegador.
- **FR-004**: El sistema DEBE permitir modificar cantidades o eliminar productos del carrito en cualquier momento, admitiendo únicamente números enteros positivos entre 1 y las existencias reales en stock (establecer 0 elimina el artículo; cualquier entrada decimal, negativa o no numérica se descarta restaurando el valor anterior).
- **FR-005**: El sistema DEBE calcular dinámicamente el subtotal por artículo y el total global del carrito en euros (€), mostrando un desglose informativo con la estimación previa de gastos de envío estándar fijada en 0,00 € (envío gratuito) para todos los pedidos en la versión v1; al abrir la vista de la cesta o pulsar "Tramitar pedido", DEBE sincronizar los precios unitarios con los precios vigentes en catálogo y advertir al comprador mediante aviso informativo si ha ocurrido alguna variación.
- **FR-006**: El sistema DEBE verificar el stock disponible al abrir la vista del carrito, al modificar cantidades y al pulsar "Tramitar pedido"; si el inventario disponible de un producto disminuye por compras concurrentes, DEBE reajustar automáticamente la cantidad al stock disponible y advertir al comprador mediante un aviso visual claro.
- **FR-007**: Al iniciar sesión un usuario con artículos en el carrito anónimo, el sistema DEBE fusionar dicho carrito con el existente en su cuenta, combinando artículos distintos y sumando cantidades coincidentes sin superar el límite de existencias en stock de cada variante; si alguna cantidad debe recortarse para respetar el stock máximo disponible, el sistema DEBE notificarlo de forma destacada al comprador tras el inicio de sesión.
- **FR-008**: Si un producto o variante presente en el carrito es eliminado o despublicado del catálogo, el sistema DEBE marcarlo como "No disponible", excluirlo del cálculo del total e impedir la tramitación del pedido hasta que el usuario lo elimine de la cesta.

### Out of Scope

- **Cupones y códigos de descuento**: Queda excluida cualquier funcionalidad de cupones, códigos promocionales o descuentos en la cesta en v1.
- **Reserva temporal de stock con cuenta atrás**: Quedan excluidos los temporizadores de bloqueo de stock en el carrito; las existencias reales se consultan en tiempo real y el inventario solo se descuenta de forma vinculante al confirmar el pago.
- **Listas de deseos ("Wishlist" / Guardar para más tarde)**: Queda excluida la posibilidad de posponer productos a listas secundarias ajenas al carrito principal.

### Key Entities

- **Carrito**: Contenedor de compra asociado a un visitante o usuario (identificador, fecha de actualización).
- **Línea de Carrito**: Elemento de la cesta (variante de producto, precio unitario en €, cantidad seleccionada).
- **Stock de Variante**: Unidades físicas reales disponibles para venta inmediata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los intentos de añadir más unidades de las disponibles en stock quedan bloqueados de forma inmediata.
- **SC-002**: La persistencia del carrito se mantiene en el 100% de los casos al reabrir el navegador en la misma máquina o sesión.
- **SC-003**: El cálculo del importe total en euros se actualiza en menos de 200 ms tras modificar una cantidad.

## Assumptions

- Para usuarios no registrados se utiliza almacenamiento local permanente (LocalStorage) del navegador sin expiración por tiempo; si el usuario inicia sesión posteriormente, el carrito local se fusiona con el carrito guardado en su cuenta sumando cantidades hasta el límite de existencias de cada producto.
- No se bloquea el stock de forma indefinida en la cesta; el inventario se descuenta formalmente al confirmar el pago.
