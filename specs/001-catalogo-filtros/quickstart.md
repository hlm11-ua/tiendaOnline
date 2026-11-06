# Quickstart & Validation Guide: 001 - Catálogo de productos con filtros y sincronización de URL

**Feature**: `001-catalogo-filtros` | **Fecha**: 2026-11-06  
**Spec**: [spec.md](./spec.md) | **Contrato**: [catalogo-api.yaml](./contracts/catalogo-api.yaml)

Esta guía describe los escenarios ejecutables de prueba de principio a fin para validar el catálogo público, el filtrado multidimensional y la sincronización bidireccional con la URL.

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

## 2. Escenario 1: Navegación y Filtrado por Categoría (Story 1, P1)

**Objetivo**: Validar que la selección de una categoría filtra los productos y actualiza la ruta.

### Paso 1.1: Obtener metadatos de categorías activas
```bash
curl -s http://localhost:3000/api/catalogo/filtros
```
**Resultado esperado**: HTTP 200 con la lista de categorías activas (ej. `"Cerámica"`, `"Textil"`, `"Madera"`), sus slugs correspondientes y el conteo de productos.

### Paso 1.2: Filtrar productos por la categoría "Cerámica"
```bash
curl -s "http://localhost:3000/api/catalogo/productos?categoria=ceramica"
```
**Resultado esperado**: HTTP 200 devolviendo únicamente piezas adscritas a Cerámica (`categoriaSlug: "ceramica"`). En el navegador, al pulsar sobre la categoría Cerámica en `http://localhost:3000/catalogo.html`, la URL pasa a ser `http://localhost:3000/catalogo.html?categoria=ceramica`.

---

## 3. Escenario 2: Filtrado Combinado Multidimensional (Story 2, P1)

**Objetivo**: Validar la aplicación simultánea de filtros de precio, productor y disponibilidad en stock (conjunción AND).

### Paso 2.1: Filtrar por rango de precio (10,00 € a 50,00 €) y disponibilidad en stock
```bash
curl -s "http://localhost:3000/api/catalogo/productos?minPrecio=10&maxPrecio=50&enStock=true"
```
**Resultado esperado**: HTTP 200 devolviendo exclusivamente productos cuyo `precioBase` esté comprendido entre 10,00 € y 50,00 € inclusive y con `enStock === true`.

### Paso 2.2: Combinar categoría, productor y stock
```bash
curl -s "http://localhost:3000/api/catalogo/productos?categoria=ceramica&productor=Taller%20Hermanos%20Alfareros&enStock=true"
```
**Resultado esperado**: HTTP 200 con los artículos que cumplan los 3 criterios a la vez.

---

## 4. Escenario 3: Sincronización Bidireccional con la URL (Story 3, P2)

**Objetivo**: Comprobar que al acceder directamente con parámetros query, la vista se inicializa con los filtros y productos correctos.

### Paso 3.1: Acceso directo por URL con parámetros
1. Abre en una ventana nueva o en modo incógnito:
   `http://localhost:3000/catalogo.html?categoria=madera&minPrecio=20&maxPrecio=100&enStock=true`
2. **Resultado esperado**:
   - El selector de categoría muestra marcada "Madera".
   - El campo de precio mínimo contiene "20" y el máximo "100".
   - La casilla "Solo en stock" aparece activada.
   - En la cuadrícula de productos solo se listan los productos de madera dentro de ese rango y con existencias.

---

## 5. Escenario 4: Estado Vacío y Restablecimiento Completo de Filtros (Story 4, P3)

**Objetivo**: Validar el mensaje de ausencia de coincidencias y la restauración de todos los filtros con un solo clic.

### Paso 4.1: Introducir un filtro sin coincidencias
```bash
curl -s "http://localhost:3000/api/catalogo/productos?minPrecio=1000&maxPrecio=2000"
```
**Resultado esperado**:
- En la API: HTTP 200 con `total: 0` y `productos: []`.
- En la interfaz web: Se visualiza el mensaje en español `"No se han encontrado productos con los filtros seleccionados"` junto al botón `"Restablecer filtros"`.

### Paso 4.2: Pulsar el botón "Restablecer filtros"
1. Al hacer clic en `"Restablecer filtros"`:
   - Todos los campos de entrada se limpian.
   - La casilla de stock se desmarca.
   - La URL vuelve a su estado base `http://localhost:3000/catalogo.html` (sin query params).
   - Se muestra de nuevo la totalidad del catálogo activo.

---

## 6. Escenario 5: Casos Límite y Tolerancia a Fallos

**Objetivo**: Comprobar que valores invertidos o inexistentes no rompen la aplicación.

### Paso 5.1: Precios invertidos (`minPrecio > maxPrecio`)
```bash
curl -s "http://localhost:3000/api/catalogo/productos?minPrecio=80&maxPrecio=20"
```
**Resultado esperado**: El sistema invierte o normaliza ordenadamente el rango a `[20, 80]` sin lanzar excepciones ni errores 500.

### Paso 5.2: Categoría o productor inexistente
```bash
curl -s "http://localhost:3000/api/catalogo/productos?categoria=inexistente"
```
**Resultado esperado**: HTTP 200 con lista vacía `[]`, mostrando en pantalla el mensaje de sin coincidencias de forma amigable.

---

## 7. Ejecución Automatizada de Pruebas

Para validar automáticamente todos estos escenarios sin intervención manual:

```bash
node --test tests/integration/quickstart-catalogo.test.js
```
