# Quickstart de Validación: 008 - Resumen de Ventas y Exportación de Métricas

**Feature**: `008-resumen-ventas` | **Fecha**: 2026-10-27  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contrato OpenAPI**: [contracts/ventas-admin-api.yaml](./contracts/ventas-admin-api.yaml)

Guía de validación funcional y técnica paso a paso, observable por personas no técnicas (Principio IV de la Constitución), para comprobar de principio a fin el cuadro de mando de ventas, el ranking de productos más vendidos y la exportación de transacciones en CSV.

---

## 1. Prerrequisitos y Arranque

1. **Entorno**: Node.js instalado (v18 o superior).
2. **Iniciar la aplicación**:
   ```bash
   npm start
   # o en modo desarrollo:
   npm run dev
   ```
3. **Acceso a la interfaz**:
   - Panel de Informes de Ventas: `http://localhost:3000/admin/ventas.html` (o mediante el enlace "📊 Informes de Ventas" en la barra de navegación del panel de administración).

---

## 2. Escenarios de Prueba de Aceptación (Paso a Paso)

### Escenario 1: Consulta del Cuadro de Mando por Período Predefinido (Último Mes)

1. Acceder a `http://localhost:3000/admin/ventas.html`.
2. En el selector de períodos, seleccionar la opción **"Último mes (30 días)"**.
3. **Resultado esperado**:
   - En $< 1$ segundo (**SC-001**), la pantalla muestra las tarjetas de métricas consolidadas:
     - **Facturación total**: Importe exacto en euros (€) con separador decimal en coma (ej: `1.245,50 €`).
     - **Pedidos confirmados**: Número total de compras cobradas en el intervalo (ej: `12`).
   - El 100% de la facturación mostrada coincide con la suma contable de los pedidos pagados del período (**SC-003**).

---

### Escenario 2: Verificación del Ranking Top 5 de Artículos Más Vendidos

1. En la misma pantalla del informe de ventas, observar la tabla **"Ranking de Productos Más Vendidos"**.
2. **Resultado esperado**:
   - Se muestran como máximo 5 artículos ordenados de mayor a menor número de unidades vendidas (**FR-004**).
   - En caso de empate en unidades entre dos productos, aparece primero aquel con mayor importe facturado.
   - Cada fila detalla:
     - Posición (1 a 5 con distintivo visual).
     - Nombre del producto.
     - Nombre del artesano responsable.
     - Unidades vendidas.
     - Facturación asociada en euros (€).

---

### Escenario 3: Filtrado por Rango Personalizado de Fechas

1. En el selector de período, marcar la opción **"Personalizado"**.
2. Introducir una fecha de inicio (ej. `2026-10-01`) y una fecha de fin (ej. `2026-10-15`).
3. Pulsar el botón **"Actualizar Informe"**.
4. **Resultado esperado**:
   - El sistema valida el rango y recalcula al instante las tarjetas de totales y el Top 5.
   - Solo se computan los pedidos cuya fecha de cobro esté comprendida entre el inicio y el fin especificados (**FR-002**).

---

### Escenario 4: Descarga y Verificación del Archivo CSV Exportable

1. Con el período deseado seleccionado en pantalla, hacer clic en el botón **"📥 Exportar a CSV"**.
2. **Resultado esperado**:
   - La descarga del archivo se inicia en menos de 2 segundos (**SC-002**).
   - El archivo se descarga con un nombre descriptivo (ej: `resumen-ventas-30_dias.csv`).
   - Al abrir el archivo con doble clic en Microsoft Excel o LibreOffice Calc en español:
     - Las columnas se abren correctamente separadas por punto y coma (`;`).
     - Los importes tienen formato estándar con coma decimal (`,`) y símbolo `€`.
     - No existen caracteres corrompidos en tildes, eñes ni nombres de artesanos (gracias a UTF-8 BOM).
     - Las columnas de cabecera son: `Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)`.
     - Cada fila corresponde a una transacción real de venta del período.

---

### Escenario 5: Consulta y Exportación de un Período sin Ventas

1. En el selector de fechas personalizado, elegir un rango futuro o un período en el que no existan pedidos registrados (ej. del año 2020).
2. Pulsar **"Actualizar Informe"**.
3. **Resultado esperado**:
   - El panel muestra `0,00 €` en facturación total y `0` en recuento de pedidos sin arrojar ningún error en consola ni pantalla.
   - La tabla de productos más vendidos muestra el estado vacío informativo: *"No se registraron ventas en el período seleccionado."*.
   - Al pulsar **"📥 Exportar a CSV"**, se descarga un archivo CSV con la fila de cabeceras formateada correctamente y sin filas de datos.

---

### Escenario 6: Control de Acceso por Rol de Usuario (Seguridad)

1. Realizar una petición directa a la API de ventas sin la cabecera de rol de administrador:
   ```bash
   curl -i http://localhost:3000/api/admin/ventas/resumen -H "x-user-role: cliente"
   ```
2. **Resultado esperado**:
   - El servidor deniega la respuesta con código HTTP `403 Forbidden` (**FR-001**).
   - La respuesta contiene el mensaje: `"Acceso denegado: se requieren permisos de administrador."`.
