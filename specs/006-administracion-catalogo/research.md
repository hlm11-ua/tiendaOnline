# Research & Technical Decisions: 006 - Administración de Productos y Alertas de Stock Bajo

**Feature**: `006-administracion-catalogo` | **Fecha**: 2026-10-20  
**Spec**: [spec.md](./spec.md) | **Responsable**: Desarrollador 4

Investigación técnica y consolidación de decisiones de arquitectura para la gestión del catálogo artesanal, variantes, categorías y alertas de stock conforme a la Constitución del proyecto y las clarificaciones acordadas.

---

## 1. Modelo de Datos Unificado e Integración con el Inventario Existente

### Decisión
Extender el almacén en memoria `MemoryStore` en `backend/src/models/store.js` incorporando tres colecciones interconectadas:
1. `categories`: Mapa `categoriaId` $\rightarrow$ `Categoria`.
2. `products`: Mapa `productoId` $\rightarrow$ `Producto`.
3. `variants`: Mapa `varianteId` $\rightarrow$ `Variante`.

El inventario existente (`this.inventory`) se unifica con `variants`: cada entrada de inventario corresponde biunívocamente a una `Variante`. Cuando se crea un producto y sus variantes, se registran en `this.variants` y en `this.inventory` con su `stockTotal`, asegurando que `getAvailableStock(varianteId)` refleje en tiempo real las reservas y ventas ya implementadas en el sistema.

### Rationale
- Cumple con el Principio I (*Simplicidad ante todo*): reutiliza la infraestructura reactiva y transaccional existente en `store.js` sin crear capas redundantes ni introducir una base de datos externa en la v1.
- Garantiza que cualquier venta confirmada a través de la pasarela de pago descuente el stock instantáneamente (`SC-003`) y actualice las alertas del panel administrativo sin desfases.

### Alternativas Evaluadas
- **Almacén separado e independiente para el catálogo**: Descartado porque crearía inconsistencia entre el inventario vendido en el checkout y el stock visualizado en el panel administrativo.
- **Base de datos SQLite/PostgreSQL en v1**: Descartada por violar el Principio I (sobreingeniería anticipada) y requerir dependencias de compilación nativas y migraciones.

---

## 2. Variante Obligatoria Estándar y Precio Base Compartido

### Decisión
- **Unicidad de flujo de inventario**: Todo producto registrado en el sistema debe tener al menos una variante. Si el artesano no define opciones diferenciadas (tallas, acabados o colores), el sistema crea automáticamente una variante estándar denominada `"Única"`.
- **Precio base uniforme**: Todas las variantes asociadas a un producto comparten estrictamente el `precioBase` en euros fijado en la ficha del producto.

### Rationale
- Estandariza el carrito de compra y la consulta de inventario: el checkout y las órdenes de pedido siempre apuntan a un `varianteId`, sin tener que ramificar código condicional para "productos simples sin variantes" vs "productos con variantes".
- Reduce la complejidad de la interfaz de alta y edición: el artesano solo debe fijar el precio una vez a nivel de producto.

### Alternativas Evaluadas
- **Permitir productos sin variantes con stock en el producto**: Rechazada porque duplicaría la lógica de reservas, carrito y pedidos en dos estructuras diferentes.
- **Precios independientes por variante**: Descartada en la sesión de clarificación (Opción A seleccionada) por incrementar innecesariamente la complejidad del modelo y del selector de catálogo.

---

## 3. Alertas de Stock Bajo y Reglas de Umbral

### Decisión
- **Cálculo dinámico en tiempo real**: La condición de alerta se calcula en cada consulta evaluando:
  $$\text{alertaActiva} = (\text{stockDisponible} \le \text{umbralAlerta})$$
  donde `stockDisponible` considera las unidades totales menos las reservas activas no expiradas.
