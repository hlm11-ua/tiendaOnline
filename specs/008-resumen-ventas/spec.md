# Feature Specification: 008 - Resumen de Ventas y Exportación de Métricas

**Feature Branch**: `008-resumen-ventas`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa me gustaría tener un resumen de ventas y productos más vendidos por periodos, además de poder exportar estos datos a un formato externo para analizarlos con calma."

**Responsable asignado**: Desarrollador 4 (Equipo: Persona 4 de 4)

## Clarifications

### Session 2026-10-27

- Q: ¿Qué estado del pedido determina su inclusión en el cálculo de facturación y métricas de venta del período? (FR-003, FR-006) → A: Incluir todos los pedidos confirmados y cobrados (independientemente de si están en preparación, enviados o entregados), excluyendo cancelados o pendientes de pago.
- Q: ¿Qué nivel de detalle y estructura de datos debe contener el archivo CSV exportable? (FR-005) → A: Detalle transaccional por venta/línea de pedido con las columnas: Fecha, Nº Pedido, Producto, Artesano, Unidades e Importe en €.
- Q: ¿Bajo qué criterio de ordenación y límite de elementos debe presentarse el ranking de productos más vendidos en el cuadro de mando? (FR-004) → A: Top 5 productos ordenados por unidades vendidas desc (con desempate por mayor facturación acumulada).
- Q: ¿Qué fecha del pedido se debe utilizar como referencia para aplicar el filtro temporal del resumen de ventas? (FR-002, FR-006) → A: Fecha de confirmación del pago del pedido.
- Q: ¿Qué delimitador de columnas y codificación de caracteres debe emplear el archivo CSV para asegurar su apertura directa en hojas de cálculo en español? (Edge Cases, SC-002) → A: Delimitador punto y coma (;), coma decimal y codificación UTF-8 con BOM (óptimo para Excel es-ES).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cuadro de Mando de Ventas y Exportación Externa (Priority: P2)

Como administrador del negocio, quiero consultar un resumen visual de las ventas totales en euros (€) y el ranking de artículos más vendidos acotado por intervalos de tiempo (semanal, mensual o personalizado), y poder descargar estos datos en un archivo estructurado (CSV) para analizarlos en hojas de cálculo externas.

**Why this priority**: Proporciona inteligencia de negocio imprescindible para saber qué artesanos y productos generan mayor demanda, facilitando la toma de decisiones estratégicas y financieras.

**Independent Test**: El administrador entra a la sección "Informes de ventas" del panel, selecciona el filtro del último mes y visualiza el total de facturación en euros, el número de pedidos confirmados y el top de productos con unidades vendidas. Pulsa el botón "Exportar a CSV" y comprueba que se descarga de forma instantánea un archivo que puede abrirse en cualquier software de hojas de cálculo con las columnas de fecha, producto, unidades e importes.

**Acceptance Scenarios**:
1. **Given** un administrador en el panel de ventas, **When** selecciona un período de fechas determinado, **Then** el sistema calcula y muestra en pantalla la facturación total en euros, el recuento de pedidos pagados y la lista ordenada de productos más vendidos.
2. **Given** un resumen de ventas generado en pantalla, **When** el administrador hace clic en "Exportar datos", **Then** el sistema genera y descarga un archivo CSV con el detalle de las transacciones y productos del período.
3. **Given** un período en el que no se registraron ventas, **When** se consulta el resumen, **Then** la pantalla muestra 0,00 € y 0 pedidos sin generar errores, permitiendo descargar el archivo con cabeceras formateadas.

### Edge Cases

- **Rangos de fechas amplios**: El sistema soporta consultas de hasta 12 meses de actividad sin demoras perceptibles en la generación del resumen o del archivo descargable.
- **Formato numérico y de moneda**: El archivo exportado utiliza delimitador punto y coma (`;`), separador decimal de coma (`,`) y codificación UTF-8 con BOM, garantizando la compatibilidad nativa con Microsoft Excel y lectores de hojas de cálculo en entorno regional español (`es-ES`) sin corromper tildes ni caracteres especiales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un panel de estadísticas de venta accesible exclusivamente por administradores.
- **FR-002**: El sistema DEBE permitir filtrar las métricas de venta por períodos predefinidos (últimos 7 días, último mes, último año) o por un rango personalizado de fechas, tomando como criterio temporal la fecha de confirmación del cobro del pedido.
- **FR-003**: El sistema DEBE calcular y presentar el total de ingresos brutos en euros (€) de pedidos confirmados y cobrados en el período seleccionado, independientemente de su estado logístico de entrega.
- **FR-004**: El sistema DEBE generar y presentar el ranking de los 5 productos más vendidos (Top 5) en el intervalo, ordenados por unidades vendidas de forma descendente (con desempate por mayor facturación asociada) y mostrando: nombre del producto, artesano, unidades vendidas y facturación total en euros (€).
- **FR-005**: El sistema DEBE incluir una función de exportación que descargue un archivo CSV con el detalle transaccional de ventas del período, incluyendo las columnas: Fecha, Nº Pedido, Producto, Artesano, Unidades e Importe total en €.
- **FR-006**: Todos los cálculos DEBEN computar únicamente pedidos confirmados y cobrados (excluyendo pedidos cancelados o pendientes de pago, e independientemente de si están en preparación, enviados o entregados).

### Key Entities

- **Resumen de Ventas**: Agregación temporal (período, importe total en €, número de pedidos).
- **Ranking de Productos**: Lista agregada Top 5 (producto, artesano, total unidades vendidas, ingresos generados en €), ordenada por unidades vendidas descendente.
- **Archivo Exportable**: Documento CSV transaccional generado a partir de la consulta, con columnas de Fecha, Nº Pedido, Producto, Artesano, Unidades e Importe total en €.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El cálculo y renderizado del cuadro de ventas se completa en menos de 1 segundo para períodos de hasta 12 meses.
- **SC-002**: La descarga del archivo CSV se inicia en menos de 2 segundos tras pulsar el botón de exportación.
- **SC-003**: El 100% de las cifras de facturación mostradas y exportadas coinciden con la suma exacta de los pedidos pagados en el período.

## Assumptions

- El formato de exportación estándar es CSV con delimitador punto y coma (`;`), separador decimal de coma (`,`) y codificación UTF-8 con BOM para garantizar máxima compatibilidad con Excel, LibreOffice y Google Sheets en español.
