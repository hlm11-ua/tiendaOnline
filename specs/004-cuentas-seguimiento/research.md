# Research: 004 - Cuentas de Usuario y Seguimiento de Fases de Pedido

**Feature**: `004-cuentas-seguimiento`  
**Date**: 2026-11-09  
**Status**: Completed  

---

## Decision 1: Mecanismo de Autenticación y Hash de Contraseñas

- **Decision**: Utilizar las funciones nativas de Node.js `node:crypto.scryptSync` y `node:crypto.randomBytes` para la generación de sal (`salt`) criptográfica aleatoria de 16 bytes y el hash de la contraseña derivado a 64 bytes. El almacenamiento se realiza en el formato `salt:hash`. La validación de entrada exige una longitud mínima de 8 caracteres sin restricciones adicionales de caracteres especiales (según la clarificación formal del 2026-11-09).
- **Rationale**: 
  - Cumple estrictamente el **Principio I (Simplicidad ante todo)** al no introducir dependencias externas de npm (como `bcrypt` o `argon2`) que requieren compiladores nativos C++ en el entorno host.
  - Satisface el **Principio V (Respeto por los datos del usuario)** al no persistir contraseñas en texto plano y aplicar derivación de claves computacionalmente resistente.
  - Ofrece determinismo total para pruebas automatizadas y despliegue rápido.
- **Alternatives considered**:
  - `bcrypt`: Descartado por requerir binarios dependientes de la plataforma y tiempo extra de compilación/instalación.
  - `argon2`: Descartado por añadir dependencias pesadas no justificadas para la escala del taller.
  - Almacenamiento en texto plano o SHA-256 simple: Descartado por vulnerabilidad crítica de seguridad y violación del Principio V.

---

## Decision 2: Gestión de Sesión Persistente (30 días)

- **Decision**: Generar tokens de sesión opacos y aleatorios de 32 bytes en hexadecimal (`crypto.randomBytes(32).toString('hex')`) asociados a la cuenta del usuario en memoria (`store.sessions`). Cada sesión registra `id`, `cuentaId`, `createdAt`, `expiresAt` (30 días a partir de la creación o último acceso, renovable con actividad) y `activo: true`. El token se devuelve en la cabecera/cuerpo HTTP al autenticarse o registrarse, y el frontend lo almacena en `localStorage` (`tienda_online_session_token`) para conservarlo entre cierres y aperturas del navegador. El cliente lo envía en la cabecera `Authorization: Bearer <token>` o `X-Session-Token`.
- **Rationale**:
  - Responde de forma exacta a **SC-002** y **FR-002** (persistencia de 30 días tras reinicio de navegador).
  - Al ser tokens gestionados en el almacén del servidor, el cierre de sesión (`logout`) es inmediato y atómico (invalida el registro en servidor), a diferencia de tokens puramente desconectados.
  - Compatible con pruebas de contrato HTTP nativas sin lidiar con políticas de cookies complejas entre dominios o puertos locales.
- **Alternatives considered**:
  - JWT (JSON Web Tokens): Descartado porque no aporta ventajas en una aplicación monolítica con almacén en memoria y añade complejidad para implementar revocación atómica en el logout.
  - Cookies de sesión efímeras (`Session cookie` sin `Max-Age`): Descartadas porque se eliminan al cerrar el navegador, incumpliendo SC-002.

---

## Decision 3: Integración con el Modelo de Datos Existente y Reutilización de `Order`

- **Decision**: Reutilizar el campo `cuentaId` que ya se encuentra presente en el constructor de la clase `Order` (`backend/src/models/order.model.js`) y en el flujo de formalización de pedidos (`backend/src/services/order.service.js` y `backend/src/controllers/checkout.controller.js`). Al consultar "Mis compras", el servicio filtra los pedidos donde `order.cuentaId === req.user.id`, con un fallback de conveniencia para asociar pedidos previos huérfanos donde `order.clienteEmail.toLowerCase() === req.user.email.toLowerCase()`.
- **Rationale**:
  - Consistencia arquitectónica absoluta con Feature 003 (Checkout y Pago con Tarjeta).
  - Evita duplicar modelos o crear tablas puente innecesarias (Principio I).
  - Previene conflictos entre historias de usuario al respetar la interfaz ya preparada en el código base.
