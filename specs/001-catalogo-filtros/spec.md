# Feature Specification: 001 - Catálogo de productos con filtros y sincronización de URL

**Feature Branch**: `001-catalogo-filtros`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "HU-01: Catálogo de productos con filtros y sincronización de URL - Como visitante quiero navegar por las distintas categorías y filtrar por precio, productor y disponibilidad en stock para encontrar fácilmente lo que busco, asegurando que los filtros se reflejen en la URL para su indexación en buscadores."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegación y Filtrado por Categorías (Priority: P1)

Como visitante de la tienda online, quiero explorar la lista de categorías disponibles y seleccionar una de ellas para ver exclusivamente los productos asociados, actualizándose la ruta de navegación en pantalla.

**Why this priority**: Es la vía fundamental para organizar y descubrir productos dentro de la tienda; sin categorías, la navegación básica por catálogo no es viable.

**Independent Test**: Un visitante no autenticado entra a la tienda, selecciona la categoría "Alimentación" o "Textil", y verifica que solo se muestran los productos pertenecientes a dicha categoría y que la ruta o selector refleja la categoría activa.

**Acceptance Scenarios**:

1. **Given** un visitante en la página principal del catálogo, **When** selecciona una categoría específica (ej. "Artesanía en Cerámica"), **Then** el catálogo muestra únicamente los productos adscritos a dicha categoría y la selección se destaca visualmente.
2. **Given** un visitante visualizando los productos de una categoría, **When** pulsa sobre otra categoría distinta o sobre "Todas las categorías", **Then** el catálogo actualiza de inmediato el listado de productos para reflejar la nueva selección.

---

### User Story 2 - Filtrado Combinado por Precio, Productor y Disponibilidad (Priority: P1)

Como visitante interesado en artículos concretos, quiero acotar los productos aplicando simultáneamente un rango de precio (mínimo y máximo en €), un productor o marca, y un indicador de disponibilidad en stock para encontrar con rapidez los productos que se ajustan a mi presupuesto y necesidades.

**Why this priority**: Permite al cliente refinar su búsqueda de forma multidimensional, facilitando la decisión de compra e impidiendo la frustración de ver productos agotados o fuera de presupuesto.

**Independent Test**: En el catálogo, el usuario define un precio mínimo de 10,00 € y máximo de 45,00 €, elige un productor específico y activa la casilla "Solo en stock"; la pantalla actualiza la lista mostrando únicamente los productos que cumplen todas las condiciones a la vez.

**Acceptance Scenarios**:

1. **Given** un visitante en el catálogo, **When** introduce un importe mínimo y/o un importe máximo en euros, **Then** solo se muestran los artículos cuyos precios se encuentren dentro de ese intervalo inclusive.
2. **Given** un visitante en el catálogo, **When** selecciona uno o varios productores/marcas disponibles, **Then** la lista filtra y muestra exclusivamente los artículos suministrados por los productores elegidos.
3. **Given** un visitante en el catálogo, **When** activa la opción de disponibilidad en stock ("Solo en stock"), **Then** se ocultan todos los productos con existencias en cero.
4. **Given** un visitante con filtros activos de categoría, precio y productor, **When** modifica o añade el filtro de disponibilidad en stock, **Then** el sistema aplica la conjunción de todos los criterios simultáneamente (filtro acumulativo / AND lógico).

---

### User Story 3 - Sincronización Bidireccional con la URL y Optimización SEO (Priority: P2)

Como visitante o rastreador web (SEO), quiero que cualquier combinación de filtros aplicada se refleje de manera inmediata en los parámetros de la URL, y que al acceder directamente mediante una URL que contenga dichos parámetros, la vista cargue con los filtros ya seleccionados y el listado de productos correspondiente.

**Why this priority**: Facilita la compartición de búsquedas precisas entre personas, permite guardar enlaces en marcadores y garantiza que los motores de búsqueda indexen páginas filtradas del catálogo.

**Independent Test**: Un usuario aplica una categoría, un rango de precios (ej. min 15, max 50), un productor y stock disponible; copia el enlace generado con los parámetros query (ej. `?categoria=ceramica&minPrecio=15&maxPrecio=50&productor=taller-artesano&enStock=true`), lo abre en una nueva pestaña o navegador limpio, y comprueba que los controles de filtro y los productos listados se inicializan con dichos valores exactos.

**Acceptance Scenarios**:

1. **Given** un visitante aplicando cualquier filtro (categoría, rango de precio, productor o stock), **When** el filtro cambia en la interfaz, **Then** los parámetros de consulta de la URL (query params) se actualizan en tiempo real sin requerir una recarga completa de la página.
2. **Given** un usuario que accede a la tienda mediante una URL con parámetros de consulta válidos, **When** carga la página, **Then** los campos de filtro visuales se preseleccionan con los valores indicados y la lista de productos se muestra filtrada de acuerdo con ellos.
3. **Given** un usuario con filtros activos en la URL, **When** desmarca o elimina un filtro individual (ej. borra el precio mínimo), **Then** el parámetro correspondiente desaparece de la URL preservando los restantes parámetros vigentes.

---

### User Story 4 - Estado Vacío y Restablecimiento Completo de Filtros (Priority: P3)

Como visitante que ha aplicado una combinación de filtros demasiado restrictiva, quiero ver un mensaje comprensible informándome de que no hay coincidencias y disponer de un botón visible para restablecer todos los filtros a sus valores predeterminados con un solo clic.

**Why this priority**: Evita bloqueos en la navegación y reduce el abandono del usuario al proporcionar un camino de recuperación claro y directo cuando no se localizan productos.

