# Research & Technical Decisions: 008 - Resumen de Ventas y Exportación de Métricas

**Feature**: `008-resumen-ventas` | **Fecha**: 2026-10-27  
**Spec**: [spec.md](./spec.md) | **Responsable**: Desarrollador 4 (Equipo: Persona 4 de 4)

Investigación técnica y consolidación de decisiones de arquitectura para la agregación de métricas de facturación, ranking de productos más vendidos y exportación estructurada en CSV conforme a la Constitución del proyecto.

---

## 1. Arquitectura de Agregación y Cálculo en Memoria

### Decisión
Implementar un servicio desacoplado `sales-report.service.js` que realiza las agregaciones de ventas en tiempo de consulta sobre la colección de pedidos confirmados y cobrados de `store.js`.

### Rationale
- **Rendimiento predecible**: Para el volumen de datos de un taller artesanal (cientos o miles de transacciones de hasta 12 meses), las operaciones de filtrado funcional y reducción en memoria se ejecutan en $< 20$ milisegundos, superando ampliamente el criterio de éxito **SC-001** ($< 1$ segundo).
- **Simplicidad arquitectónica (Principio I)**: No introduce motores analíticos pesados (OLAP, Elasticsearch, BI externo) ni dependencias innecesarias de bases de datos relacionales en la v1.
- **Consistencia reactiva inmediata**: Cualquier nuevo pedido cobrado en la pasarela o pedido en preparación en el taller se refleja de forma instantánea en el siguiente refresco del cuadro de mando sin retrasos de sincronización ETL.

### Alternativas Evaluadas
- **Tablas de agregación precalculadas con disparadores en checkout**: Descartada por complejidad innecesaria en la gestión de estados y potencial desincronización si se cancelan o modifican pedidos.
- **Motor analítico externo o almacén SQL dedicado**: Rechazada por violar el Principio I (Simplicidad ante todo) y Principio V (complejidad de credenciales e infraestructura para v1).

---

## 2. Formato y Codificación del Archivo CSV Exportable

### Decisión
Generar el archivo CSV directamente en memoria con:
- Delimitador de columnas: punto y coma (`;`).
- Separador decimal: coma (`,`) para importes en euros (`XX,XX €`).
- Codificación: UTF-8 con marca de orden de bytes (BOM: `\uFEFF`).
- Cabecera estandarizada en español: `Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)`.
- Filas con detalle transaccional por cada venta/línea de pedido perteneciente al período.
- Descarga directa con cabeceras HTTP:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="resumen-ventas-[periodo].csv"`

### Rationale
- **Alineación con el mercado e idioma (Principio II)**: En la configuración regional de España (`es-ES`), Microsoft Excel y LibreOffice utilizan el punto y coma como separador nativo de columnas, ya que la coma se utiliza para los decimales de moneda.
- **Verificable por usuarios no técnicos (Principio IV)**: La inclusión de UTF-8 BOM permite que cualquier evaluador o gestor de negocio abra el archivo con un simple doble clic en Excel en Windows sin caracteres corruptos en las tildes ("Jarrón", "Cerámica") ni en la "ñ" ("Alfarería de Doña Ana") ni en el símbolo `€`.
- **Rendimiento (SC-002)**: La serialización directa a cadena CSV en memoria de un período de 12 meses tarda menos de 15 ms, garantizando una descarga instantánea ($< 2$ segundos).

### Alternativas Evaluadas
- **CSV estándar RFC 4180 con comas `,` y puntos decimales `.`**: Rechazada porque al abrirse directamente en Excel en sistemas en español, todos los datos se agrupan en una única columna.
- **Exportación en formato binario Excel (`.xlsx`)**: Rechazada por requerir librerías pesadas (`exceljs`, `xlsx`) con decenas de dependencias transitivas, cuando un CSV bien formateado con BOM satisface el 100% de la necesidad analítica en hojas de cálculo externas.

---

## 3. Criterio de Selección Temporal y Filtrado de Estados de Pedido

### Decisión
- **Estados incluidos**: Pedidos confirmados y cobrados, correspondientes a los estados:
  `['pagado', 'en_preparacion', 'salido_tienda', 'entregado']`.
- **Estados excluidos**: Pedidos pendientes de pago (`'pendiente'`) o cancelados/expirados.
- **Timestamp de referencia**: La fecha y hora de formalización y cobro del pedido (`fechaCreacion` / cobro).
- **Rangos temporales admitidos**:
  1. `7_dias`: últimos 7 días naturales (desde hace 7 días a las 00:00:00 hasta la hora actual).
  2. `30_dias`: últimos 30 días naturales (último mes estándar).
  3. `1_ano`: últimos 365 días (último año de actividad).
  4. `personalizado`: rango acotado entre `fechaInicio` (00:00:00) y `fechaFin` (23:59:59.999).

### Rationale
- Cumple rigurosamente con las clarificaciones aprobadas en la sesión del 2026-10-27 (Q1 y Q4).
- Evita discrepancias contables en cierres de mes donde un pedido ha sido cobrado pero la mensajería aún no lo ha entregado.

### Alternativas Evaluadas
- **Filtrado por fecha de entrega**: Rechazada porque distorsionaría la facturación económica del negocio al aplazar el cómputo de ventas ya cobradas.

---

## 4. Algoritmo de Ranking de Productos más Vendidos (Top 5)

### Decisión
1. Iterar sobre las líneas de pedido (`lineas`) de los pedidos seleccionados en el período.
2. Agrupar por identificador único de producto (`productoId`).
3. Calcular acumulados: `unidadesVendidas = sum(cantidad)` y `facturacionTotal = sum(subtotal)`.
4. Obtener título del producto y nombre del artesano creador a partir de la entidad `Producto` en el catálogo.
5. Ordenar el listado según:
   - Criterio primario: `unidadesVendidas` descendente.
   - Criterio de desempate: `facturacionTotal` descendente.
6. Aplicar truncamiento al Top 5 (`slice(0, 5)`).

### Rationale
- Cumple con la clarificación Q3 y el requisito **FR-004**.
- Mantiene la vista en pantalla limpia y sintetizada en la v1 (Principio I: Simplicidad ante todo), facilitando la lectura ejecutiva sin necesidad de paginaciones complejas en el panel.

---

## 5. Control de Acceso y Modelo de Seguridad (Principio V)

### Decisión
- Endpoint protegido bajo `/api/admin/ventas/*` exigiendo la cabecera `x-user-role: admin` (o autenticación de sesión de administrador mediante `middleware/auth.js`).
- Peticiones sin permisos de administrador devolverán código de estado `403 Prohibido` con mensaje en español: `"Acceso denegado: se requieren permisos de administrador."`.

### Rationale
- Cumple con el requisito **FR-001** salvaguardando las cifras de facturación y datos estratégicos del negocio frente a accesos anónimos o clientes habituales.