- **Alternatives considered**:
  - Crear una colección separada de relación `UsuarioPedidos`: Descartada por sobreingeniería.
  - Modificar la firma de `Order`: Innecesario, ya que `cuentaId` fue contemplado originalmente.

---

## Decision 4: Transición Manual de Fases por el Administrador (FR-005, FR-006, FR-007)

- **Decision**: Exponer el endpoint administrativo `PUT /api/pedidos/:codigoReferencia/fase` protegido por el middleware de rol de administrador (`requireAdminRole` existente en `backend/src/middleware/auth.js`). El endpoint permite transicionar entre las 4 fases oficiales:
  1. `pendiente`
  2. `pagado`
  3. `salido de la tienda` (en este caso, requiere el campo `numeroSeguimiento` si el pedido no lo tuviera asignado)
  4. `entregado`
  Para el tracking, se reutiliza la estructura `envio` y las validaciones de `DatosExpedicion` (longitud entre 6 y 32 caracteres) de `backend/src/models/shipment.model.js`.
- **Rationale**:
  - Cumple directamente con los acuerdos de la clarificación formal: el cambio de fase es manual por parte del administrador y el código de seguimiento se introduce al pasar a "salido de la tienda".
  - Reutiliza la constante existente `CONSTANTS.ORDER_STATUS` y la clase `DatosExpedicion`, evitando inventar estructuras paralelas.
- **Alternatives considered**:
  - Flujo logístico con transportistas automáticos externos: Descartado por el Principio I y descartado explícitamente en la aclaración 2.
  - Modificar las rutas existentes de Feature 007 (`/api/logistica`): Descartado para aislar la responsabilidad de Feature 004 en el router de pedidos `/api/pedidos` sin interferir en los contratos de Feature 007.

---

## Decision 5: Aislamiento Estricto y Prevención de IDOR (Edge Case 2)

- **Decision**: Al consultar el detalle de un pedido en `GET /api/pedidos/mis-compras/:codigoReferencia`, el backend verifica rigurosamente que el pedido pertenezca a la cuenta del usuario autenticado (`order.cuentaId === req.user.id` o `order.clienteEmail === req.user.email`). Si un usuario autenticado intenta consultar una referencia que pertenece a otro cliente, el sistema responde con `403 Forbidden` (`ACCESO_DENEGADO`) o `404 Not Found`, impidiendo cualquier enumeración o acceso indebido por URL.
- **Rationale**:
  - Resuelve el caso extremo especificado en la historia de usuario ("Acceso a compras de otro cliente").
  - Protege la privacidad de los datos personales (Principio V).
- **Alternatives considered**:
  - Confiar en que el frontend filtre la lista: Inaceptable desde el punto de vista de seguridad básica.

---

## Decision 6: Interfaz de Usuario y Experiencia en Frontend

- **Decision**: Crear `frontend/public/cuenta.html` acompañado de sus scripts modulares en `frontend/src/components/cuenta/` y su hoja de estilos `frontend/src/styles/cuenta.css`. Esta página ofrece:
  1. Vista de Autenticación: Formularios limpios de Registro e Iniciar Sesión con alternancia fluida, validación en vivo de contraseña mínima de 8 caracteres y mensajes de error en español (`es-ES`).
  2. Panel "Mis compras": Cabecera con datos del usuario y botón "Cerrar sesión"; listado ordenado cronológicamente de compras realizadas con importe en euros (`€`); componente visual interactivo de seguimiento de 4 fases (stepper/barra de progreso); y visualización del código de seguimiento cuando el pedido ha salido de la tienda o ha sido entregado.
  3. Estado vacío amigable cuando el usuario no tiene compras previas.
- **Rationale**:
  - Principio IV: Totalmente verificable por personas no técnicas desde un navegador.
  - Principio II: Todo en español de España e importes en euros.
  - No altera ni compromete los archivos de las demás páginas (`catalogo.html`, `cart.html`, `checkout.html`, `logistica.html`, `admin/ventas.html`).
- **Alternatives considered**:
  - Incluir el panel de cuenta únicamente como un desplegable en el checkout: Descartado porque no permitiría una consulta de historial cómoda e independiente.
