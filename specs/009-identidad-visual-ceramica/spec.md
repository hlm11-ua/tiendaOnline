# Feature Specification: 009 - Identidad Visual Unificada de Tienda de Cerámica

**Feature Branch**: `009-identidad-visual-ceramica`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Unificar la identidad visual de todas las páginas de la tienda (catálogo, cesta, pago, mi cuenta, logística/seguimiento, administración de catálogo e informes de ventas) con una cabecera y navegación común y una paleta de colores tierra (terracota, arcilla, crema, verde oliva) que transmita calidez y resulte reconfortante, acorde a una tienda de cerámica artesanal"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegación común en todas las páginas (Priority: P1)

Como visitante o cliente de la tienda, quiero encontrar la misma cabecera y el mismo menú de navegación en todas las páginas, para moverme entre el catálogo, la cesta, el seguimiento de envíos y mi cuenta sin perderme y con la sensación de estar siempre en la misma tienda.

**Why this priority**: Hoy cada parte de la tienda tiene una cabecera distinta (marca, iconos, enlaces y estilos diferentes), y algunas páginas (cesta, pago) no permiten volver al resto de secciones salvo al catálogo. Una navegación coherente es la base de la unificación y aporta valor aunque no se cambie ningún color.

**Independent Test**: Abrir sucesivamente el catálogo, la cesta, el pago, Mi Cuenta y la página de envíos/seguimiento; comprobar que en todas aparece la misma cabecera con el mismo nombre de tienda y los mismos enlaces, que el enlace de la página actual aparece resaltado y que desde cualquiera de ellas se llega a cualquier otra con un solo clic.

**Acceptance Scenarios**:

1. **Given** un visitante en cualquier página pública de la tienda, **When** observa la parte superior de la pantalla, **Then** ve la misma cabecera con el nombre de la tienda y los enlaces "Catálogo", "Cesta", "Envíos" y "Mi Cuenta", en el mismo orden y con el mismo aspecto.
2. **Given** un visitante en una página concreta, **When** mira el menú, **Then** el enlace correspondiente a la página en la que está aparece resaltado respecto al resto.
3. **Given** un visitante en la página de pago o en la cesta, **When** pulsa cualquier enlace de la cabecera, **Then** llega a la sección elegida sin pasar por páginas intermedias.
4. **Given** un usuario con rol de administrador, **When** visita cualquier página, **Then** además de los enlaces públicos ve el enlace "Administración"; **And** un usuario sin ese rol no lo ve.
5. **Given** un visitante pulsa el nombre de la tienda en la cabecera, **When** se completa la navegación, **Then** llega al catálogo (página de inicio).

---

### User Story 2 - Paleta cálida de colores tierra (Priority: P1)

Como cliente de una tienda de cerámica artesanal, quiero que la tienda tenga colores cálidos y naturales (terracota, arcilla, crema, verde oliva) en lugar del aspecto oscuro y tecnológico actual, para sentir que estoy en un taller acogedor y que el ambiente es coherente con las piezas que compro.

**Why this priority**: Es la petición central de la funcionalidad: la sensación reconfortante y la coherencia con el producto artesanal. Puede probarse de forma independiente de la cabecera.

**Independent Test**: Recorrer todas las páginas y verificar que el fondo es claro en tono crema, que los botones y elementos destacados usan terracota, que no queda ningún fondo oscuro azulado ni acentos en violeta/índigo, y que todos los textos se leen con comodidad.

**Acceptance Scenarios**:

1. **Given** cualquier página de la tienda, **When** se carga, **Then** el fondo general es de tono crema claro y las tarjetas o paneles se distinguen del fondo con un tono arcilla/arena suave.
2. **Given** un botón de acción principal (por ejemplo "Añadir a la cesta", "Pagar", "Despachar"), **When** se muestra, **Then** usa el color terracota y cambia a un tono más oscuro al pasar el ratón o al recibir el foco.
3. **Given** un mensaje o indicador de estado, **When** se muestra, **Then** los éxitos y la disponibilidad usan verde oliva, los avisos usan ocre/mostaza y los errores o productos agotados usan rojo ladrillo, de forma que cada tipo sigue siendo distinguible.
4. **Given** cualquier texto de la tienda sobre su fondo, **When** un evaluador lo lee, **Then** se lee con claridad, sin textos claros sobre fondos claros ni textos oscuros sobre fondos oscuros.
5. **Given** las ventanas emergentes (reseñas, despacho, autenticación 3D Secure, avisos de envío), **When** se abren, **Then** usan la misma paleta cálida que la página que las contiene.

---

### User Story 3 - Coherencia visual de componentes en todas las secciones (Priority: P2)

Como cliente o como gestor de la tienda, quiero que botones, formularios, tablas, tarjetas, etiquetas de estado y mensajes tengan el mismo aspecto en todas las secciones, para que la tienda se perciba como un único producto cuidado y no como piezas sueltas.

**Why this priority**: Completa la unificación una vez que existen la navegación común y la paleta. Mejora la percepción de calidad pero depende de las dos historias anteriores.

**Independent Test**: Comparar un botón principal, un campo de formulario, una tabla y una etiqueta de estado en tres secciones distintas (por ejemplo, pago, Mi Cuenta y administración del catálogo) y comprobar que comparten forma, tipografía, colores y espaciado.

**Acceptance Scenarios**:

1. **Given** un botón principal en dos páginas distintas, **When** se comparan, **Then** tienen la misma forma, tamaño de letra, color y estilo al pasar el ratón.
2. **Given** los campos de formulario de la cesta, el pago, Mi Cuenta y la administración, **When** se comparan, **Then** comparten borde, fondo, tipografía y estilo de foco.
3. **Given** las etiquetas de estado de pedido ("pagado", "en preparación", "salido de la tienda", "entregado") en Mi Cuenta y en la página de envíos, **When** se comparan, **Then** cada estado usa el mismo color en ambas páginas.
4. **Given** las páginas de administración (catálogo e inventario, informes de ventas), **When** se visitan, **Then** usan la misma cabecera y paleta que la tienda pública, distinguiéndose únicamente por su contenido y por el resaltado de "Administración" en el menú.

---

### Edge Cases

