# Data Model: 008 - Resumen de Ventas y Exportación de Métricas

**Feature**: `008-resumen-ventas` | **Fecha**: 2026-10-27  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Define las entidades, estructuras de datos, tipos, relaciones y reglas de validación para las consultas de estadísticas de venta, ranking de productos y exportación estructurada en CSV.

---

## 1. Entidades y Estructuras de Datos

### Entidad: Consulta de Ventas (`SalesReportQuery`)

Parámetros admitidos para filtrar el resumen de métricas y la exportación de transacciones:

```typescript
type TipoPeriodo = '7_dias' | '30_dias' | '1_ano' | 'personalizado';

interface SalesReportQuery {
  periodo: TipoPeriodo;         // Período de consulta predefinido o personalizado
  fechaInicio?: string | null;  // Fecha de inicio (YYYY-MM-DD), obligatoria si periodo = 'personalizado'
  fechaFin?: string | null;     // Fecha de fin (YYYY-MM-DD), obligatoria si periodo = 'personalizado'
}
```

---

### Entidad: Resumen Global de Ventas (`SalesReportSummary`)

Consolidación agregada de las ventas del intervalo consultado:

```typescript
interface SalesReportSummary {
  periodoEtiqueta: string;      // Ej: "Últimos 7 días", "Último mes", "01/10/2026 a 15/10/2026"
  fechaInicio: string;          // Timestamp ISO del inicio del intervalo evaluado
  fechaFin: string;             // Timestamp ISO del fin del intervalo evaluado
  facturacionTotal: number;     // Suma total en euros (€) de pedidos cobrados con 2 decimales (ej: 1450.50)
  facturacionFormateada: string;// Cadena formateada para la UI (ej: "1.450,50 €")
  recuentoPedidos: number;      // Número total de pedidos confirmados y cobrados en el intervalo
  fechaGeneracion: string;      // Timestamp ISO en el que se calculó el informe
}
```

---

### Entidad: Elemento del Ranking Top 5 (`ProductRankingItem`)

Representa una posición dentro del listado ordenado de los 5 artículos con mayor demanda:

```typescript
interface ProductRankingItem {
  posicion: number;             // Puesto en el ranking (1 a 5)
  productoId: string;           // Identificador del producto (ej: "art-001")
  titulo: string;               // Nombre comercial del producto (ej: "Jarrón de Cerámica Esmaltada")
  artesano: string;             // Taller o artesano creador (ej: "Taller Hermanos Alfareros")
  unidadesVendidas: number;     // Total de unidades compradas en pedidos cobrados
  facturacionTotal: number;     // Importe bruto total generado en euros (€)
  facturacionFormateada: string;// Cadena formateada (ej: "225,00 €")
}
```

---

### Entidad: Detalle Transaccional de Venta (`SalesTransactionDetail`)

Estructura de cada registro/fila exportado en el archivo CSV:

```typescript
interface SalesTransactionDetail {
  fecha: string;                // Fecha de cobro en formato legible español (YYYY-MM-DD)
  codigoPedido: string;         // Código de referencia (ej: "PED-20261014-A1B2")
  producto: string;             // Título del artículo vendido
  artesano: string;             // Nombre del artesano responsable
  unidades: number;             // Cantidad vendida en la línea
  importe: number;              // Importe total de la línea en euros (subtotal)
  importeFormateado: string;    // Formato con coma decimal (ej: "45,00 €")
}
```

---

### Entidad: Respuesta API del Cuadro de Mando (`SalesReportResponse`)

Cuerpo devuelto por el endpoint `GET /api/admin/ventas/resumen`:

```typescript
interface SalesReportResponse {
  resumen: SalesReportSummary;
  rankingTop5: ProductRankingItem[];
}
```

---

## 2. Especificación del Archivo Exportable (CSV)

| Propiedad | Valor / Regla |
|---|---|
| **Formato de Archivo** | Archivo de texto plano delimitado (.csv) |
| **Codificación** | UTF-8 con BOM (`\uFEFF`) para detección nativa en Microsoft Excel |
| **Separador de Columnas** | Punto y coma (`;`) |
| **Separador Decimal** | Coma (`,`) según norma `es-ES` |
| **Cabecera** | `Fecha;Nº Pedido;Producto;Artesano;Unidades;Importe (€)` |
| **Ejemplo de Fila** | `2026-10-14;PED-20261014-9988;Jarrón de Cerámica Azul;Taller Hermanos Alfareros;2;90,00 €` |
| **Comportamiento sin Ventas** | Emisión exclusiva de la fila de cabecera formateada sin filas de datos |

---

## 3. Reglas de Validación de Dominio

1. **Condición de Inclusión de Pedidos (FR-003, FR-006)**:
   - Un pedido se computa si y solo si su estado pertenece a:
     `['pagado', 'en_preparacion', 'salido_tienda', 'entregado']`.
   - Se excluyen estrictamente los pedidos en estado `'pendiente'` y los cancelados.
2. **Criterio de Imputación Temporal (FR-002, Clarificación Q4)**:
   - Se evalúa la fecha de formalización del cobro (`fechaCreacion` del pedido cobrado).
   - Para rangos predefinidos:
     - `7_dias`: desde `ahora - 7 días` a las 00:00:00 hasta la fecha y hora de la consulta.
     - `30_dias`: desde `ahora - 30 días` a las 00:00:00 hasta la fecha y hora de la consulta.
     - `1_ano`: desde `ahora - 365 días` a las 00:00:00 hasta la fecha y hora de la consulta.
   - Para rango `personalizado`:
     - Debe recibir `fechaInicio` y `fechaFin` en formato `YYYY-MM-DD`.
     - `fechaInicio` debe ser anterior o igual a `fechaFin` (`fechaInicio <= fechaFin`).
     - El rango abarca desde las 00:00:00.000 de `fechaInicio` hasta las 23:59:59.999 de `fechaFin`.
3. **Ordenación y Límite del Ranking Top 5 (FR-004, Clarificación Q3)**:
   - Agrupación por `productoId`.
   - Orden primario: `unidadesVendidas` descendente.
   - Orden secundario (desempate): `facturacionTotal` descendente.
   - Truncamiento estricto a los primeros 5 elementos (`max: 5`).
4. **Formato Monetario (Constitución Principio II)**:
   - Toda cifra económica expresada en euros con símbolo `€`, redondeo a dos decimales y formateo con coma decimal en la presentación e informe exportado.
