# Feature Specification: 005 - Sistema de Valoraciones y Comentarios de Productos

**Feature Branch**: `feat/valoraciones`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "HU-05: Sistema de Valoraciones y Comentarios de Productos - Como usuario quiero dejar un único comentario y valoración de cada artículo que he comprado únicamente. Requisitos: 1. Verificación de Compra Previa, 2. Límite de Única Valoración, 3. Estructura de la Valoración (1 a 5 estrellas y texto obligatorio), 4. Visualización y Feedback (actualización de nota media, listado de reseñas y mensajes de confirmación/error)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Valoración y Reseña de Productos Comprados (Priority: P1)

Como comprador autenticado que ha adquirido previamente un producto (con pedido completado o entregado), quiero calificar dicho producto mediante una puntuación numérica de 1 a 5 estrellas y redactar un comentario de texto con mi opinión sobre el artículo, para compartir mi experiencia real con otros usuarios de la tienda.

**Why this priority**: Es la funcionalidad nuclear de la historia de usuario. Proporciona valor directo al permitir a los compradores legítimos calificar su compra y aportar opiniones verídicas al catálogo.

**Independent Test**: Un usuario autenticado con un pedido completado que contiene el producto "Cuenco de Barro" accede a su ficha técnica, visualiza el formulario habilitado, selecciona 5 estrellas, redacta un comentario descriptivo y presiona "Publicar valoración". El sistema procesa la solicitud, muestra un mensaje de confirmación de éxito y la nueva reseña aparece publicada de forma inmediata en la ficha del producto.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado que ha adquirido el producto en un pedido completado o entregado, **When** accede a la ficha del producto, **Then** el formulario de valoración está visible y habilitado con selector de 1 a 5 estrellas, área de texto y botón de envío.
2. **Given** un comprador verificado completando el formulario, **When** selecciona una puntuación de 1 a 5 estrellas y redacta un comentario válido y pulsa "Publicar valoración", **Then** el comentario se publica inmediatamente, se asocia al producto con el nombre del usuario y la fecha actual, y se muestra un mensaje de confirmación ("¡Gracias por tu valoración! Tu reseña ha sido publicada con éxito.").
3. **Given** un comprador verificado en el formulario, **When** intenta enviar la valoración sin seleccionar estrellas o con el campo de comentario vacío, **Then** el sistema detiene el envío y muestra un mensaje de validación indicando los campos obligatorios.

---

### User Story 2 - Límite Estricto de Única Valoración por Producto (Priority: P1)

Como comprador que ya ha publicado una valoración sobre un producto adquirido, quiero que el sistema reconozca mi opinión previa y bloquee el envío de reseñas duplicadas, para preservar la autenticidad y representatividad de las puntuaciones en la plataforma.

**Why this priority**: Evita la manipulación de valoraciones, duplicidad de registros y distorsión de la nota media, garantizando una regla de negocio clave especificada en los requisitos ("un único comentario y valoración").

**Independent Test**: El usuario que ya publicó su reseña sobre el producto "Cuenco de Barro" vuelve a visitar la ficha del producto o intenta enviar una segunda reseña. Comprueba que el formulario de nueva reseña ya no está disponible, visualizándose en su lugar un mensaje informativo indicando que ya ha valorado este producto y mostrando su valoración previamente enviada.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado que ya ha publicado una valoración para el producto actual, **When** visita la ficha de dicho producto, **Then** el formulario de creación de reseñas no se muestra (o se muestra deshabilitado) y se presenta el mensaje informativo: "Ya has valorado este producto".
2. **Given** un usuario que intenta forzar el reenvío de una valoración para un producto ya valorado, **When** se procesa la solicitud, **Then** el sistema deniega la acción, no crea registros duplicados y presenta un mensaje de advertencia o error.

---

### User Story 3 - Restricción de Valoraciones para Usuarios Sin Compra Previa (Priority: P2)

Como visitante o usuario autenticado que no ha comprado el artículo (o cuyo pedido aún no está en estado completado/entregado), quiero que la interfaz me indique claramente por qué no puedo valorar el producto, para entender las normas de confianza de la tienda.

**Why this priority**: Protege la integridad del catálogo contra reseñas ficticias o no verificadas, asegurando transparencia tanto para clientes como para artesanos.

