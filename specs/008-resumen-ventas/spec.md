# Feature Specification: 008 - Resumen de Ventas y Exportación de Métricas

**Feature Branch**: `008-resumen-ventas`

**Created**: 2026-10-13

**Status**: Draft

**Input**: "Como empresa me gustaría tener un resumen de ventas y productos más vendidos por periodos, además de poder exportar estos datos a un formato externo para analizarlos con calma."

**Responsable asignado**: Desarrollador 4 (Equipo: Persona 4 de 4)

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
- **Formato numérico y de moneda**: El archivo exportado codifica los valores en euros con formato estándar compatible con lectores de hojas de cálculo comunes sin corromper caracteres en español.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un panel de estadísticas de venta accesible exclusivamente por administradores.
- **FR-002**: El sistema DEBE permitir filtrar las métricas de venta por períodos predefinidos (últimos 7 días, último mes, último año) o por un rango personalizado de fechas.
- **FR-003**: El sistema DEBE calcular y presentar el total de ingresos brutos en euros (€) de pedidos pagados y entregados en el período seleccionado.
- **FR-004**: El sistema DEBE generar y presentar el listado de los productos más vendidos en el intervalo, mostrando nombre del producto, artesano, unidades vendidas y facturación asociada.
- **FR-005**: El sistema DEBE incluir una función de exportación que descargue un archivo estructurado en formato CSV con las métricas detalladas.
- **FR-006**: Todos los cálculos DEBEN computar únicamente pedidos confirmados y cobrados (excluyendo pedidos cancelados o pendientes de pago).

### Key Entities

- **Resumen de Ventas**: Agregación temporal (período, importe total en €, número de pedidos).
- **Ranking de Productos**: Lista agregada (producto, artesano, total unidades vendidas, ingresos generados en €).
- **Archivo Exportable**: Documento CSV estructurado generado a partir de la consulta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El cálculo y renderizado del cuadro de ventas se completa en menos de 1 segundo para períodos de hasta 12 meses.
- **SC-002**: La descarga del archivo CSV se inicia en menos de 2 segundos tras pulsar el botón de exportación.
- **SC-003**: El 100% de las cifras de facturación mostradas y exportadas coinciden con la suma exacta de los pedidos pagados en el período.

## Assumptions

- El formato de exportación estándar es CSV con codificación UTF-8 para garantizar máxima compatibilidad con Excel, LibreOffice y Google Sheets.
