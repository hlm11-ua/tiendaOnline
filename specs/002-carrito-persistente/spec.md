# Feature Specification: 002 - Carrito de Compras Persistente con Control de Stock

**Feature Branch**: `002-carrito-persistente`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como usuario quiero guardar en mi carrito $n$ productos y que el carrito persista si abandono la sesión y vuelvo más tarde, sin que supere la cantidad real que hay del mismo en el stock."

**Responsable asignado**: Desarrollador 2 (Equipo: Persona 2 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Carrito y Persistencia con Límite de Stock (Priority: P1)

Como comprador, quiero añadir $n$ unidades de productos o variantes a mi cesta de compra, ajustar las unidades deseadas o eliminarlas, y que dicho carrito se mantenga intacto si cierro la sesión o el navegador y vuelvo más tarde, con la garantía absoluta de que en ningún caso se me permitirá añadir o comprar más unidades de las existencias reales en stock.

**Why this priority**: Es la pieza clave de la conversión comercial. Perder los artículos de la cesta desincentiva la compra y vender por encima de existencias arruina la operativa del pequeño artesano.

**Independent Test**: Un usuario añade 2 unidades de un producto que tiene exactamente 2 unidades en inventario. Comprueba que el selector de cantidad no permite subir a 3 unidades. Cierra el navegador por completo, lo reabre al cabo de unos minutos y comprueba que la cesta mantiene los 2 artículos con sus subtotales en euros y el aviso de cantidad máxima alcanzada.

**Acceptance Scenarios**:
1. **Given** un producto con 4 unidades disponibles, **When** el usuario selecciona 3 unidades y pulsa "Añadir al carrito", **Then** la cesta se actualiza sumando las 3 unidades y muestra el importe total en euros correspondiente.
2. **Given** un producto con 2 unidades en inventario, **When** el usuario intenta seleccionar 3 o más unidades, **Then** el sistema bloquea el incremento, fija la cantidad en 2 y muestra un aviso visual claro indicando el límite de existencias.
3. **Given** un usuario con artículos en su carrito, **When** cierra la pestaña o el navegador y regresa posteriormente, **Then** los artículos y cantidades previamente seleccionadas se recuperan íntegramente.
4. **Given** un usuario con 3 unidades en el carrito, **When** otro comprador adquiere 2 de esas unidades reduciendo el stock a 1, **Then** al volver a consultar la cesta, el sistema ajusta automáticamente la cantidad a 1 unidad disponible y notifica el reajuste al usuario.

### Edge Cases

- **Stock agotado mientras el artículo está en la cesta**: Si las existencias de un producto bajan a 0 antes de iniciar el pago, el artículo se marca como "Agotado" dentro del carrito, su importe se excluye del total y se deshabilita la tramitación hasta retirar o sustituir dicho artículo.
- **Eliminación y vaciado**: El usuario puede modificar a 0 o pulsar el botón de eliminar para quitar cualquier producto de la cesta de forma inmediata.
- **Artistas con producción limitada**: El cálculo del stock se realiza por cada variante específica de la pieza artesanal, no de forma genérica.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir añadir productos y variantes al carrito de compra indicando la cantidad deseada.
- **FR-002**: El sistema DEBE validar de forma obligatoria que la cantidad en el carrito para cada variante no supere nunca las unidades reales en stock.
- **FR-003**: El sistema DEBE persistir los datos del carrito en el cliente o sesión del usuario para recuperarlos al reiniciar el navegador.
- **FR-004**: El sistema DEBE permitir modificar cantidades o eliminar productos del carrito en cualquier momento.
- **FR-005**: El sistema DEBE calcular dinámicamente el subtotal por artículo y el total global del carrito en euros (€).
- **FR-006**: Si el inventario disponible de un producto en el carrito disminuye por compras concurrentes, el sistema DEBE reajustar la cantidad y advertir al comprador.

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

- Para usuarios no registrados se utiliza almacenamiento de sesión/local del navegador; si el usuario inicia sesión posteriormente, el carrito local se asocia a su cuenta.
- No se bloquea el stock de forma indefinida en la cesta; el inventario se descuenta formalmente al confirmar el pago.
