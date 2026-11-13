# Guía de Validación Rápida: 004 - Cuentas de Usuario y Seguimiento de Fases

**Feature**: `004-cuentas-seguimiento`  
**Referencia de Contratos**: [cuentas-seguimiento-api.yaml](./contracts/cuentas-seguimiento-api.yaml)  
**Modelo de Datos**: [data-model.md](./data-model.md)  
**Especificación**: [spec.md](./spec.md)  

---

## Prerrequisitos

- Node.js instalado (v18 o superior).
- Repositorio clonado en la rama correspondiente.
- Servidor ejecutándose en el puerto 3000:
  ```bash
  npm start
  ```
- Navegador web moderno o herramienta de peticiones HTTP (curl / Postman).

### Cuenta de administrador precargada

El sistema siembra automáticamente al arrancar una cuenta de administrador de demostración para poder
gestionar las fases de los pedidos (FR-006, FR-007) sin depender de un alta pública de administradores
(fuera de alcance, Principio III):

- **Correo electrónico**: `admin@gmail.com`
- **Contraseña**: `admin1234` (almacenada hasheada con scrypt + salt, nunca en texto plano)

Los valores por defecto pueden sobrescribirse mediante las variables de entorno `ADMIN_EMAIL` y
`ADMIN_PASSWORD` antes de arrancar el servidor. Puede iniciar sesión con estas credenciales desde
`http://localhost:3000/cuenta` (pestaña "Iniciar sesión"); con la sesión activa, las peticiones de
cambio de fase a `PUT /api/pedidos/:codigoReferencia/fase` se autorizan con el token `Bearer`
(autorización dual compatible con la cabecera `x-user-role: admin` usada en los tests).

---

## Escenarios de Validación End-to-End

### Escenario 1: Registro de nuevo usuario y sesión persistente (FR-001, FR-002, SC-001, SC-002)

1. Abrir en el navegador la URL `http://localhost:3000/cuenta` (o `http://localhost:3000/public/cuenta.html`).
2. En la pestaña de **Registro**, completar los campos:
   - **Nombre**: `Elena Artesana`
   - **Correo electrónico**: `elena@artesania.es`
   - **Contraseña**: `artesania2026` (≥ 8 caracteres)
3. Pulsar en **Crear cuenta**.
4. **Resultado esperado**:
   - La cuenta se crea en menos de 40 segundos (SC-001).
   - El sistema inicia sesión automáticamente y redirige al panel privado de "Mis compras".
   - En la cabecera se muestra "Bienvenida, Elena Artesana".
   - El token de sesión queda guardado en `localStorage` con vigencia de 30 días.
5. Cerrar la pestaña del navegador, abrir una nueva ventana y volver a entrar a `http://localhost:3000/cuenta`.
6. **Resultado esperado**: La sesión continúa abierta automáticamente sin solicitar credenciales (SC-002).

---

### Escenario 2: Validación de contraseñas cortas y correos duplicados (Casos Extremos)

1. Con la sesión cerrada, intentar registrarse con:
   - **Nombre**: `Carlos Prueba`
   - **Email**: `carlos@ejemplo.es`
   - **Contraseña**: `12345` (5 caracteres, < 8 requeridos)
2. **Resultado esperado**: El sistema muestra el mensaje de error: *"La contraseña debe tener al menos 8 caracteres"*, bloqueando el registro.
3. Corregir la contraseña a `passwordSegura1` pero usar el correo ya registrado `elena@artesania.es`.
4. **Resultado esperado**: El sistema muestra: *"El correo electrónico ya se encuentra registrado"* y ofrece el enlace para iniciar sesión.

---

### Escenario 3: Historial de compras y visualización de las 4 fases de pedido (FR-003, FR-004, FR-005, SC-003)

1. Iniciar sesión con la cuenta de `elena@artesania.es`.
2. Si el usuario aún no tiene compras, confirmar que la sección muestra el estado vacío amigable con enlace al catálogo.
3. Realizar una compra desde `/checkout` asociando el email `elena@artesania.es` (o con sesión iniciada pasando la cuentaId).
4. Acceder nuevamente a la sección de **"Mis compras"**.
5. **Resultado esperado**:
   - Aparece el pedido en la lista cronológica con su código de referencia (ej. `PED-XXXXXXXX`), fecha, total en euros (`€`) y número de piezas.
   - Al pulsar sobre el pedido, se despliega el trazador gráfico con las 4 fases oficiales:
     - ⏳ **Pendiente**
     - ✅ **Pagado** (marcada como fase actual)
     - ⚪ **Salido de la tienda**
     - ⚪ **Entregado**

---

### Escenario 4: Despacho manual por Administrador y visualización del código de seguimiento (FR-006, FR-007)

1. Como empleado/administrador, actualizar la fase del pedido a "salido de la tienda" mediante la API administrativa:
   ```bash
   curl -X PUT http://localhost:3000/api/pedidos/PED-XXXXXXXX/fase \
     -H "Content-Type: application/json" \
     -H "x-user-role: admin" \
     -d '{
       "fase": "salido de la tienda",
       "transportista": "Correos de España",
       "numeroSeguimiento": "CORREOS-ES-123456"
     }'
   ```
2. Volver a la vista del cliente en **"Mis compras"** y refrescar o abrir el detalle del pedido.
3. **Resultado esperado**:
   - La fase 3 ("Salido de la tienda") aparece activa visualmente.
   - Se muestra de forma prominente el código de seguimiento registrado: `CORREOS-ES-123456` y la empresa transportista `Correos de España`.
4. Transicionar a "entregado" como administrador:
   ```bash
   curl -X PUT http://localhost:3000/api/pedidos/PED-XXXXXXXX/fase \
     -H "Content-Type: application/json" \
     -H "x-user-role: admin" \
     -d '{"fase": "entregado"}'
   ```
5. **Resultado esperado**: La fase 4 ("Entregado") queda marcada como completada y el código de seguimiento sigue visible para el cliente.

---

### Escenario 5: Prevención de acceso indebido a pedidos ajenos - IDOR (Edge Case 2)

1. Crear un segundo usuario: `comprador2@artesania.es` e iniciar sesión con su cuenta.
2. Intentar consultar directamente por API el pedido del primer usuario:
   ```bash
   curl -X GET http://localhost:3000/api/pedidos/mis-compras/PED-DE-ELENA \
     -H "Authorization: Bearer <TOKEN_DE_COMPRADOR_2>"
   ```
3. **Resultado esperado**:
   - El servidor devuelve código de estado `403 Forbidden` (o `404 Not Found`) con mensaje *"No tiene permiso para acceder a este pedido"*.
   - El comprador 2 no puede visualizar bajo ninguna circunstancia compras de otros clientes manipulando identificadores en la URL.

---

## Verificación Automatizada

Para ejecutar los tests de integración y contratos correspondientes a esta feature:
```bash
node --test tests/contract/cuentas-seguimiento-api.test.js tests/integration/cuentas-seguimiento-flow.test.js
```
