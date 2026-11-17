# Reparto del trabajo: 4 personas × 2 historias

| Persona | Usuario de GitHub | Historias | Spec | Tema |
|---------|-------------------|-----------|------|------|
| **1** | `eab41-ua` | 1 + 5 | [001](../specs/001-catalogo-filtros/spec.md), [005](../specs/005-resenas-valoraciones/spec.md) | Escaparate: lo que el visitante ve y opina de cada pieza |
| **2** | `ab336-ua` | 2 + 4 | [002](../specs/002-carrito-persistente/spec.md), [004](../specs/004-cuentas-seguimiento/spec.md) | Comprador: su cesta, su cuenta y sus pedidos |
| **3** | `aps207-ua` | 3 + 7 | [003](../specs/003-pago-tarjeta/spec.md), [007](../specs/007-logistica-envios/spec.md) | Pedido: del cobro con tarjeta al envío |
| **4** | `hlm11-ua` | 6 + 8 | [006](../specs/006-administracion-catalogo/spec.md), [008](../specs/008-resumen-ventas/spec.md) | Empresa: catálogo, existencias e informes de ventas |

Las specs 002, 003, 004, 006, 007 y 008 lo dejan escrito en su cabecera («Responsable asignado: Desarrollador N, Persona N de 4»); 001 y 005 no lo indican, pero las implementó la persona 1 (pull requests hlm11-ua/tiendaOnline#15 y hlm11-ua/tiendaOnline#16).

La feature [009](../specs/009-identidad-visual-ceramica/spec.md) (identidad visual común) no es una historia de usuario: se añadió al final para unificar el aspecto de las ocho y la llevó la persona 3.

## Por qué así

- **1 (001 + 005)**: las dos viven en la página del catálogo. Las reseñas se abren desde la tarjeta de cada producto y la nota media se muestra en el propio listado, así que quien construye el catálogo sabe dónde encajan.
- **2 (002 + 004)**: ambas giran en torno a la identidad del comprador. La cesta de un visitante anónimo se fusiona con la de su cuenta al iniciar sesión, y la cuenta es la que muestra el historial de pedidos.
- **3 (003 + 007)**: son las dos mitades del ciclo de vida del pedido. El pago lo crea en estado «pagado» y la logística lo hace avanzar por «en preparación», «salido de la tienda» y «entregado». Comparten la máquina de estados, así que conviene que la lleve una sola persona.
- **4 (006 + 008)**: ambas son pantallas exclusivas del rol administrador. 006 aporta los productos, variantes y existencias que todo el equipo usa; 008 solo lee los pedidos cobrados.

## Dependencias entre personas

- **4** (006) es la base del catálogo: productos, categorías, variantes y stock. Lo necesitan **1** para mostrarlo y filtrarlo, **2** para validar existencias en la cesta y **3** para reservar unidades al pagar.
- **2** (002) entrega a **3** el contenido de la cesta que se paga, y **3** (003) devuelve el pedido creado, que **2** (004) muestra en «Mi Cuenta».
- **3** (007) cambia las fases del pedido que **2** (004) enseña al comprador y genera los avisos de envío que aparecen en su buzón.
- **1** (005) necesita pedidos pagados o entregados (**3**) para saber quién es comprador verificado, y la sesión de **2** (004) para saber quién está valorando.
- **4** (008) necesita pedidos cobrados (**3**); hasta entonces puede trabajar con datos de ejemplo.

## Acuerdos a cerrar entre las 4 personas antes de empezar

1. **Fases del pedido**: `pendiente`, `pagado`, `en_preparacion`, `salido_tienda`, `entregado`. Solo cuentan como venta las cuatro últimas.
2. **Reserva de existencias al pagar**: 10 minutos; pasado ese tiempo las unidades vuelven al catálogo.
3. **Umbral de 3D Secure**: compras de más de 100,00 €.
4. **Quién dispara qué**: 003 crea el pedido y descuenta el stock; 007 cambia las fases posteriores y emite los avisos; 004 solo los lee.
5. **Identidad y roles**: 004 define cómo se inicia sesión (correo y contraseña, sesión de 30 días) y los roles `cliente` y `admin`; los demás reutilizan esa sesión en lugar de inventar la suya.
6. **Almacén común**: todos los datos viven en `backend/src/models/store.js` (en memoria); cada persona añade sus métodos sin redefinir las entidades de las demás.

## Orden sugerido

1. Semana 1: **4** (006) y **3** (003) → catálogo con existencias y pago, que son la base del resto.
2. Semana 2: **1** (001), **2** (002 y 004) y **3** (007), en paralelo.
3. Semana 3: **1** (005) y **4** (008), cuando ya hay pedidos y cuentas reales.

## Cómo fue en la práctica

Reconstruido a partir de los pull requests de GitHub:

| Fecha | PR | Persona | Contenido |
|-------|----|---------|-----------|
| 14 oct | hlm11-ua/tiendaOnline#10 | 3 | 003 Pago con tarjeta |
| 20 oct | hlm11-ua/tiendaOnline#11 | 3 | 007 Logística y envíos (implementada el 14 de octubre) |
| 20 oct | hlm11-ua/tiendaOnline#12 | 4 | 006 Administración del catálogo |
| 3 nov | hlm11-ua/tiendaOnline#13 | 4 | 008 Resumen de ventas |
| 6 nov | hlm11-ua/tiendaOnline#14 | 2 | 002 Gestión de la cesta |
| 8 nov | hlm11-ua/tiendaOnline#15 | 1 | 001 Catálogo con filtros |
| 10 nov | hlm11-ua/tiendaOnline#16 | 1 | 005 Valoraciones |
| 13 nov | hlm11-ua/tiendaOnline#17 | 2 | 002 Arreglos de la cesta persistente |
| 14 nov | hlm11-ua/tiendaOnline#18 | 2 | 004 Cuentas y seguimiento |
| 16 nov | hlm11-ua/tiendaOnline#19, hlm11-ua/tiendaOnline#20, hlm11-ua/tiendaOnline#21 | 3 | Convergencia de 007, arreglos y 009 identidad visual |

El orden real siguió el sugerido en lo esencial: pago, logística y catálogo de administración primero; cesta, catálogo público y reseñas después; cuentas al final. Al llegar tarde la sesión (004, 14 de noviembre), las reseñas (005, 10 de noviembre) se habían construido con una identidad de prueba que no se conectó a las cuentas; se detectó y corrigió al grabar las demos, en la rama `feat/demos-funcionalidades`, todavía sin fusionar (véase la memoria, §6.4).
