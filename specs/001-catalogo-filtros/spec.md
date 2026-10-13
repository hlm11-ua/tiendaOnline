# Feature Specification: 001 - Catálogo de Productos y Filtros con Sincronización en URL

**Feature Branch**: `001-catalogo-filtros`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como visitante quiero navegar por las distintas categorías y filtrar por precio, productor y disponibilidad en stock para encontrar fácilmente lo que busco, asegurando que los filtros se reflejen en la URL para su indexación en buscadores."

**Responsable asignado**: Desarrollador 1 (Equipo: Persona 1 de 4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exploración y Filtrado del Catálogo con Parámetros en URL (Priority: P1)

Como visitante de la tienda de artesanías, quiero explorar las categorías de productos y aplicar filtros combinados de precio mínimo/máximo en euros (€), artesano o productor, y disponibilidad en stock, observando cómo la URL se sincroniza con los filtros aplicados para poder guardar la búsqueda o compartirla con otros usuarios.

**Why this priority**: Es la puerta de entrada a la tienda y la base del descubrimiento de productos artesanales. Sin catálogo accesible y enlazable por URL, no existe visibilidad ni conversión.

**Independent Test**: Un usuario no registrado accede a `/catalogo`, selecciona la categoría "Cerámica", ajusta el precio máximo a 50 € y activa "Solo en stock". La lista de piezas se filtra en pantalla de forma reactiva, la URL pasa a contener `?categoria=ceramica&precioMax=50&enStock=true` y, al copiar esa URL y abrirla en una ventana de incógnito, se muestran idénticos resultados y filtros activados.

**Acceptance Scenarios**:
1. **Given** un visitante en la página de catálogo, **When** pulsa sobre una categoría (ej. "Textil"), **Then** se muestran únicamente los productos de esa categoría y la URL actualiza el parámetro correspondiente.
2. **Given** un visitante en el catálogo, **When** introduce un rango de precios en euros y selecciona un productor concreto, **Then** la lista filtra las coincidencias exactas y la URL refleja los parámetros de precio y artesano.
3. **Given** un visitante marcando la opción de disponibilidad en stock, **When** se activa el filtro, **Then** los artículos con stock cero se ocultan del listado y el estado se refleja en la URL.
4. **Given** un enlace con parámetros de filtros predefinidos, **When** cualquier persona accede mediante dicho enlace, **Then** la página se inicializa con los filtros aplicados y los productos correctos visibles.

### Edge Cases

- **Combinación de filtros sin resultados**: Si la combinación de filtros no arroja ningún producto, la interfaz muestra un mensaje claro en español ("No se han encontrado artesanías con los filtros seleccionados") y ofrece un botón visible para limpiar o restablecer los filtros.
- **Parámetros manipulados en la URL**: Si un usuario edita manualmente la URL introduciendo precios negativos o identificadores de productor inexistentes, el sistema ignora los valores inválidos, aplica los valores por defecto y no rompe la navegación.
- **Eliminación individual de filtros**: Al desmarcar un filtro específico, la URL elimina dicho parámetro sin perder los demás filtros activos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar el listado de categorías de productos artesanales disponibles en la tienda.
- **FR-002**: El sistema DEBE permitir filtrar productos por categoría, artesano/productor, rango de precio en euros (€) y disponibilidad en stock.
- **FR-003**: El sistema DEBE sincronizar en tiempo real el estado de los filtros con los parámetros de consulta de la URL (query params).
- **FR-004**: El sistema DEBE restaurar el estado de los filtros y el listado de productos correspondiente al cargar una URL que contenga parámetros de búsqueda.
- **FR-005**: El sistema DEBE permitir limpiar todos los filtros aplicados mediante una acción única accesible para el usuario.
- **FR-006**: Todos los precios DEBEN mostrarse en euros con dos decimales y el símbolo monetario oficial (`€`).
- **FR-007**: La interfaz DEBE estar redactada íntegramente en español de España (`es-ES`).

### Key Entities

- **Categoría**: Clasificación de artesanías (nombre, slug identificativo, descripción).
- **Productor / Artesano**: Pequeño productor creador de las piezas (nombre comercial/personal, localidad, descripción).
- **Producto**: Objeto artesanal (título, descripción, precio base en €, imágenes, stock total, categoría y artesano asociados).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante encuentra un producto específico usando los filtros en menos de 30 segundos.
- **SC-002**: El 100% de las combinaciones de filtros válidas se reflejan en la URL y son compartibles con terceros.
- **SC-003**: Al abrir una URL con filtros en un navegador limpio, la página tarda menos de 1,5 segundos en renderizar los productos filtrados.
- **SC-004**: El 100% de los textos e importes están en español de España y en euros.

## Assumptions

- Los filtros se resuelven de forma accesible sin requerir autenticación de usuario.
- Para la versión 1 no se incluye búsqueda predictiva por texto libre, ciñéndose estrictamente a categorías y filtros especificados en el enunciado.
