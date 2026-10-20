# Quickstart & Validation Guide: 006 - Administración de Productos y Alertas de Stock Bajo

**Feature**: `006-administracion-catalogo` | **Fecha**: 2026-10-20  
**Spec**: [spec.md](./spec.md) | **Contrato**: [catalogo-admin-api.yaml](./contracts/catalogo-admin-api.yaml)

Esta guía describe los escenarios ejecutables de prueba de principio a fin para validar la gestión del catálogo, variantes y alertas de stock bajo en la aplicación.

---

## 1. Prerrequisitos e Inicio del Servidor

Asegúrate de que las dependencias estén instaladas y levanta el servidor local:

```bash
# Iniciar servidor de desarrollo en http://localhost:3000
npm start
```

Verifica la disponibilidad de la API:
```bash
curl -s http://localhost:3000/api/health
```

---

## 2. Escenario 1: Creación de Categoría y Alta Completa de Producto con Fotos y Variantes (SC-001)

**Objetivo**: Dar de alta una categoría y publicar un producto con 2 fotos y 2 variantes en menos de 2 minutos.

### Paso 1.1: Crear la categoría "Cerámica"
```bash
curl -X POST http://localhost:3000/api/admin/categorias \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "nombre": "Cerámica",
    "descripcion": "Piezas artesanales torneadas a mano en torno de alfarero"
  }'
```
**Resultado esperado**: HTTP 201 con `id: "cat-ceramica"` (o similar) y `estado: "activa"`.

### Paso 1.2: Dar de alta el producto con fotos y variantes
```bash
curl -X POST http://localhost:3000/api/admin/productos \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "titulo": "Jarrón Artesanal Verde Esmaltado",
    "descripcion": "Jarrón decorativo cocido a 1250 grados con acabado vidriado tradicional.",
    "categoriaId": "cat-ceramica",
    "artesano": "Alfarería Sierra",
    "precioBase": 38.50,
    "imagenes": [
      {
        "url": "/public/uploads/jarron-verde-1.webp",
        "nombreArchivo": "jarron-verde-1.webp",
        "mimeType": "image/webp",
        "tamanoBytes": 524288,
        "esPrincipal": true
      },
      {
        "url": "/public/uploads/jarron-verde-2.webp",
        "nombreArchivo": "jarron-verde-2.webp",
        "mimeType": "image/webp",
        "tamanoBytes": 480120,
        "esPrincipal": false
      }
    ],
    "variantes": [
      {
        "nombre": "Pequeño",
        "stockTotal": 4,
        "umbralAlerta": 2
      },
      {
        "nombre": "Grande",
        "stockTotal": 1,
        "umbralAlerta": 2
      }
    ]
  }'
```
**Resultado esperado**: HTTP 201. El producto se almacena con sus 2 variantes. Ambas comparten el precio base de 38.50 €. La variante "Grande" con 1 unidad restante queda marcada para aviso de stock bajo.

---

## 3. Escenario 2: Detección y Resaltado Visual de Alerta de Stock Bajo (SC-002)

**Objetivo**: Comprobar que el 100% de las variantes cuyo stock disponible esté por debajo o igual a su umbral muestran la advertencia visible en el panel.

### Paso 2.1: Consultar la lista de alertas activas
```bash
curl -s -H "x-user-role: admin" http://localhost:3000/api/admin/alertas-stock
```
**Resultado esperado**:
- HTTP 200 con array `alertas`.
- La variante `"Grande"` del `"Jarrón Artesanal Verde Esmaltado"` figura con `estadoAlerta: "stock_bajo"` y `mensajeAlerta: "Stock bajo (1 unidad restante)"`.
- En el panel web `/admin/catalogo.html`, la fila correspondiente muestra un distintivo naranja destacado `"Stock bajo: 1 unidad"`.

---

## 4. Escenario 3: Sincronización en Tiempo Real de Ventas y Descuento Instantáneo (SC-003)

**Objetivo**: Simular la venta de una unidad desde el checkout y verificar que el stock en el panel administrativo se descuenta de inmediato sin recargas.

