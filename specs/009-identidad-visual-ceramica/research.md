# Research: 009 - Identidad Visual Unificada de Tienda de Cerámica

Fase 0 del plan. No quedaban puntos "NEEDS CLARIFICATION" en el contexto técnico; este documento recoge las decisiones de diseño y su justificación.

---

## 1. Paleta de colores tierra y contraste

**Decision**: Tema claro con estos valores (los ratios se han calculado con la fórmula de luminancia relativa de las pautas WCAG 2.x):

| Token | Valor | Uso | Contraste sobre crema `#FAF5EE` | Contraste sobre arcilla `#F1E6D8` |
|-------|-------|-----|------|------|
| crema | `#FAF5EE` | Fondo general | — | — |
| arcilla | `#F1E6D8` | Tarjetas, paneles, cabecera de tablas | — | — |
| arena (borde) | `#DCC8AF` | Bordes y separadores (no texto) | — | — |
| texto | `#3B2A20` | Texto principal | 12,59 | 11,09 |
| texto suave | `#6A5242` | Texto secundario | 6,68 | 5,88 |
| texto tenue | `#735C4B` | Ayudas, metadatos | 5,76 | 5,07 |
| terracota | `#A84B2A` | Acción principal, enlaces, activo | 5,23 | 4,60 |
| terracota oscuro | `#8A3B1F` | Hover/foco de la acción principal | — | — |
| verde oliva | `#56652F` | Éxito, en stock, entregado | 5,87 | 5,17 |
| ocre | `#8A5A0B` | Avisos, pendiente | 5,46 | 4,81 |
| rojo ladrillo | `#9E3426` | Errores, agotado | 6,51 | 5,74 |

Texto blanco sobre botón terracota: 5,67 (normal) y 7,70 (hover terracota oscuro).

**Rationale**: Todos los pares texto/fondo superan 4,5:1 (FR-007, SC-003). Un primer valor de texto tenue (`#7D6553`) daba 4,42 sobre arcilla y se oscureció. Los colores de estado conservan la semántica actual (verde = bien, ámbar = aviso, rojo = error) para no confundir a quien ya usaba la tienda.

**Alternatives considered**: Mantener tema oscuro con acentos terracota (descartado: la spec pide fondo crema y sensación reconfortante); paleta con azul para "en preparación" (descartado: rompe la familia tierra; se usa un tono arcilla oscuro `#7A5C3E` con texto claro para ese estado).

---

## 2. Colores de estado de pedido (FR-009)

**Decision**: Un único mapa compartido, definido en el tema:

| Estado | Color |
|--------|-------|
| pendiente | marrón neutro `#735C4B` |
| pagado | terracota `#A84B2A` |
| en preparación | marrón arcilla `#7A5C3E` |
| salido de la tienda | mostaza `#7A6410` |
| entregado | verde oliva `#56652F` |

Cada estado usa el color como texto/borde sobre un fondo del mismo tono al 13% de opacidad. Contraste del texto sobre ese fondo: 4,61 (pagado) a 5,17 (entregado), todos ≥ 4,5.

*Ajuste durante la implementación*: "pendiente" pasa de ocre a marrón neutro porque ocre y mostaza eran casi indistinguibles; el ocre queda reservado para avisos.

**Rationale**: Hoy `cuenta.css` y `logistica.css` asignan colores distintos al mismo estado ("salido" es índigo en uno y ámbar en otro). Un único mapa cumple FR-009.

**Alternatives considered**: Dejar los colores en cada hoja (descartado: es la causa actual de la incoherencia).

---

## 3. Tipografía

**Decision**: Títulos en **Fraunces** (serif de trazo suave), texto en **Nunito Sans**, ambas de Google Fonts, con alternativas `Georgia, serif` y `system-ui, sans-serif`. Se mantiene `JetBrains Mono` solo donde ya se usa para códigos (seguimiento, referencias).

