<!--
Sync Impact Report:
- Version change: Unversioned (Template) → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Simplicidad ante todo
  - [PRINCIPLE_2_NAME] → II. Idioma y mercado
  - [PRINCIPLE_3_NAME] → III. Cero alcance fantasma
  - [PRINCIPLE_4_NAME] → IV. Verificable por personas no técnicas
  - [PRINCIPLE_5_NAME] → V. Respeto por los datos del usuario
- Added sections: None
- Removed sections:
  - [SECTION_2_NAME]
  - [SECTION_3_NAME]
- Follow-up TODOs: None
-->

# TiendaOnline Constitution

## Core Principles

### I. Simplicidad ante todo
- Ante dos soluciones técnicas o funcionales, se debe elegir siempre la más simple.
- Alcance v1 estricto: prohibida cualquier complejidad anticipada, sobreingeniería o abstracción prematura.
- Todo desarrollo debe resolver el problema inmediato con la menor cantidad de capas y código posible.

### II. Idioma y mercado
- Todo el producto (interfaz de usuario, textos, mensajes informativos, errores y documentación funcional) debe estar en español de España (`es-ES`).
- Moneda oficial y única: euro (`€`). Todos los precios, tarifas e importes deben expresarse en euros con formato estándar español.

### III. Cero alcance fantasma
- Queda prohibido implementar cualquier funcionalidad o comportamiento que no esté explícitamente redactado y aprobado en la especificación (`spec.md`).
- Si surge una idea, sugerencia o mejora técnica durante el desarrollo, se debe registrar como propuesta para su evaluación; en ningún caso se construye sin estar formalizada en la spec.

### IV. Verificable por personas no técnicas
- Cada criterio de éxito y escenario de aceptación debe poder validarse de principio a fin usando la aplicación, sin necesidad de leer código fuente ni consultar bases de datos.
- Las especificaciones y flujos deben redactarse en términos de comportamiento observable y verificable por usuarios finales o evaluadores de negocio.

### V. Respeto por los datos del usuario
- Se debe solicitar únicamente la información estrictamente imprescindible para completar la operativa del servicio.
- Queda terminantemente prohibido incorporar claves, contraseñas, secretos o credenciales en el código fuente, configuración pública o repositorios.

## Governance

- **Supremacía**: Esta constitución rige todas las decisiones del proyecto y tiene prioridad sobre cualquier otra práctica o sugerencia técnica.
- **Verificación obligatoria**: Cada fase de diseño (`spec.md`), planificación (`plan.md`) e implementación (`tasks.md`) debe superar la comprobación de principios (Constitution Check).
- **Procedimiento de enmienda**: Cualquier cambio, adición o eliminación de principios debe documentarse con su debida justificación y registrarse en este archivo.
- **Versionado (SemVer)**:
  - MAJOR: Modificaciones o eliminaciones incompatibles de principios fundamentales.
  - MINOR: Inclusión de nuevos principios o secciones organizativas.
  - PATCH: Mejoras de redacción, corrección de erratas y aclaraciones que no alteren el fondo de las reglas.

**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