**Independent Test**: Un visitante no autenticado o un usuario registrado que nunca ha comprado el producto accede a la ficha del mismo. Verifica que el formulario de envío no está accesible y que aparece un aviso informativo indicando que solo los compradores verificados con pedidos entregados pueden valorar el producto.

**Acceptance Scenarios**:

1. **Given** un visitante anónimo (no autenticado), **When** visualiza la ficha del producto, **Then** el formulario de valoración permanece oculto y se visualiza un aviso informativo indicando: "Inicia sesión con tu cuenta para comprobar si puedes valorar este producto".
2. **Given** un usuario autenticado que no ha adquirido el producto (o cuya compra fue cancelada o está en estado pendiente de pago), **When** visualiza la ficha del producto, **Then** el formulario permanece oculto o deshabilitado con el mensaje informativo: "Solo los clientes que hayan comprado previamente este producto y recibido su pedido pueden valorarlo".
3. **Given** un usuario que intenta eludir la validación enviando una petición de valoración sin haber adquirido el producto, **When** el sistema valida la autorización, **Then** la operación es rechazada con un mensaje de error ("No tienes autorización para valorar este producto ya que no dispones de una compra verificada").

---

### User Story 4 - Visualización Pública de Reseñas y Recálculo de Nota Media (Priority: P2)

Como cualquier usuario que consulta un producto en el catálogo, quiero ver la nota media acumulada (puntuación promedio en estrellas) y el desglose de todas las reseñas verificadas publicadas, para tener referencias fiables sobre la calidad del artículo antes de comprarlo.

**Why this priority**: Cierra el ciclo de feedback del cliente proporcionando información visual inmediata sobre la satisfacción de otros compradores en la ficha del producto.

**Independent Test**: Se añade una nueva reseña de 5 estrellas a un producto que previamente tenía una reseña de 3 estrellas. Se verifica que la nota media cambia instantáneamente a 4,0 estrellas sobre 5, incrementa el total de reseñas de 1 a 2, y la nueva reseña aparece en la parte superior del listado de opiniones.

**Acceptance Scenarios**:

1. **Given** un producto con una o más valoraciones de clientes, **When** cualquier usuario visita su ficha, **Then** se visualiza la nota media calculada (ej. "4,5 de 5 estrellas"), el número total de opiniones y la lista detallada de comentarios con fecha, nombre del autor y estrellas.
2. **Given** un producto nuevo sin valoraciones previas, **When** un usuario visita su ficha, **Then** se muestra un estado informativo claro: "Este producto aún no cuenta con valoraciones. ¡Sé el primero en opinar tras comprarlo!".
3. **Given** un comprador verificado que acaba de publicar con éxito una valoración, **When** finaliza la publicación, **Then** la nota media del producto y el listado de reseñas se recalculan y reflejan inmediatamente la nueva puntuación sin inconsistencias.

---

### Edge Cases

