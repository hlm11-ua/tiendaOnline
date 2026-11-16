# Implementation Plan: 009 - Identidad Visual Unificada de Tienda de Cerámica

**Branch**: `009-identidad-visual-ceramica` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-identidad-visual-ceramica/spec.md`

---

## Summary

Sustituir el aspecto oscuro con acentos índigo/violeta de las 7 páginas por un tema claro en tonos tierra (crema, arcilla, terracota, marrón tostado, verde oliva, ocre y rojo ladrillo) y unificar la cabecera y la navegación. El enfoque técnico es el más simple posible (Principio I): una única hoja de estilos compartida `tema-ceramica.css` con los tokens de color, la tipografía, la cabecera común y los componentes base; un único módulo `site-header.js` que gestiona la visibilidad del enlace "Administración"; y la eliminación en cada hoja de estilos de página de su bloque `:root` de colores y de los colores escritos a mano, sustituidos por las variables del tema. No se toca el backend ni la lógica de ninguna funcionalidad.

---

## Technical Context

**Language/Version**: HTML5, CSS3 (propiedades personalizadas), JavaScript ES Modules en navegador; Node.js v18+ solo para servir los estáticos y ejecutar pruebas
**Primary Dependencies**: Ninguna nueva. Express 4.x existente sirve `frontend/` como estático. Tipografías de Google Fonts (ya en uso) con alternativa del sistema
**Storage**: N/A (cambio exclusivamente visual)
**Testing**: Node.js Test Runner (`node --test tests/**/*.test.js`): la batería existente debe seguir pasando (SC-005) + una prueba de integración nueva que comprueba que las 7 páginas sirven la cabecera común y la hoja de tema
**Target Platform**: Navegadores modernos de escritorio y móvil (ancho mínimo 375 px)
**Project Type**: Aplicación web (backend REST + frontend Vanilla JS/CSS)
**Performance Goals**: Sin regresión perceptible: una hoja de estilos compartida adicional (< 15 KB) y un módulo JS pequeño
**Constraints**: Contraste AA (4,5:1 texto normal, 3:1 texto grande) verificado para cada par texto/fondo de la paleta; 100% `es-ES`; sin cambios de funcionalidad (FR-011); mantener los nombres de variables CSS existentes (`--accent-primary`, `--text-main`, etc.) porque los componentes JS y las pruebas los referencian
**Scale/Scope**: 7 páginas HTML (`catalogo`, `cart`, `checkout`, `cuenta`, `logistica`, `admin/catalogo`, `admin/ventas`), 9 hojas de estilos existentes (~6.900 líneas), ~25 componentes JS con algunos colores en línea

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
|--------------------------|--------|------------------------------|
| **I. Simplicidad ante todo** | **PASADO** | Una sola hoja de tema y un solo módulo de cabecera. Se descartan preprocesadores CSS, frameworks de componentes, plantillas en servidor y selector de modo oscuro. La cabecera es HTML estático idéntico en cada página (funciona sin JS); el JS solo muestra/oculta "Administración". |
| **II. Idioma y mercado** | **PASADO** | Los únicos textos nuevos (enlaces de navegación y subnavegación de administración) están en `es-ES`. Ningún precio ni formato de moneda cambia. |
| **III. Cero alcance fantasma** | **PASADO** | Cada cambio se traza a FR-001…FR-012 de `spec.md`. No se añaden imágenes, logotipo nuevo, modo oscuro ni funcionalidad. Los distintivos informativos que hoy viven en cabeceras propias ("Pasarela Bancaria Segura", "Cesta de Compras Persistente") se trasladan al contenido de su página, según la suposición documentada en la spec. |
| **IV. Verificable por personas no técnicas** | **PASADO** | La guía [quickstart.md](./quickstart.md) se recorre solo con el navegador: cabecera idéntica, enlace activo resaltado, ausencia de fondos oscuros/índigo, prueba en móvil y un comprobador de contraste en línea. |
| **V. Respeto por los datos del usuario** | **PASADO** | No se solicitan ni almacenan datos nuevos; la comprobación del rol reutiliza el servicio de cuenta existente. |

---

## Project Structure

### Documentation (this feature)

```text
specs/009-identidad-visual-ceramica/
├── spec.md              # Especificación funcional
├── plan.md              # Este documento
├── research.md          # Decisiones de paleta, tipografía, cabecera y estrategia de migración
├── data-model.md        # Tokens de la paleta y estructura de la cabecera común
├── contracts/
│   └── cabecera-comun.md  # Contrato de UI: marcado de la cabecera y tokens CSS públicos
├── quickstart.md        # Guía de validación paso a paso
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
frontend/
├── public/
│   ├── catalogo.html          # EDITAR: cabecera común, enlazar tema, quitar script de admin en línea
│   ├── cart.html              # EDITAR: cabecera común (sustituye la cabecera propia)
│   ├── checkout.html          # EDITAR: cabecera común; distintivo de seguridad pasa al contenido
│   ├── cuenta.html            # EDITAR: cabecera común (mantiene setAdminNav dinámico tras login)
│   ├── logistica.html         # EDITAR: cabecera común, quitar script de admin en línea
│   └── admin/
│       ├── catalogo.html      # EDITAR: cabecera común + subnavegación de administración
│       └── ventas.html        # EDITAR: cabecera común + subnavegación de administración
└── src/
    ├── components/
    │   ├── site-header.js     # NUEVO: muestra "Administración" solo al rol admin
    │   └── **/*.js            # EDITAR: sustituir colores en línea por variables del tema
    └── styles/
        ├── tema-ceramica.css  # NUEVO: tokens, tipografía, cabecera común, componentes base
        ├── catalogo.css       # EDITAR: quitar :root de colores y colores fijos; quitar estilos de cabecera propia
        ├── cart.css           # EDITAR: ídem
        ├── checkout.css       # EDITAR: ídem
        ├── cuenta.css         # EDITAR: ídem
        ├── logistica.css      # EDITAR: ídem
        ├── resenas.css        # EDITAR: colores fijos → variables
        ├── admin-catalogo.css # EDITAR: ídem
        └── admin-ventas.css   # EDITAR: ídem (incluidos colores de gráficos)
tests/
└── integration/
    └── identidad-visual.test.js  # NUEVO: las 7 páginas incluyen tema y cabecera común; sin colores índigo/oscuros en las hojas
```

**Structure Decision**: Se mantiene la estructura web existente (Option 2: `backend/` + `frontend/`). El backend no se modifica: `express.static` ya sirve `frontend/src/styles/` y `frontend/src/components/`.

---

## Complexity Tracking

> **Sin violaciones constitucionales.**

| Componente | Enfoque Adoptado | Razón de Simplicidad |
|------------|------------------|----------------------|
| **Cabecera común** | Mismo bloque HTML estático copiado en las 7 páginas + 1 módulo JS para el rol | Evita plantillas en servidor o inyección por JS (que provocaría parpadeo y dependencia de JS) |
| **Paleta** | Variables CSS en una hoja compartida, reutilizando los nombres actuales | Las hojas y componentes existentes ya consumen esas variables; cambiar el valor en un sitio recolorea todo |
| **Modo oscuro** | No se implementa | Fuera de alcance (spec, Assumptions) |
