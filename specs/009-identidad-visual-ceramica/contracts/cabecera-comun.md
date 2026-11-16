# Contrato de UI: Cabecera común y tema cerámica

Esta funcionalidad no expone endpoints. El contrato es la interfaz que comparten todas las páginas: el marcado de la cabecera y las variables CSS públicas del tema. Cualquier página nueva debe respetarlo.

---

## 1. Inclusión en cada página

Dentro de `<head>`, en este orden:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/styles/tema-ceramica.css">
<link rel="stylesheet" href="/src/styles/<hoja-de-la-página>.css">
```

Al final de `<body>` (excepto `cuenta.html`, que gestiona el enlace con su propio `setAdminNav`):

```html
<script type="module" src="/src/components/site-header.js"></script>
```

---

## 2. Marcado de la cabecera

```html
<header class="site-header" role="banner">
  <div class="site-header__inner">
    <a href="/catalogo" class="site-header__brand" aria-label="TiendaOnline - Ir al catálogo">
      <span class="site-header__logo" aria-hidden="true">🏺</span>
      <span class="site-header__name">TiendaOnline</span>
    </a>
    <nav class="site-header__nav" aria-label="Navegación principal">
      <a href="/catalogo" class="site-header__link">Catálogo</a>
      <a href="/carrito" class="site-header__link">Cesta</a>
      <a href="/logistica" class="site-header__link">Envíos</a>
      <a href="/cuenta" class="site-header__link">Mi Cuenta</a>
      <a href="/admin/catalogo" class="site-header__link" id="nav-admin" hidden>Administración</a>
    </nav>
  </div>
</header>
```

Reglas:
- El enlace de la página actual lleva `aria-current="page"` (ver tabla en [data-model.md](../data-model.md#entidad-2-cabecera-común)).
- En páginas de administración, `#nav-admin` se escribe **sin** `hidden` y con `aria-current="page"`, y se añade justo debajo del `</header>`:

```html
<nav class="admin-subnav" aria-label="Secciones de administración">
  <a href="/admin/catalogo" class="admin-subnav__link">Catálogo e Inventario</a>
  <a href="/admin/ventas" class="admin-subnav__link">Informes de Ventas</a>
  <a href="/logistica" class="admin-subnav__link">Gestión Logística</a>
</nav>
```

- Los IDs `id="nav-admin"` y `id="link-home"`/`id="brand-link"` que usen scripts o pruebas existentes deben conservarse o actualizarse en el mismo cambio.

---

## 3. Comportamiento de `site-header.js`

| Situación | Resultado |
|-----------|-----------|
| Sin sesión | `#nav-admin` permanece oculto |
| Sesión con rol distinto de `admin` | `#nav-admin` oculto |
| Sesión con rol `admin` | `#nav-admin` visible |
| Error al consultar la cuenta | `#nav-admin` oculto |
| `#nav-admin` ya visible (páginas de administración) | No se modifica |

---

## 4. Variables CSS públicas

Las páginas y componentes **solo** deben usar colores a través de estas variables (definidas en `tema-ceramica.css`, valores en [data-model.md](../data-model.md)):

`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--card-bg`, `--bg-card`, `--bg-card-hover`, `--card-border`, `--border-color`, `--card-border-focus`, `--border-focus`, `--text-main`, `--text-muted`, `--text-dim`, `--text-on-accent`, `--accent-primary`, `--accent-hover`, `--accent-gradient`, `--accent-soft`, `--accent-artisan`, `--success-color|bg|border`, `--warning-color|bg|border`, `--error-color|bg|border`, `--status-pendiente`, `--status-pagado`, `--status-preparacion`, `--status-salido`, `--status-entregado`, `--font-family`, `--font-heading`, `--font-mono`, `--radius-sm|md|lg|xl`, `--shadow-subtle|card|hover|modal`.

Los alias existentes (`--normal-*`, `--danger-*`, `--stock-in-*`, `--stock-out-*`, `--pending-*`, `--prep-*`, `--shipped-*`) se mantienen y apuntan a los tokens anteriores para no romper hojas ni componentes.