- **Nivel de alerta visual**:
  - `Agotado` ($\text{stockDisponible} = 0$): Indicador rojo destacado; bloquea la compra en la tienda pública.
  - `Stock bajo` ($0 < \text{stockDisponible} \le \text{umbralAlerta}$): Indicador ámbar/naranja con badge que informa las unidades restantes.
  - `Normal` ($\text{stockDisponible} > \text{umbralAlerta}$): Sin distintivo de alerta.
- **Umbral por defecto**: Si no se especifica al crear la variante, se asigna automáticamente `3` unidades.
- **Canal de notificación**: Exclusivamente visual en el panel de control administrativo (listado de productos, vista rápida de inventario y sección de alertas). Notificaciones externas (email, SMS) formalmente fuera de alcance.

### Rationale
- Cumple con la clarificación Q2 y con el Principio I y III (*Cero alcance fantasma*).
- No requiere cron jobs, daemons ni servicios de correo SMTP externos.

### Alternativas Evaluadas
- **Notificaciones por correo electrónico al admin**: Descartada en clarificación para mantener la simplicidad y evitar la necesidad de configurar servidores de correo en v1.
- **Persistencia de alertas en base de datos**: Descartada porque el estado de alerta es derivado; calcularlo dinámicamente previene inconsistencias si el stock cambia por una devolución o cancelación.

---

## 4. Gestión de Imágenes y Validación de Carga

### Decisión
- **Formatos permitidos**: JPG/JPEG, PNG y WebP.
- **Límites estrictos**: Máximo 5 imágenes por producto, con un tamaño máximo de 5 MB por archivo.
- **Almacenamiento**:
  - El backend valida el MIME type y tamaño del archivo.
  - Para el entorno web ligero, se admiten tanto subidas procesadas en `frontend/public/uploads/` como URLs de imagen válidas (incluyendo assets locales y Data URLs para testing).
  - La primera imagen del array actúa como imagen principal (portada) en el catálogo público.

### Rationale
- Cumple con la clarificación Q5 y con el Principio IV (*Verificable por personas no técnicas*).
- Evita el uso de librerías nativas pesadas en C++ (como Sharp) manteniendo la compatibilidad nativa en Node.js puro.

### Alternativas Evaluadas
- **Almacenamiento en bucket S3 / Cloudinary**: Descartado por violar los principios de simplicidad y no requerir credenciales externas en v1.
- **Sin límite de fotos**: Descartado por riesgo de sobrecarga de memoria y degradación del rendimiento web.

---

## 5. Integridad Referencial y Reglas de Negocio

### Decisión
1. **Archivado de Categorías**:
   - Bloquear la operación si existen productos activos asociados a la categoría (`HTTP 409 Conflict`), devolviendo un mensaje explicativo en español: `"No se puede archivar la categoría porque contiene productos activos. Reasigne o descataloge los productos primero."`.
2. **Eliminación / Desactivación de Productos**:
   - Si el producto tiene pedidos asociados en el histórico (`store.orders`), se impide la eliminación física y se realiza un archivado lógico (`estado: "archivado"`), ocultándolo del catálogo público pero manteniendo su integridad histórica.
   - Si no tiene compras registradas, se permite la eliminación completa de la memoria.

### Rationale
- Cumple con la clarificación Q3 y los edge cases del pliego.
- Protege la trazabilidad de los recibos de compra y expediciones logísticas ya existentes en la plataforma.

---

## 6. Autenticación y Control de Acceso Administrativo (FR-001)

### Decisión
Implementar un middleware ligero `requireAdminRole` en `backend/src/middleware/auth.js`:
- Comprueba el encabezado `x-user-role: admin` o un token de sesión básica de administrador en las peticiones a `/api/admin/*`.
- En caso de ausencia o valor incorrecto, responde con `HTTP 403 Forbidden` y el mensaje `"Acceso restringido a usuarios con rol de administrador/empresa."`.

### Rationale
- Cumple estrictamente con FR-001 de forma comprobable en pruebas automáticas y manuales sin sobreingeniería de servidores OAuth2 o SSO en esta fase (Principio I).
