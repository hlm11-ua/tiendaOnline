# Feature Specification: 006 - Administración de Productos y Alertas de Stock Bajo

**Feature Branch**: `006-administracion-catalogo`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa quiero poder administrar mis productos (fichas, imágenes, variantes y stock) y sus categorías, además de recibir un aviso de stock cuando esté a punto de agotarse para no vender sin existencias."

**Responsable asignado**: Desarrollador 4 (Equipo: Persona 4 de 4)

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
- **Formato y tamaño de imágenes**: La subida de imágenes admite formatos habituales (JPG, PNG, WebP) con validación previa de tamaño para asegurar una carga ágil de la tienda.
- **Umbral de aviso por defecto**: Si el administrador no especifica un umbral particular al crear el producto, el sistema asigna automáticamente un valor de 3 unidades.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un panel administrativo accesible únicamente por usuarios con rol de empresa/administrador.
- **FR-002**: El sistema DEBE permitir crear, editar y archivar categorías de productos artesanales.
- **FR-003**: El sistema DEBE permitir crear y editar productos con título, descripción, categoría, artesano, precio base en euros (€) e imágenes.
- **FR-004**: El sistema DEBE permitir definir variantes de producto con nombre y cantidad de stock independiente por variante.
- **FR-005**: El sistema DEBE permitir fijar un umbral numérico de aviso de stock bajo para cada variante o producto.
- **FR-006**: El sistema DEBE generar una alerta visual destacada en el panel de administración cuando el stock de cualquier variante sea menor o igual al umbral fijado.
- **FR-007**: El sistema DEBE sincronizar el stock del panel en tiempo real con las ventas efectuadas en la tienda.

### Key Entities

- **Ficha de Producto**: Información descriptiva general y categorización.
- **Variante**: Opción física del producto (tamaño, color, material) con stock específico.
- **Imagen**: Recurso visual asociado a la pieza artesanal.
- **Alerta de Stock**: Estado de advertencia generado cuando `stock_actual <= umbral_alerta`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La publicación de un nuevo producto con fotos y variantes se completa en menos de 2 minutos.
- **SC-002**: El 100% de las variantes con stock en o bajo el umbral muestran la advertencia visible en el panel.
- **SC-003**: Al confirmarse una venta, el inventario reflejado en el panel de administración se descuenta de forma instantánea.

## Assumptions

- Solo los usuarios administradores autorizados tienen acceso a las operaciones de creación y edición del catálogo.
