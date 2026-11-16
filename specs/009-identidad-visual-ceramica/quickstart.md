# Quickstart: Validación de la Identidad Visual Unificada (009)

Guía para comprobar la funcionalidad de principio a fin usando solo el navegador (Principio IV), más la batería automática.

---

## Requisitos previos

```bash
npm install
npm start
```

Abrir `http://localhost:3000` (o el puerto que indique la consola). Para los escenarios de administración, iniciar sesión en "Mi Cuenta" con una cuenta de rol administrador de los datos de prueba del proyecto.

---

## Escenario 1: Cabecera común y enlace activo (US1, FR-001…FR-003)

1. Visitar en orden: `/catalogo`, `/carrito`, `/checkout`, `/cuenta`, `/logistica`.
2. **Esperado**: en las 5 páginas la cabecera es idéntica: 🏺 TiendaOnline y "Catálogo · Cesta · Envíos · Mi Cuenta" en ese orden.
3. **Esperado**: en cada página aparece resaltado el enlace que le corresponde (cesta y pago → "Cesta").
4. Desde `/checkout` pulsar "Mi Cuenta" y desde `/carrito` pulsar "Envíos". **Esperado**: se llega directamente (un clic).
5. Pulsar la marca "TiendaOnline". **Esperado**: se vuelve al catálogo.

## Escenario 2: Enlace de administración según rol (US1/AC4, FR-002)

1. Sin sesión, recorrer las páginas públicas. **Esperado**: no aparece "Administración".
2. Iniciar sesión con una cuenta de cliente. **Esperado**: sigue sin aparecer.
3. Iniciar sesión con una cuenta de administrador y recargar `/catalogo`. **Esperado**: aparece "Administración".
4. Pulsarlo. **Esperado**: en `/admin/catalogo` y `/admin/ventas` aparece la misma cabecera con "Administración" resaltado y debajo la subnavegación "Catálogo e Inventario · Informes de Ventas · Gestión Logística" (FR-004).

## Escenario 3: Paleta tierra sin restos del tema anterior (US2, FR-005, FR-006, SC-004)

1. Recorrer las 7 páginas y abrir al menos: el modal de reseñas (catálogo), el modal 3D Secure (pago con la tarjeta de prueba de 3DS del proyecto), el modal de despacho y el visor de avisos (logística).
2. **Esperado**: fondo crema, tarjetas en arcilla/blanco cálido, botones principales en terracota que se oscurecen al pasar el ratón; ningún fondo azul oscuro ni color violeta/índigo.
3. **Esperado**: mensajes de éxito/en stock en verde oliva, avisos en ocre, errores/agotado en rojo ladrillo.

## Escenario 4: Legibilidad (FR-007, SC-003)

1. Con un comprobador de contraste en línea (introduciendo los colores que muestran las herramientas del navegador), revisar: texto principal, texto secundario, texto de ayuda, texto de botón principal, enlace activo y etiquetas de estado.
2. **Esperado**: todos ≥ 4,5:1 (los valores de referencia están en [research.md](./research.md#1-paleta-de-colores-tierra-y-contraste)).

## Escenario 5: Coherencia de componentes y estados (US3, FR-008, FR-009)

1. Comparar un botón principal y un campo de formulario en `/checkout`, `/cuenta` y `/admin/catalogo`. **Esperado**: misma forma, tipografía, color y estilo de foco.
2. Con un pedido en cada estado, comparar sus etiquetas en `/cuenta` y en `/logistica`. **Esperado**: el mismo estado tiene el mismo color en ambas páginas.

## Escenario 6: Móvil (FR-010, SC-007)

1. Activar en las herramientas del navegador un ancho de 375 px y recorrer las 7 páginas.
2. **Esperado**: la cabecera muestra todos los enlaces (en dos filas si hace falta) y no hay desplazamiento horizontal.

## Escenario 7: Sin regresiones (FR-011, SC-005)

1. Realizar una compra completa: catálogo → añadir a la cesta → pagar.
2. Como administrador: preparar y despachar ese pedido en `/logistica`; consultar `/admin/ventas`.
3. **Esperado**: todo funciona igual que antes; solo cambia el aspecto.

---

## Batería automática

```bash
npm test
```

**Esperado**: todas las pruebas existentes pasan y la nueva `tests/integration/identidad-visual.test.js` confirma que las 7 páginas enlazan `tema-ceramica.css`, contienen la cabecera común con sus 4 enlaces públicos y que ninguna hoja de estilos contiene los colores retirados listados en [data-model.md](./data-model.md).