### Paso 3.1: Venta de la última unidad de la variante "Grande"
- A través del flujo del carrito y pasarela de pago (`/api/pagos/crear-sesion` o descuento directo de inventario en `store.js`), se compra 1 unidad de la variante "Grande".
- El `stockDisponible` pasa de 1 a 0.

### Paso 3.2: Consultar inmediatamente el panel administrativo
```bash
curl -s -H "x-user-role: admin" http://localhost:3000/api/admin/alertas-stock
```
**Resultado esperado**:
- La variante `"Grande"` actualiza su estado a `estadoAlerta: "agotado"` de manera instantánea ($< 500$ ms).
- En el catálogo público, la opción `"Grande"` se muestra marcada como `"Agotada"` impidiendo ser añadida al carrito.

---

## 5. Escenario 4: Bloqueo de Integridad al Archivar Categoría con Productos Activos (FR-002)

**Objetivo**: Verificar que el sistema impide archivar una categoría que tiene productos asociados en el catálogo.

```bash
curl -X PATCH http://localhost:3000/api/admin/categorias/cat-ceramica/archivar \
  -H "x-user-role: admin"
```
**Resultado esperado**:
- Código HTTP 409 Conflict.
- Respuesta JSON:
```json
{
  "error": "CONFLICT_ACTIVE_PRODUCTS",
  "mensaje": "No se puede archivar la categoría porque contiene productos activos. Reasigne o descatalogue los productos primero."
}
```
- La categoría permanece en estado `"activa"`.

---

## 6. Escenario 5: Creación de Producto sin Variantes Explícitas (Variante Estándar "Única")

**Objetivo**: Verificar que al omitir el listado de variantes, el sistema genera automáticamente una variante denominada `"Única"`.

```bash
curl -X POST http://localhost:3000/api/admin/productos \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "titulo": "Plato Decorativo de Barro Rojo",
    "descripcion": "Plato modelado a torno con arcilla roja y engobes minerales.",
    "categoriaId": "cat-ceramica",
    "artesano": "Taller Alfar",
    "precioBase": 24.00,
    "imagenes": [
      {
        "url": "/public/uploads/plato-rojo.webp",
        "nombreArchivo": "plato-rojo.webp",
        "mimeType": "image/webp",
        "tamanoBytes": 320000,
        "esPrincipal": true
      }
    ]
  }'
```
**Resultado esperado**: HTTP 201. El producto creado contiene automáticamente 1 variante con `nombre: "Única"`, `stockTotal: 0` y `umbralAlerta: 3`.

---

## 7. Escenario 6: Validación de Límites de Imágenes (Máx. 5 fotos, 5 MB c/u)

**Objetivo**: Intentar subir más de 5 fotos o una imagen que exceda 5 MB.

```bash
# Intento de enviar 6 imágenes
curl -X POST http://localhost:3000/api/admin/productos \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "titulo": "Test Límites",
    "categoriaId": "cat-ceramica",
    "artesano": "Test",
    "precioBase": 10.00,
    "imagenes": [
      {"url": "1.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100},
      {"url": "2.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100},
      {"url": "3.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100},
      {"url": "4.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100},
      {"url": "5.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100},
      {"url": "6.jpg", "mimeType": "image/jpeg", "tamanoBytes": 100}
    ]
  }'
```
**Resultado esperado**: HTTP 400 Bad Request con mensaje informativo en español: `"No se pueden asociar más de 5 imágenes por producto."`.

---

## 8. Escenario 7: Control de Acceso por Rol (FR-001)

**Objetivo**: Comprobar que cualquier petición sin rol administrativo es rechazada.

```bash
curl -i http://localhost:3000/api/admin/productos
```
**Resultado esperado**:
- Código HTTP 403 Forbidden.
- Respuesta JSON:
```json
{
  "error": "FORBIDDEN",
  "mensaje": "Acceso restringido a usuarios con rol de administrador/empresa."
}
```
