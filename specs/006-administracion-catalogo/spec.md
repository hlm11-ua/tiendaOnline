# Feature Specification: 006 - Administración de Productos y Alertas de Stock Bajo

**Feature Branch**: `006-administracion-catalogo`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa quiero poder administrar mis productos (fichas, imágenes, variantes y stock) y sus categorías, además de recibir un aviso de stock cuando esté a punto de agotarse para no vender sin existencias."

**Responsable asignado**: Desarrollador 4 (Equipo: Persona 4 de 4)

## Clarifications

### Session 2026-10-20

- Q: ¿Las variantes de un producto compartirán siempre el precio base del producto o podrán definir un precio específico por variante? (FR-004) → A: Todas las variantes comparten siempre el precio base del producto.
- Q: ¿El aviso de stock bajo debe ser exclusivamente visual dentro del panel de administración o debe incluir el envío de notificaciones externas (como correo electrónico)? (FR-006) → A: Exclusivamente visual en el panel de administración (distintivos y alertas destacadas en inventario); avisos externos fuera de alcance.
- Q: ¿Qué comportamiento debe tener el sistema si un administrador intenta archivar una categoría que tiene productos asociados actualmente? (FR-002) → A: Bloquear el archivado y mostrar un mensaje de error indicando que deben reasignarse o desvincularse los productos previamente.
- Q: ¿Debe todo producto contar obligatoriamente con al menos una variante para gestionar su stock o se admitirán productos simples sin variantes? (FR-004) → A: Todo producto requiere obligatoriamente al menos una variante (asignando por defecto una variante estándar/única si la pieza no tiene opciones).
- Q: ¿Cuáles deben ser los límites concretos para la subida de imágenes de un producto en cuanto a cantidad máxima y peso por archivo? (FR-003) → A: Máximo 5 imágenes por producto y hasta 5 MB por imagen (JPG, PNG, WebP).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión del Catálogo, Variantes y Alerta Temprana de Stock (Priority: P1)

Como responsable de la tienda artesanal, quiero acceder a un panel de administración para dar de alta y editar fichas de productos, asociarles categorías, subir sus imágenes, definir variantes (tallas, tonos o acabados) con sus cantidades disponibles, y visualizar una advertencia clara cuando las existencias bajen de un nivel de seguridad para evitar roturas de stock.

**Why this priority**: Es el motor operativo del negocio. Sin inventario actualizado y capacidad de publicar o modificar piezas artesanales, la tienda no puede funcionar.

**Independent Test**: El administrador accede al panel de control, crea un nuevo jarrón asignándole la categoría "Cerámica", sube dos fotos y crea 2 variantes ("Pequeño - 3 unidades" y "Grande - 1 unidad") fijando el umbral de alerta en 2 unidades. Comprueba que el jarrón se publica en la tienda pública y que en el panel administrativo la variante "Grande" aparece inmediatamente con un aviso de "Stock bajo (1 unidad restante)".

**Acceptance Scenarios**:
1. **Given** un administrador en el panel de catálogo, **When** crea un producto con título, descripción, precio en euros, categoría, fotos y variantes con inventario, **Then** el producto se almacena y se refleja al instante en el catálogo público.
2. **Given** un producto existente, **When** el administrador actualiza su información o añade nuevas imágenes y variantes, **Then** las modificaciones se guardan y son visibles en la tienda.
3. **Given** una variante cuyas existencias son iguales o inferiores a su umbral de aviso, **When** el administrador consulta el inventario en el panel, **Then** el sistema resalta visualmente la variante con un distintivo de advertencia de stock bajo.
4. **Given** una variante que llega a 0 existencias, **When** se visualiza en la tienda pública, **Then** aparece marcada como "Agotada" sin permitir su compra.

### Edge Cases

- **Eliminación de producto con compras previas**: El sistema no elimina físicamente un producto si ya tiene pedidos asociados en el histórico, sino que lo desactiva o archiva para preservar la integridad de los pedidos pasados.
- **Intento de archivar categoría con productos asociados**: Si una categoría contiene productos asignados, la acción de archivar se bloquea y se muestra un mensaje informativo requiriendo reasignar o desvincular dichos productos antes de proceder.
- **Creación de producto sin opciones diferenciadas**: Si el artesano no define tallas, colores o acabados, el sistema crea automáticamente una variante estándar denominada "Única" para albergar el stock y umbral de alerta del producto.
- **Formato y tamaño de imágenes**: La subida de imágenes admite formatos JPG, PNG y WebP, con un límite máximo de 5 imágenes por producto y un tamaño máximo de 5 MB por archivo.
- **Umbral de aviso por defecto**: Si el administrador no especifica un umbral particular al crear el producto, el sistema asigna automáticamente un valor de 3 unidades.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un panel administrativo accesible únicamente por usuarios con rol de empresa/administrador.
- **FR-002**: El sistema DEBE permitir crear, editar y archivar categorías de productos artesanales; se debe impedir el archivado de cualquier categoría que contenga productos asociados activos, solicitando su reasignación previa.
- **FR-003**: El sistema DEBE permitir crear y editar productos con título, descripción, categoría, artesano, precio base en euros (€) e imágenes (hasta un máximo de 5 imágenes de 5 MB c/u en JPG/PNG/WebP).
- **FR-004**: El sistema DEBE exigir al menos una variante por producto (asignando por defecto una variante "Única" si la pieza no dispone de opciones diferenciadas) con nombre y cantidad de stock independiente; todas las variantes comparten obligatoriamente el precio base definido en el producto.
- **FR-005**: El sistema DEBE permitir fijar un umbral numérico de aviso de stock bajo para cada variante o producto.
- **FR-006**: El sistema DEBE generar una alerta visual destacada (distintivo o aviso en la lista de inventario) en el panel de administración cuando el stock de cualquier variante sea menor o igual al umbral fijado; las notificaciones externas (correo electrónico, SMS) quedan explícitamente fuera de alcance.
- **FR-007**: El sistema DEBE sincronizar el stock del panel en tiempo real con las ventas efectuadas en la tienda.

### Key Entities

- **Ficha de Producto**: Información descriptiva general y categorización (asociada a 1..N variantes).
- **Variante**: Opción física del producto (tamaño, color, material o variante por defecto "Única") con stock específico, vinculada al precio base del producto sin precio independiente.
- **Imagen**: Recurso visual asociado a la pieza artesanal (formatos JPG, PNG, WebP; máx. 5 imágenes y 5 MB por archivo).
- **Alerta de Stock**: Estado de advertencia generado cuando `stock_actual <= umbral_alerta`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La publicación de un nuevo producto con fotos y variantes se completa en menos de 2 minutos.
- **SC-002**: El 100% de las variantes con stock en o bajo el umbral muestran la advertencia visible en el panel.
- **SC-003**: Al confirmarse una venta, el inventario reflejado en el panel de administración se descuenta de forma instantánea.

## Assumptions

- Solo los usuarios administradores autorizados tienen acceso a las operaciones de creación y edición del catálogo.
- Las notificaciones por correo electrónico, SMS u otros canales externos para alertas de stock quedan fuera del alcance de la v1 (sistema exclusivamente visual en panel).