**Rationale**: Una serif cálida en títulos da carácter artesanal; una sans redondeada en el cuerpo mantiene la legibilidad de formularios y tablas. Las alternativas del sistema cubren el caso límite "fuente no disponible".

**Alternatives considered**: Mantener Inter (correcta pero fría/tecnológica); usar una tipografía manuscrita (descartada por legibilidad).

---

## 4. Cabecera común

**Decision**: Bloque HTML estático idéntico en las 7 páginas (`<header class="site-header">`) con marca "🏺 TiendaOnline", enlaces "Catálogo", "Cesta", "Envíos", "Mi Cuenta" y "Administración" (oculto por defecto). La página actual se marca con `aria-current="page"` en su enlace. Un módulo `site-header.js` reutiliza `AccountApiService` para mostrar "Administración" solo al rol `admin`, sustituyendo los tres scripts en línea duplicados de hoy. En las páginas de administración, el enlace es visible siempre (ya están protegidas por `admin-access-guard.js`) y debajo de la cabecera aparece una subnavegación con "Catálogo e Inventario", "Informes de Ventas" y "Gestión Logística" (FR-004).

**Rationale**: HTML estático = funciona sin JS y sin parpadeo; `aria-current` sirve tanto para el resaltado visual (FR-003) como para accesibilidad. Es la opción con menos piezas.

**Alternatives considered**: Inyectar la cabecera por JS desde un componente (parpadeo al cargar, depende de JS); plantillas en el servidor Express (añade motor de plantillas, viola Principio I).

**Nota sobre `cuenta.html`**: conserva su función `setAdminNav` porque la visibilidad cambia tras iniciar o cerrar sesión sin recargar; usa el mismo `id="nav-admin"`.

---

## 5. Estrategia de migración de estilos

**Decision**:
1. Crear `tema-ceramica.css` con los tokens (manteniendo los nombres de variable actuales: `--bg-primary`, `--bg-secondary`, `--card-bg`, `--card-border`, `--text-main`, `--text-muted`, `--text-dim`, `--accent-primary`, `--accent-hover`, `--accent-gradient`, `--success-*`, `--warning-*`, `--error-*`, etc.), la cabecera común y los componentes base.
2. Enlazarla en cada página **antes** de la hoja propia.
3. Eliminar de cada hoja de página su bloque `:root` de colores (si no, lo sobrescribiría) y los estilos de su cabecera propia.
4. Sustituir los colores fijos (≈ 80 valores distintos: `#ffffff`, `rgba(255,255,255,0.08)`, `#4f46e5`, `#0b0f19`…) por variables del tema, también en los estilos en línea de los componentes JS.
5. Verificar con una búsqueda que no quedan los valores índigo/violeta/oscuros (SC-004).

**Rationale**: Reutilizar los nombres de variable hace que la mayor parte del recoloreado sea automático; la prueba existente que busca `--accent-primary` en `checkout.css` sigue pasando.

**Alternatives considered**: Hoja de "sobrescritura" cargada al final sin tocar las hojas existentes (descartado: no alcanza los colores fijos y deja reglas contradictorias); reescribir todas las hojas desde cero (riesgo alto de romper flujos, contrario a FR-011).

---

## 6. Gráficos del informe de ventas

**Decision**: Las barras/indicadores usan terracota como serie principal y arcilla oscuro, oliva y ocre como series secundarias, siempre con etiqueta de texto junto al valor.

**Rationale**: Mantiene la distinción entre series (caso límite de la spec) sin salir de la paleta.

---

## 7. Diseño adaptable (FR-010)

**Decision**: En anchos < 720 px la cabecera pasa a dos filas (marca arriba, enlaces debajo en una fila que puede partirse en varias líneas); sin menú hamburguesa.

**Rationale**: Mantiene los 4–5 enlaces siempre visibles sin JS adicional y evita desplazamiento horizontal (SC-007).

**Alternatives considered**: Menú hamburguesa (más JS y un clic extra, contrario a SC-002).
