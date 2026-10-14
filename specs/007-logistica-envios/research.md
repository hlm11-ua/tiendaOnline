# Research & Technical Decisions: 007 - Procesamiento Logístico y Notificación de Envío

**Feature**: `007-logistica-envios` | **Fecha**: 2026-10-14  
**Spec**: [spec.md](./spec.md) | **Responsable**: Desarrollador 3

Investigación técnica y consolidación de decisiones de arquitectura para la gestión del ciclo logístico, empaquetado, expedición y avisos de entrega conforme a los principios de la Constitución del proyecto.

---

## 1. Máquina de Estados Operativa del Pedido

### Decisión
Implementar una máquina de estados secuencial y determinista en la entidad `Pedido`:
$$\text{"pagado"} \xrightarrow{\text{empaquetar}} \text{"en_preparacion"} \xrightarrow{\text{despachar (transportista + tracking)}} \text{"salido_tienda"} \xrightarrow{\text{confirmar entrega}} \text{"entregado"}$$

### Rationale
- Cumple con la clarificación Q1 acordada en la especificación, distinguiendo el momento en que el artesano acondiciona y embala piezas delicadas en el taller del momento en que el paquete es retirado por la mensajería.
- Previene transiciones inconsistentes (por ejemplo, despachar un pedido que aún no ha sido pagado o marcar como entregado un pedido sin expedir).

### Alternativas Evaluadas
- **Transición directa `pagado` → `salido_tienda`**: Descartada porque no ofrecía visibilidad operativa al taller sobre los pedidos que ya estaban en proceso de embalaje frente a los recién pagados.
- **Sub-estados libres con etiquetas**: Descartada por complejidad innecesaria en consultas y filtros de administración.

---

## 2. Mecanismo de Aviso Automático y Observabilidad (Principio IV)

### Decisión
Implementar un servicio de avisos multicanal coordinado:
1. **Canal Email Emulado / Notificación Digital**: El sistema genera el registro del correo de aviso (asunto, remitente `envios@tiendaonline.es`, destinatario, fecha y cuerpo en español con el código y transportista) en el almacén de datos del pedido, permitiendo visualizarlo en un modal o bandeja de salida dentro de la interfaz.
2. **Canal Vista de Pedido**: La pantalla de consulta de pedido (tanto para compradores invitados como registrados) muestra la tarjeta de envío con la empresa de transporte, el código de seguimiento destacado y la fecha de salida.
3. **Canal Panel de Usuario**: Si el pedido cuenta con `cuentaId`, se asocia una notificación al buzón de mensajes del comprador.

### Rationale
- Cumple con el Principio I (Simplicidad ante todo) y Principio V (Respeto por los datos): no requiere credenciales de pasarelas SMTP externas (SendGrid, Mailgun) ni servicios en la nube.
- Cumple con el Principio IV (Verificable por no técnicos): cualquier evaluador o usuario final puede comprobar en la interfaz el envío exacto del correo y su contenido sin abrir consolas ni inspeccionar bases de datos.

### Alternativas Evaluadas
- **Integración con servidor SMTP real**: Rechazada por violar el Principio I y V (requeriría configuración de variables de entorno, claves secretas y conectividad a internet externa para pruebas locales).
- **Solo actualización en pantalla de pedido**: Rechazada por no cumplir con el requisito explícito de la historia de usuario ("el cliente reciba un aviso automático de que su compra está en camino").

---

## 3. Registro de Transportista y Validación de Código de Seguimiento

### Decisión
- **Transportistas Predefinidos**: Lista estándar de compañías de transporte operativas en el mercado español:
  - `Correos de España`
  - `SEUR`
  - `MRW`
  - `GLS`
  - `DHL Express`
  - `Otro (especificar)`
- **Validación del Código**: Cadena alfanumérica entre 6 y 32 caracteres (admite mayúsculas, minúsculas, dígitos y guiones `-`, `_`).
- **Política de Rectificación**: Si el gestor detecta una errata antes de que el pedido sea entregado, puede editar el número y transportista; la acción guarda el histórico y emite un nuevo aviso de rectificación con el código corregido.

### Rationale
- Estandariza la captura de datos logísticos sin sobreingeniería (Principio I).
- Previene clics accidentales con campos vacíos o cadenas de un solo carácter.

### Alternativas Evaluadas
- **Integración con APIs privadas de transportistas (Webhooks de seguimiento de Correos/SEUR)**: Descartada de mutuo acuerdo en Assumptions de la spec (Principio I: simplicidad en v1).

---

## 4. Doble Vía de Confirmación de Entrega

### Decisión
Proporcionar dos disparadores para transicionar el pedido de `"salido_tienda"` a `"entregado"`:
1. **Acción Administrativa (Panel de Gestión)**: Botón "Marcar como Entregado" accesible para el personal de la tienda.
2. **Acción del Cliente (Pantalla de Seguimiento)**: Botón "Confirmar recepción / He recibido mi pedido" accesible en la pantalla de consulta de compra.

### Rationale
- Permite cerrar el ciclo de vida del pedido tanto si el comercio recibe la confirmación del transportista como si el propio comprador notifica de inmediato la recepción satisfactoria de su artesanía.
