# Quickstart & Guía de Validación: Carrito Persistente con Control de Stock

**Feature**: `specs/002-carrito-persistente/spec.md`  
**Responsable**: Desarrollador 2  
**Fecha**: 2026-10-19  

Esta guía describe cómo ejecutar el entorno y verificar de principio a fin los 7 escenarios de aceptación y los criterios de éxito cuantitativos del carrito de compras persistente.

---

## 1. Requisitos Previos y Configuración

- **Node.js**: Versión 18.x o superior con soporte nativo de ES Modules.
- **Navegador**: Cualquier navegador moderno con `localStorage` activado (Chrome, Firefox, Safari, Edge).
- **Dependencias**:
  ```bash
  npm install
  ```

---

## 2. Ejecución de la Suite de Pruebas Automatizadas

Ejecutar las pruebas unitarias y de integración del carrito mediante el test runner nativo de Node.js:

```bash
npm test
```

### Pruebas de Contrato y Reglas de Negocio a Validar
- `tests/unit/cart-service.test.js`: Validación de cálculo de subtotales, rechazo de cantidades inválidas (< 0, decimales, no numéricas) y control estricto de límite de stock.
- `tests/unit/cart-merge.test.js`: Algoritmo de fusión de carritos (suma de artículos coincidentes y recorte al stock disponible con emisión de avisos).
- `tests/integration/cart-api.test.js`: Verificación de endpoints REST según [cart-api.yaml](contracts/cart-api.yaml).

---

## 3. Ejecución del Servidor de Demostración

Iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 4. Escenarios de Validación Manual (Criterio no técnico)

### Escenario 1: Añadir Productos y Cálculo de Totales con Envío Gratuito
1. Navega a `http://localhost:3000` (o la vista de catálogo/cesta).
2. Selecciona la pieza "Jarrón de Cerámica Esmaltada Azul" (precio 45,00 €, stock disponible: 5).
3. Selecciona 3 unidades y pulsa "Añadir al carrito".
4. **Resultado esperado**: La cesta se actualiza mostrando:
   - Subtotal artículos: `135,00 €`
   - Gastos de envío estimados: `0,00 €`
   - Total global: `135,00 €`
   - Tiempo de actualización visual < 200 ms (SC-003).

---

### Escenario 2: Bloqueo de Incremento por Encima del Stock Real
1. Con un producto que tiene exactamente 2 unidades en inventario (ej. "Manta de Lana Merina").
2. Intenta subir el selector de cantidad a 3 unidades o escribir manualmente "3".
3. **Resultado esperado**:
   - El selector bloquea el valor en 2 unidades de forma inmediata (< 100 ms, SC-001).
   - Se muestra una alerta contextual en línea: `"Cantidad máxima disponible alcanzada (2 unidades)"`.

---

### Escenario 3: Persistencia Local del Visitante Anónimo
1. Con artículos en la cesta, cierra por completo la pestaña y el navegador web.
2. Vuelve a abrir el navegador en la misma máquina y accede a `http://localhost:3000`.
3. **Resultado esperado**:
   - Todos los artículos, variantes y cantidades se recuperan intactos desde `LocalStorage` (SC-002).

---

### Escenario 4: Reajuste Automático ante Compras Concurrentes
1. Mantén 3 unidades de un producto en la cesta.
2. Simula una compra concurrente de 2 unidades desde otra ventana o mediante llamada API al inventario (dejando el stock en 1).
3. Vuelve a la cesta o haz clic en cualquier control de cantidad.
4. **Resultado esperado**:
   - La cantidad se reajusta automáticamente a 1 unidad.
   - Aparece un aviso visual claro indicando: `"El artículo ha sido reajustado a 1 unidad debido a compras recientes"`.
   - Los subtotales e importes se recalculan en consecuencia.

---

### Escenario 5: Fusión de Cestas al Iniciar Sesión con Aviso de Recorte
1. Como usuario anónimo, añade 3 unidades de un producto a la cesta local.
2. Inicia sesión con una cuenta de usuario que ya tenía 2 unidades de ese mismo producto en su carrito remoto (total pretendido: 5 unidades).
3. Si el stock total disponible en inventario es de 4 unidades:
   - **Resultado esperado**:
     - Las unidades se fusionan fijándose en el tope físico de 4 unidades.
     - Se muestra una notificación destacada tras el login: `"Se ha ajustado la cantidad de 'Producto X' a 4 unidades para respetar las existencias disponibles"`.

---

### Escenario 6: Sincronización Automática de Precios de Catálogo
1. Ten un artículo guardado en la cesta con precio de 20,00 €.
2. Modifica el precio de la pieza en catálogo a 25,00 €.
3. Carga la cesta o pulsa "Tramitar pedido".
4. **Resultado esperado**:
   - El precio unitario se actualiza a 25,00 € y se recalculan subtotales.
   - Se muestra un aviso informativo de actualización de precios.

---

### Escenario 7: Cesta Vacía (Zero-State)
1. Elimina todos los artículos de la cesta o pulsa "Vaciar carrito".
2. **Resultado esperado**:
   - Mensaje visible: `"Tu cesta está vacía"`.
   - Enlace o botón destacado: `"Explorar piezas artesanales"`.
   - Botón `"Tramitar pedido"` estrictamente inhabilitado (o no interactivo).
   - Importe total en `0,00 €`.

---

## 5. Enlaces a Documentación de Diseño

- [Modelo de Datos y Estados](data-model.md)
- [Contrato de API REST (OpenAPI)](contracts/cart-api.yaml)
- [Decisiones de Arquitectura e Investigación](research.md)
- [Especificación Funcional Principal](spec.md)
