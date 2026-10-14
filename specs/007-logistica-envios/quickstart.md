# Quickstart de Validación: 007 - Procesamiento Logístico y Notificación de Envío

**Feature**: `007-logistica-envios` | **Fecha**: 2026-10-14  
**Objetivo**: Proporcionar una guía de validación paso a paso, observable y comprensible por personas no técnicas (Principio IV de la Constitución), para comprobar de principio a fin el empaquetado, la asignación de transportista y seguimiento, los avisos automáticos y la entrega.

---

## 1. Prerrequisitos y Arranque

- **Entorno**: Node.js instalado (v18 o superior).
- **Iniciar la aplicación**:
  ```bash
  npm run dev
  ```
- **Acceso a la interfaz**:
  - Panel de Control Logístico / Taller: `http://localhost:3000/logistica.html` (o pestaña "Logística de Envíos").
  - Pantalla de Seguimiento de Pedidos del Cliente: `http://localhost:3000/seguimiento.html` (o consulta por código de referencia).

---

## 2. Escenarios de Prueba de Aceptación (Paso a Paso)

### Escenario 1: Preparación y Empaquetado en el Taller
1. Acceder al panel logístico en `http://localhost:3000/logistica.html`.
2. Localizar en la pestaña de **"Pendientes de Preparación"** un pedido en estado `pagado` (ej. `PED-20261014-XXXX`).
3. Pulsar el botón **"📦 Iniciar Preparación / Empaquetar"**.
4. **Resultado esperado**:
   - El pedido transiciona de forma inmediata al estado **"En preparación"**.
   - El pedido se traslada a la sección de empaquetado activo.
   - En la consulta del pedido del cliente se observa el badge *"En preparación en el taller artesanal"*.

---

### Escenario 2: Despacho con Transportista, Código de Seguimiento y Aviso Automático
1. En el panel logístico, localizar el pedido que se encuentra **"En preparación"**.
2. Pulsar el botón **"🚚 Despachar Envío"**.
3. Se abre el formulario de expedición:
   - Seleccionar la empresa de transporte en el desplegable: `Correos de España`.
   - Introducir el número de seguimiento: `CORREOS-ES-998877`.
   - (Opcional) Notas de embalaje: `Protección reforzada con papel kraft`.
4. Pulsar **"Confirmar y Notificar Salida"**.
5. **Resultado esperado**:
   - En $< 1$ segundo el pedido pasa al estado oficial **"Salido de la tienda"**.
   - Se muestra un aviso de éxito en pantalla confirmando la expedición.
   - Se genera de forma automática el correo de notificación al cliente (observable en la pestaña *"Avisos Emitidos"* con asunto, destinatario y código de tracking).
   - En la vista del cliente se visualiza el transportista y el código de seguimiento con enlace simulado.

---

### Escenario 3: Rechazo de Despacho sin Transportista o con Código Inválido
1. En un pedido en preparación, pulsar **"🚚 Despachar Envío"**.
2. Dejar el código de seguimiento en blanco o escribir únicamente dos caracteres (ej. `12`).
3. Intentar pulsar **"Confirmar y Notificar Salida"**.
4. **Resultado esperado**:
   - El sistema bloquea el envío y muestra un mensaje claro en español:
     *"El número de seguimiento debe tener entre 6 y 32 caracteres alfanuméricos."*
   - El pedido **no** cambia de estado y permanece en preparación.
   - No se emite ninguna notificación falsa al cliente.

---

### Escenario 4: Rectificación de Errata en el Código de Seguimiento
1. En un pedido que ya está en estado **"Salido de la tienda"**, pulsar el botón de opciones **"✏️ Rectificar Tracking"**.
2. Modificar el código anterior por el correcto: `CORREOS-ES-998888` e indicar motivo: `Sustitución por etiqueta dañada`.
3. Guardar el cambio.
4. **Resultado esperado**:
   - El número de seguimiento se actualiza en el pedido.
   - Se genera automáticamente un segundo aviso de tipo *"Rectificación de Envío"* para el cliente.
   - El historial del pedido refleja la corrección sin alterar el estado operativo.

---

### Escenario 5: Confirmación de Entrega Definitiva (Doble Vía)
1. Con el pedido en estado **"Salido de la tienda"**:
   - **Vía A (Cliente)**: Acceder a la pantalla de seguimiento del cliente e interactuar con el botón **"✅ He recibido mi pedido"**.
   - **Vía B (Administrador)**: En el panel de taller, pulsar el botón **"🎉 Marcar como Entregado"**.
2. **Resultado esperado**:
   - El pedido transiciona al estado final **"Entregado"**.
   - Queda registrada la fecha y hora de entrega.
   - El ciclo de vida del pedido concluye satisfactoriamente.