**Independent Test**: El usuario introduce un rango de precios en el que no existen productos (ej. de 1 000,00 € a 2 000,00 €); comprueba que aparece el aviso "No se han encontrado productos con los filtros seleccionados" junto a un botón "Restablecer filtros", y que al pulsar dicho botón se limpian los campos, la URL vuelve a su estado base y se listan nuevamente todos los productos.

**Acceptance Scenarios**:

1. **Given** una búsqueda con filtros combinados que no arroja ningún producto, **When** finaliza la evaluación del catálogo, **Then** la pantalla presenta un mensaje informativo en español claro y accesible ("No se han encontrado productos con los filtros seleccionados") y un botón destacado para limpiar los filtros.
2. **Given** un catálogo con uno o más filtros activos y reflejados en la URL, **When** el usuario pulsa el botón "Restablecer filtros" (o "Limpiar filtros"), **Then** todos los selectores, rangos e indicadores se resetean a su estado inicial, los parámetros query se eliminan de la URL y se muestra la totalidad de los productos.

### Edge Cases

- **Valores numéricos de precio no válidos o invertidos**: Si en los parámetros de la URL o en los campos de entrada se introduce un precio negativo o un precio mínimo superior al precio máximo (ej. `minPrecio=80&maxPrecio=20`), el sistema debe ajustar o ignorar la condición anómala sin provocar errores ni interrumpir la navegación, manteniendo la interfaz funcional.
- **Identificador de categoría o productor inexistente**: Si la URL contiene un nombre o código de categoría/productor inexistente o descatalogado, el sistema debe informar al usuario de que no hay resultados y permitirle limpiar los filtros o reorientar su navegación.
- **Páginas compartidas con parámetros desconocidos o adicionales**: Si la URL contiene parámetros de consulta ajenos a los filtros admitidos, el sistema debe preservarlos o ignorarlos de forma limpia sin corromper el filtrado legítimo.
- **Navegación por historial del navegador (Atrás / Adelante)**: Cuando el usuario pulsa los botones "Atrás" o "Adelante" del navegador, los controles de filtro y el catálogo deben sincronizarse con la URL histórica correspondiente sin desajustes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar un selector o listado de categorías que permita filtrar los productos visibles por la categoría seleccionada y actualizar la ruta/vista correspondiente.
- **FR-002**: El sistema DEBE permitir definir un rango de precios mediante valores de precio mínimo y precio máximo expresados en euros (`€`).
- **FR-003**: El sistema DEBE permitir filtrar productos por productor o marca mediante un selector con las opciones disponibles.
- **FR-004**: El sistema DEBE permitir alternar la opción de disponibilidad en stock para mostrar únicamente aquellos productos que dispongan de unidades disponibles (stock mayor que cero).
- **FR-005**: El sistema DEBE admitir la aplicación combinada y simultánea de múltiples filtros (categoría AND rango de precio AND productor AND disponibilidad en stock).
- **FR-006**: El sistema DEBE sincronizar en tiempo real el estado de los filtros con los parámetros de la URL (`query params`), reflejando de forma unívoca la búsqueda activa.
- **FR-007**: El sistema DEBE inicializar los controles de filtro y el listado de productos de acuerdo con los parámetros presentes en la URL cuando un visitante accede directamente a través de un enlace.
- **FR-008**: El sistema DEBE mostrar un mensaje claro y descriptivo cuando ninguna coincidencia cumpla los criterios de los filtros aplicados.
- **FR-009**: El sistema DEBE ofrecer un mecanismo único ("Restablecer filtros" / "Limpiar filtros") que elimine todos los filtros activos, limpie los parámetros de la URL y vuelva a mostrar el catálogo completo.
- **FR-010**: Todos los precios y cifras monetarias DEBEN formatearse en euros con dos decimales y el símbolo oficial (`€`) conforme al estándar de España (ej. `12,50 €`).
- **FR-011**: Todos los textos, etiquetas, mensajes informativos y controles de la interfaz DEBEN presentarse íntegramente en español de España (`es-ES`).

### Key Entities

- **Categoría**: Clasificación temática de los productos de la tienda (identificador/slug unívoco, nombre descriptivo y estado de activación).
- **Productor / Marca**: Entidad creadora o fabricante de los productos (identificador/slug, nombre comercial, procedencia).
- **Producto**: Artículo comercializable de la tienda (identificador, título descriptivo, categoría asociada, productor asociado, precio en euros, existencias en stock e imágenes).
- **Criterios de Filtro**: Conjunto de parámetros de selección activos en un instante dado (categoría seleccionada, precio mínimo, precio máximo, productor y solo disponibles en stock).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante que utiliza los filtros puede acotar el catálogo y localizar un producto deseado en menos de 20 segundos.
- **SC-002**: El 100% de las combinaciones válidas de filtros aplicadas desde la interfaz se sincronizan con los parámetros de la URL sin requerir recarga completa de página.
- **SC-003**: Al abrir una URL con parámetros de filtro en una ventana nueva o navegador limpio, la vista completa (controles y productos filtrados) se renderiza en menos de 1,5 segundos.
- **SC-004**: El 100% de los intentos de compartir enlaces con filtros preservan exactamente el mismo conjunto de resultados y controles para el destinatario.
- **SC-005**: El 100% de las interfaces, mensajes de error, mensajes de estado vacío y precios se muestran en español (`es-ES`) y en euros (`€`).

## Assumptions

- No se requiere inicio de sesión ni permisos especiales para explorar el catálogo, aplicar filtros o compartir URLs filtradas.
- La búsqueda libre por texto predictivo o autocompletado no forma parte del alcance de esta historia de usuario, ciñéndose estrictamente a categorías, rango de precio, productor/marca y disponibilidad en stock.
- Las categorías y productores disponibles en los selectores de filtro se corresponden con aquellos que cuentan con productos en el catálogo activo de la tienda.
