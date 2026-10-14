# Quickstart de Validación: 003 - Pago Seguro con Tarjeta y Confirmación Condicionada

**Feature**: `003-pago-tarjeta` | **Fecha**: 2026-10-14  
**Objetivo**: Proporcionar una guía paso a paso, ejecutable y comprensible por personas no técnicas (Principio IV de la Constitución), para validar de principio a fin los flujos de cobro, bloqueo de inventario, 3D Secure, persistencia condicionada y gestión de errores.

---

## 1. Prerrequisitos y Configuración

- **Entorno de ejecución**: Node.js instalado (v18 o superior).
- **Iniciar la aplicación**:
  ```bash
  npm run dev
  ```
  La aplicación estará disponible en `http://localhost:3000`.

---

## 2. Tarjetas de Prueba Predefinidas

Para permitir la verificación funcional completa en la interfaz sin requerir tarjetas de crédito reales ni vulnerar PCI-DSS, el simulador de pasarela reconoce las siguientes tarjetas de prueba:

| Escenario de Prueba | Número de Tarjeta (PAN) | Caducidad | CVV | Resultado Esperado |
|---------------------|--------------------------|-----------|-----|--------------------|
| **Éxito Directo ($\le 100\text{ \euro}$)** | `4242 4242 4242 4242` | `12/28` | `123` | Cargo autorizado de inmediato; pedido creado en estado "pagado". |
| **Éxito con 3DS ($> 100\text{ \euro}$)** | `4000 0000 0000 3000` | `12/28` | `123` | Solicita modal 3D Secure con código OTP (código válido: `1234`). |
| **Fondos Insuficientes** | `4000 0000 0000 0101` | `12/28` | `123` | Denegado por saldo insuficiente; cesta intacta, stock liberado. |
| **Tarjeta Denegada/Bloqueada**| `4000 0000 0000 0180` | `12/28` | `123` | Denegado por entidad emisora; mensaje en español; stock liberado. |
| **Error de Comunicación** | `4000 0000 0000 9999` | `12/28` | `123` | Simula corte de red con la pasarela; sin pedido ni cargo. |

---

## 3. Escenarios de Prueba de Aceptación (Paso a Paso)

### Escenario 1: Compra Directa Autorizada ($\le 100\text{ \euro}$)
1. Acceder al catálogo y añadir al carrito un artículo cuyo valor sea menor o igual a $100\text{ \euro}$ (ej. Pieza de cerámica de $45,00\text{ \euro}$).
2. Pulsar en **"Tramitar Pedido"**.
3. Comprobar que se inicia la sesión de pago y se muestra el contador regresivo de reserva de stock de **10 minutos**.
4. Rellenar los datos de contacto:
   - Nombre: `Lucía Ramos`
   - Correo electrónico: `lucia.ramos@example.es`
5. Introducir la tarjeta de éxito directo: `4242 4242 4242 4242`, fecha `12/28`, CVV `123`.
6. Pulsar **"Pagar 45,00 €"**.
7. **Resultado esperado**:
   - El botón se deshabilita tras el primer clic (evitando doble cobro).
   - En $< 1$ segundo se muestra la pantalla de confirmación.
   - Aparece el código de referencia (ej. `PED-20261014-XXXX`), los datos del comprador, los artículos y el total en euros.
   - El stock del artículo se ha reducido en 1 unidad en el catálogo.
   - El carrito activo queda completamente vacío.

---

### Escenario 2: Compra Superior a $100\text{ \euro}$ con Desafío 3D Secure
1. Añadir artículos al carrito por un importe superior a $100\text{ \euro}$ (ej. Manta artesanal de $140,00\text{ \euro}$).
2. Pulsar **"Tramitar Pedido"** e introducir los datos de contacto.
3. Introducir los datos de tarjeta: `4000 0000 0000 3000`, fecha `12/28`, CVV `123`.
4. Pulsar **"Pagar 140,00 €"**.
5. **Resultado esperado**:
   - Se abre un modal de verificación bancaria reforzada 3D Secure solicitando el código de confirmación recibido en el móvil.
   - Si se introduce un código incorrecto (ej. `0000`), el sistema muestra un mensaje de error y no autoriza el cargo.
   - Al introducir el código correcto (`1234`) y pulsar **"Confirmar Identidad"**:
     - La pasarela valida la operación.
     - Se genera el pedido en estado "pagado".
     - Se muestra la pantalla de recibo y se consolida el inventario.

---

### Escenario 3: Tarjeta Rechazada por Fondos Insuficientes
1. Con artículos en la cesta, acceder al formulario de pago.
2. Introducir la tarjeta de fondos insuficientes: `4000 0000 0000 0101`, fecha `12/28`, CVV `123`.
3. Pulsar **"Pagar"**.
4. **Resultado esperado**:
   - Aparece un mensaje claro en español: *"Operación denegada por la entidad bancaria: fondos insuficientes"*.
   - **No** se crea ningún pedido en la base de datos.
   - La reserva temporal de existencias se libera.
   - Los artículos permanecen en la cesta de compra para permitir al usuario cambiar de tarjeta o reintentar.

---

### Escenario 4: Expiración de la Reserva Temporal (10 Minutos)
1. Iniciar el proceso de checkout con un producto con solo 1 unidad disponible.
2. Comprobar que en otra pestaña o ventana de incógnito dicho producto aparece con stock 0 (bloqueado por la reserva).
3. Esperar a que el contador de la pantalla de pago llegue a 0 (o pulsar el botón de prueba rápida *"Simular expiración de 10 min"*).
4. Intentar pulsar el botón de pago.
5. **Resultado esperado**:
   - El sistema rechaza la operación con el mensaje: *"La sesión de reserva de stock ha expirado (10 minutos superados). Por favor, revisa tu cesta para continuar."*
   - En la otra pestaña, el producto vuelve a estar disponible con 1 unidad.

---

### Escenario 5: Cierre Involuntario de Navegador y Confirmación por Webhook
1. Iniciar un proceso de pago con tarjeta.
2. Tras enviar los datos a la pasarela (o durante la visualización del desafío), cerrar la pestaña del navegador para simular un cierre imprevisto.
3. Ejecutar la llamada de prueba al webhook bancario simulando la notificación de cobro exitoso:
   ```bash
   curl -X POST http://localhost:3000/api/pagos/webhook \
     -H "Content-Type: application/json" \
     -H "X-Signature: firma_segura_banco_prueba" \
     -d '{
       "transaccionId": "tx_prueba_cierre_123",
       "pasarelaRef": "RED-998877",
       "importe": 65.00,
       "estado": "autorizado",
       "sesionPagoId": "<ID_DE_SESION_ACTIVA>",
       "clienteNombre": "Carlos Mendoza",
       "clienteEmail": "carlos@example.es"
     }'
   ```
4. **Resultado esperado**:
   - El webhook responde con `HTTP 200 { "recibido": true }`.
   - El pedido se persiste desatendidamente en la base de datos con estado "pagado" y el stock se descuenta definitivamente.
   - Si se reintenta enviar la misma notificación con el mismo `transaccionId`, el sistema devuelve `HTTP 200` inmediatamente sin generar pedidos duplicados (idempotencia demostrada).