- **Múltiples pedidos del mismo producto**: Si un comprador adquiere el mismo artículo en varios pedidos distintos en fechas diferentes, la regla de "un único comentario por artículo" prevalece: el usuario solo puede tener una valoración activa por producto.
- **Compra de varias unidades en una misma compra**: Comprar 3 o más unidades de un mismo artículo en un único pedido solo da derecho a una (1) única valoración.
- **Pedidos cancelados o reembolsados**: Los pedidos en estado "cancelado", "pendiente de pago" o "reembolsado" no otorgan la condición de comprador verificado. Solo los pedidos en estado "completado" o "entregado" habilitan la valoración.
- **Puntuación fuera de rango**: Si se intenta enviar una puntuación inferior a 1 o superior a 5 estrellas, el sistema la rechaza inmediatamente.
- **Comentario en blanco o con solo espacios en blanco**: El texto de la opinión es obligatorio; si el usuario introduce únicamente espacios en blanco o saltos de línea, el sistema rechaza el envío exigiendo contenido real.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE verificar si el usuario autenticado cuenta con al menos un pedido en estado "completado" o "entregado" que incluya el producto específico que se desea valorar.
- **FR-002**: El sistema DEBE restringir la publicación de valoraciones exclusivamente a usuarios autenticados que cumplan la condición de compra verificada previa (FR-001).
- **FR-003**: Si el usuario no ha iniciado sesión o no ha comprado previamente el producto, la interfaz DEBE ocultar el formulario de valoración o deshabilitarlo mostrando un aviso informativo claro.
- **FR-004**: El sistema DEBE permitir al comprador verificado seleccionar una puntuación numérica entera de 1 a 5 estrellas.
- **FR-005**: El sistema DEBE exigir como campo obligatorio un texto de comentario explicativo con contenido real (no vacío y sin limitarse a espacios en blanco).
- **FR-006**: El sistema DEBE validar de forma obligatoria tanto la puntuación de estrellas como el texto del comentario antes de procesar el envío de la valoración.
- **FR-007**: El sistema DEBE limitar la participación a un máximo de una (1) única valoración y comentario por usuario y producto.
- **FR-008**: Si un usuario ya ha valorado un artículo, el sistema DEBE impedir el envío de una nueva reseña para el mismo artículo, mostrando un aviso informativo de que ya fue valorado.
- **FR-009**: Tras el envío satisfactorio de una valoración, el sistema DEBE mostrar un mensaje visible de confirmación de éxito ("¡Gracias por tu valoración! Tu reseña ha sido publicada con éxito.").
- **FR-010**: Si ocurre un fallo o se intenta omitir la comprobación de compra previa, el sistema DEBE mostrar un mensaje de error comprensible en español indicando la causa del rechazo.
- **FR-011**: La ficha de producto DEBE mostrar la nota media de las valoraciones calculada sobre el total de opiniones verificadas, formateada con un decimal (ej. "4,2 / 5").
- **FR-012**: La ficha de producto DEBE mostrar el número total de valoraciones registradas.
- **FR-013**: La ficha de producto DEBE listar las valoraciones publicadas mostrando: nombre del usuario comprador, puntuación en estrellas, fecha de publicación y texto del comentario.
- **FR-014**: Si un producto no tiene reseñas registradas, la ficha DEBE mostrar un mensaje de estado vacío amigable informando que aún no existen opiniones.
- **FR-015**: Todos los mensajes informativos, textos de botones, alertas de error y validaciones DEBEN estar íntegramente redactados en español de España (`es-ES`).

### Key Entities

- **Valoración / Reseña (Review)**: Registro de opinión emitido por un usuario sobre un producto adquirido. Atributos clave: identificador unívoco, identificador del usuario comprador, identificador del producto, puntuación numérica (1 a 5), texto del comentario y marca temporal de creación. Relación: pertenencia única por par (usuario, producto).
- **Verificación de Compra (Purchase Verification)**: Consulta de relación entre el usuario y las líneas de pedido correspondientes a pedidos cerrados ("completado" o "entregado").
- **Resumen de Calificación del Producto (Rating Summary)**: Agregación calculada para cada producto que consolida la nota media obtenida y el recuento total de valoraciones activas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las valoraciones publicadas y visibles en la tienda corresponden a usuarios con compra verificada y pedido en estado completado o entregado.
- **SC-002**: 0% de valoraciones duplicadas: ningún usuario dispone de más de una reseña registrada para el mismo producto en la base de datos y en la interfaz.
- **SC-003**: El 100% de los envíos de valoración validan obligatoriamente la presencia de puntuación (1 a 5 estrellas) y comentario no vacío antes de guardarse.
- **SC-004**: Tras guardar una valoración, la nota media del producto y la lista de opiniones se actualizan de manera inmediata para los visitantes.
- **SC-005**: El 100% de los usuarios sin compra previa visualizan un aviso informativo explicativo en lugar del formulario operativo.
- **SC-006**: El 100% de los textos, avisos y mensajes del sistema de reseñas se presentan en español (`es-ES`).

## Assumptions

- Los estados de pedido que acreditan una compra verificada son "completado" o "entregado". Pedidos en estado "pendiente", "procesando" o "cancelado" no habilitan la opción de valoración.
- La publicación de la reseña en esta versión v1 es inmediata para compradores verificados, sin requerir un flujo de aprobación manual por administradores.
- No se contempla en el alcance de esta versión v1 la edición o eliminación posterior de la reseña por parte del cliente, ni la respuesta pública del artesano/vendedor (principio de simplicidad v1).
- El nombre del autor mostrado en la reseña pública corresponderá al nombre de usuario o nombre de pila registrado en la cuenta del cliente para preservar su privacidad.