- **Pantallas pequeñas (móvil)**: en anchos de pantalla de teléfono la cabecera común debe seguir mostrando todos los enlaces accesibles (por ejemplo, adaptándose en varias líneas o en un menú desplegable) sin provocar desplazamiento horizontal de la página.
- **Página de redirección de seguimiento**: la antigua dirección de seguimiento sigue redirigiendo a la sección de envíos; no necesita cabecera propia.
- **Usuario sin rol de administrador que accede a una página de administración**: se mantiene el comportamiento actual de bloqueo de acceso; el mensaje de bloqueo se muestra con la nueva paleta.
- **Gráficos e indicadores del informe de ventas**: los colores de gráficos y métricas deben adaptarse a la paleta tierra manteniéndose distinguibles entre sí.
- **Fuente tipográfica no disponible** (sin conexión a internet): la tienda debe seguir siendo legible con una tipografía alternativa del sistema.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todas las páginas de la tienda (catálogo, cesta, pago, Mi Cuenta, envíos/seguimiento, administración del catálogo e informes de ventas) DEBEN mostrar una única cabecera común con el mismo nombre de tienda, el mismo distintivo visual y los mismos enlaces de navegación en el mismo orden.
- **FR-002**: La cabecera común DEBE incluir los enlaces "Catálogo", "Cesta", "Envíos" y "Mi Cuenta" para todos los usuarios, y el enlace "Administración" únicamente para usuarios con rol de administrador.
- **FR-003**: La cabecera DEBE resaltar visualmente el enlace correspondiente a la sección en la que se encuentra el usuario.
- **FR-004**: Las páginas de administración DEBEN ofrecer, además de la cabecera común, acceso directo entre "Catálogo e Inventario", "Informes de Ventas" y la gestión logística.
- **FR-005**: Toda la tienda DEBE usar una única paleta de colores tierra compuesta como mínimo por: crema (fondo general), arcilla/arena (tarjetas y paneles), terracota (acciones principales y elementos destacados), marrón tostado (textos), verde oliva (éxito y disponibilidad), ocre (avisos) y rojo ladrillo (errores y agotado).
- **FR-006**: Ninguna página DEBE conservar los fondos oscuros azulados ni los acentos violeta/índigo actuales.
- **FR-007**: Todos los textos DEBEN tener contraste suficiente con su fondo para leerse con comodidad (nivel AA de las pautas de accesibilidad web: relación mínima 4,5:1 para texto normal y 3:1 para texto grande).
- **FR-008**: Botones, campos de formulario, tablas, tarjetas, etiquetas de estado, mensajes y ventanas emergentes DEBEN compartir el mismo estilo (forma, tipografía, colores, espaciado y estados de foco/ratón) en todas las páginas.
- **FR-009**: Cada estado de pedido DEBE representarse con el mismo color en todas las páginas donde aparezca.
- **FR-010**: La cabecera y el contenido DEBEN adaptarse a pantallas de móvil sin desplazamiento horizontal y manteniendo todos los enlaces accesibles.
- **FR-011**: El cambio DEBE ser exclusivamente visual y de navegación: no se añade, elimina ni modifica ninguna funcionalidad, flujo, dato, texto informativo ni precio existente.
- **FR-012**: Todos los textos nuevos o modificados de la cabecera y navegación DEBEN estar en español de España (`es-ES`).

### Key Entities

- **Paleta de colores tierra**: conjunto cerrado de colores con nombre y uso asignado (fondo, superficie, acento, texto, éxito, aviso, error) que comparten todas las páginas.
- **Cabecera común**: elemento de navegación presente en todas las páginas, con nombre de tienda, enlaces de sección, indicador de sección activa y enlace de administración condicionado al rol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las 7 páginas de la tienda muestran la misma cabecera y la misma paleta de colores.
- **SC-002**: Desde cualquier página pública se llega a cualquier otra sección pública con un solo clic.
- **SC-003**: El 100% de los textos revisados alcanzan una relación de contraste mínima de 4,5:1 (3:1 en texto grande).
- **SC-004**: Ninguna página contiene fondos oscuros azulados ni acentos violeta/índigo tras la revisión visual.
- **SC-005**: Todos los flujos existentes (comprar, pagar, consultar pedidos, despachar, administrar catálogo y consultar ventas) se completan igual que antes del cambio, sin errores nuevos.
- **SC-006**: Al menos 4 de cada 5 personas evaluadoras describen el aspecto de la tienda como "cálido", "acogedor" o "artesanal" al recorrerla.
- **SC-007**: En un ancho de pantalla de móvil (375 px) ninguna página presenta desplazamiento horizontal.

## Assumptions

- Se adopta un único tema claro en tonos tierra; no se incluye un selector de modo oscuro, siguiendo el Principio I (simplicidad).
- El nombre de la tienda se mantiene ("TiendaOnline") y el distintivo visual de la cabecera será el icono de vasija (🏺) que ya usan varias páginas; no se diseña un logotipo nuevo.
- No se añaden fotografías, ilustraciones ni contenidos nuevos; solo cambian colores, tipografía, cabecera y estilo de componentes.
- Los textos informativos propios de cada página (por ejemplo, el distintivo "Pasarela Bancaria Segura") se conservan, pero dentro del contenido de la página y no en la cabecera común.
- El control de acceso de las páginas de administración no cambia; solo cambia su aspecto.
- La tipografía puede cambiarse por una más cálida siempre que sea legible y tenga alternativa del sistema.
