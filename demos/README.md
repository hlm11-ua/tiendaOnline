# Vídeos de demostración por funcionalidad

Cada funcionalidad de `specs/` tiene un vídeo MP4 (1280 × 720) que se graba automáticamente recorriendo la tienda real:

1. **Tarjeta de presentación** con la estética de la tienda: grupo y público, título, descripción y la lista numerada de escenarios.
2. **Recorrido por la tienda**: cada escenario lleva un rótulo («Escenario N de M · …») con lo que ocurre, y un cursor simulado indica dónde se pulsa.

| Vídeo | Funcionalidad |
|-------|---------------|
| `001-catalogo-filtros.mp4` | Catálogo con filtros y sincronización de URL |
| `002-carrito-persistente.mp4` | Cesta persistente con control de stock y precios |
| `003-pago-tarjeta.mp4` | Pago con tarjeta, 3D Secure, rechazos y reserva de 10 minutos |
| `004-cuentas-seguimiento.mp4` | Registro, sesión, historial y seguimiento de pedidos |
| `005-resenas-valoraciones.mp4` | Reseñas solo de compradores verificados |
| `006-administracion-catalogo.mp4` | Alta de categorías y piezas, alertas de stock y acceso por rol |
| `007-logistica-envios.mp4` | Preparación, despacho, avisos y confirmación de entrega |
| `008-resumen-ventas.mp4` | Cuadro de mando, ranking, rango de fechas y exportación CSV |

## Generar los vídeos

Requisitos: Node.js 18+ y Google Chrome o Microsoft Edge instalados (se usa el navegador del sistema; si está en otra ruta, indíquela con `CHROME_PATH`).

```bash
cd demos
npm install
npm run grabar             # todas las demos
npm run grabar -- 003 005  # solo las indicadas
```

Los vídeos se guardan en `demos/videos/`. La grabación es en tiempo real: cada demo tarda lo mismo que dura (1–2 minutos).

Para obtener además un único vídeo con todas las demos seguidas, en orden (`demos/videos/demo-completa.mp4`, unos 15 minutos):

```bash
npm run unir
```

Une los `NNN-*.mp4` existentes sin recodificarlos y sin modificar ni borrar los originales; si se vuelve a grabar alguna demo, basta con repetir `npm run unir`.

No hace falta arrancar la tienda: el script levanta su propio servidor en un puerto libre y **reinicia el almacén en memoria antes de cada demo**, así que cada vídeo parte de los mismos datos. Los clientes y pedidos que aparecen son ficticios y se crean en la función `preparar` de cada guion. Las demos de administración usan la cuenta de administrador sembrada para desarrollo (variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`).

## Estructura

```text
demos/
├── grabar.mjs                 # Arranca la tienda y graba los guiones indicados
├── lib/
│   ├── motor.mjs              # Chrome + ffmpeg, rótulos, cursor simulado y API de guion
│   └── datos.mjs              # Productos sembrados y ayudas para crear clientes y pedidos
├── plantillas/intro.html      # Tarjeta de presentación (estilo tema cerámica)
└── funcionalidades/NNN-*.mjs  # Un guion por funcionalidad
```

## Añadir o modificar una demo

Cada guion exporta `archivo`, `intro` (etiqueta, título, descripción con `<strong>` y lista de escenarios), un `preparar` opcional para los datos de partida y `guion(demo)`. Pasos disponibles:

| Paso | Qué hace |
|------|----------|
| `demo.ir(ruta)` | Abre una página de la tienda |
| `demo.escenario(n, título, texto, { posicion })` | Muestra el rótulo de un escenario (`'abajo'` o `'arriba'`) |
| `demo.narrar(texto)` | Cambia el texto del escenario en curso |
| `demo.clic(selector, { navega })` | Mueve el cursor y pulsa (`navega: true` si cambia de página) |
| `demo.escribir(selector, texto)` | Escribe en un campo |
| `demo.elegir(selector, valor)` / `demo.fijarValor(selector, valor)` | Desplegables y campos de fecha |
| `demo.responderPrompt(texto)` | Respuesta del próximo `prompt()` (los `confirm()` se aceptan) |
| `demo.iniciarSesion(email, contraseña)` / `demo.cerrarSesion()` | Acceso desde «Mi Cuenta» |
| `demo.moverA(selector)` / `demo.pausa(ms)` | Señalar un elemento o esperar |

El rótulo debe colocarse donde no tape lo que se quiere mostrar: los mensajes de error del pago, por ejemplo, aparecen en la parte superior, así que esos escenarios usan `posicion: 'abajo'`.
