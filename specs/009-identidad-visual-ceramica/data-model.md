# Data Model: 009 - Identidad Visual Unificada de Tienda de Cerámica

Esta funcionalidad no añade datos persistidos. Las "entidades" son elementos de diseño compartidos que todas las páginas consumen.

---

## Entidad 1: Paleta de colores tierra (tokens)

Conjunto cerrado de variables CSS definidas una sola vez en `frontend/src/styles/tema-ceramica.css`. Los valores están justificados en [research.md](./research.md#1-paleta-de-colores-tierra-y-contraste).

| Grupo | Variables (nombres existentes que se conservan) | Valor |
|-------|---------------------------------------|-------|
| Fondos | `--bg-primary` | crema `#FAF5EE` |
| | `--bg-secondary`, `--bg-tertiary` | arcilla `#F1E6D8` / arcilla media `#E9DAC6` |
| Superficies | `--card-bg`, `--bg-card` | blanco cálido `#FFFCF7` |
| | `--bg-card-hover` | `#FFF8EF` |
| Bordes | `--card-border`, `--border-color` | arena `#DCC8AF` |
| | `--card-border-focus`, `--border-focus` | terracota al 45% |
| Texto | `--text-main` | `#3B2A20` |
| | `--text-muted` | `#6A5242` |
| | `--text-dim` | `#735C4B` |
| Acento | `--accent-primary` | terracota `#A84B2A` |
| | `--accent-hover` | `#8A3B1F` |
| | `--accent-gradient` | `linear-gradient(135deg, #B85A35, #A84B2A)` |
| | `--accent-artisan` | ocre `#8A5A0B` |
| Éxito | `--success-color`, `--normal-color`, `--stock-in-color` | oliva `#56652F` (+ `-bg` al 12%, `-border` al 35%) |
| Aviso | `--warning-color`, `--pending-color` | ocre `#8A5A0B` (+ `-bg`, `-border`) |
| Error | `--error-color`, `--danger-color`, `--stock-out-color` | ladrillo `#9E3426` (+ `-bg`, `-border`) |
| Estados de pedido | `--prep-*`, `--shipped-*` | según [research.md §2](./research.md#2-colores-de-estado-de-pedido-fr-009) |
| Tipografía | `--font-family`, `--font-heading`, `--font-mono` | Nunito Sans / Fraunces / JetBrains Mono |
| Forma | `--radius-sm/md/lg/xl` | 8 / 12 / 16 / 22 px |
| Sombras | `--shadow-card`, `--shadow-hover`, `--shadow-modal`, `--shadow-subtle` | sombras marrones suaves (`rgba(59, 42, 32, …)`) |

**Validation rules**:
- Cada par texto/fondo usado debe cumplir 4,5:1 (FR-007).
- Ninguna hoja de página redefine estas variables en su propio `:root`.
- No aparecen en ninguna hoja ni componente los valores retirados: `#4f46e5`, `#4338ca`, `#7c3aed`, `#6366f1`, `#818cf8`, `#a5b4fc`, `#8b5cf6`, `#0b0f19`, `#111827`, `#1f2937`, `#1e293b`, `rgba(30, 41, 59, …)`, `rgba(17, 24, 39, …)`, `rgba(15, 23, 42, …)`, `rgba(99, 102, 241, …)`, `rgba(79, 70, 229, …)` (SC-004).

---

## Entidad 2: Cabecera común

| Campo | Descripción | Regla |
|-------|-------------|-------|
| Marca | Icono 🏺 + "TiendaOnline" | Enlaza a `/catalogo` (inicio) |
| Enlaces públicos | Catálogo (`/catalogo`), Cesta (`/carrito`), Envíos (`/logistica`), Mi Cuenta (`/cuenta`) | Mismo orden y texto en las 7 páginas (FR-001, FR-002) |
| Enlace de administración | Administración (`/admin/catalogo`), `id="nav-admin"` | Oculto por defecto; visible solo si el usuario tiene rol `admin`; siempre visible en páginas de administración |
| Sección activa | `aria-current="page"` en el enlace de la página actual | Un único enlace activo por página (FR-003) |
| Subnavegación de administración | Catálogo e Inventario, Informes de Ventas, Gestión Logística | Solo en `admin/catalogo.html` y `admin/ventas.html` (FR-004) |

**Página → enlace activo**:

| Página | Enlace activo |
|--------|---------------|
| `catalogo.html` | Catálogo |
| `cart.html`, `checkout.html` | Cesta |
| `logistica.html` | Envíos |
| `cuenta.html` | Mi Cuenta |
| `admin/catalogo.html`, `admin/ventas.html` | Administración |

**State transitions**: el enlace "Administración" pasa de oculto a visible al confirmarse el rol `admin` (y vuelve a oculto al cerrar sesión en `cuenta.html`).
