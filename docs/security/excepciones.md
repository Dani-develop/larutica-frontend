# Gestión de excepciones — ítem 5.6 (Daniel)

## Estado real y fuente única

Fecha de preparación: **2026-11-13**. Revisor del ítem: **Pablo**.
El registro único lo gestiona Axel en el [ítem 7.5](../../docs-proyecto-seguridad/fase-7-operacion-mejora/7.5-registro-unico-hallazgos.md),
que figura **Pendiente en la copia local**. No se inspeccionaron ni crearon
Issues remotos como parte de este trabajo.

| Pregunta | Respuesta verificable |
|---|---|
| ¿Este trabajo aprobó excepciones? | **No: cero aprobaciones y cero excepciones vigentes otorgadas por el agente.** |
| ¿El equipo tiene cero excepciones abiertas? | **No verificable todavía**: falta consultar/confirmar el registro único con Axel. No confundir con la fila anterior. |
| ¿Se silenciaron controles para aprobar? | No: no se añadieron allowlists, overrides SCA ni bypass al gate. |
| ¿Se publicaron solicitudes? | No. Solo se preparó la plantilla local `.github/ISSUE_TEMPLATE/excepcion-seguridad.yml`. |
| ¿Puede cerrarse 5.6 ahora? | No: falta el registro único, confirmar sus excepciones abiertas y la revisión de Pablo. |

Este documento **no es otro registro de excepciones**: explica el procedimiento.
La información de cada E-NN vive una sola vez como Issue del registro único;
desde 5.6 se enlaza ese Issue, sin duplicar su ficha ni asignar IDs inventados.

## Evidencia que debe recibir el registro único

- Coincidencias del análisis de secretos: [clasificación inicial 2.3](triage-local-2.3.md).
- Resultados SCA y estado del gate: [evidencia local 3.2](evidencia-local-3.2.md).

Son entradas pendientes de clasificación/tratamiento con Axel, **no excepciones
aprobadas**. Un falso positivo demostrado se documenta como tal en el hallazgo,
no se presenta como una vulnerabilidad aceptada. Un aviso sin investigar tampoco
puede declararse falso positivo por conveniencia.

## Flujo de solicitud y aprobación

1. **Registrar/investigar H-NN con Axel.** Debe existir evidencia sanitizada,
   versión/commit y alcance, severidad justificada y responsable. Hasta entonces,
   los controles siguen bloqueando. No abrir Issues ni publicar evidencia sin
   autorización de Daniel durante esta etapa de trabajo exclusivamente local.
2. **Preferir corrección.** Evaluar actualizar, eliminar o reemplazar el componente;
   comprobar compatibilidad y volver a ejecutar controles. No ejecutar arreglos
   masivos ni aceptar riesgo automáticamente.
3. **Solicitar E-NN en el mismo registro**, usando la plantilla. Enlazar H-NN y
   E-NN en ambas direcciones. Axel coordina el siguiente identificador disponible.
4. **Completar todos los campos:** hallazgo; versión/commit/alcance concretos;
   evidencia; justificación y riesgo residual; controles compensatorios; plan
   y responsable de corrección; responsable designado del riesgo; revisor
   independiente; aprobaciones humanas verificables; fecha límite de vencimiento
   o revisión con zona horaria. No basta escribir «aprobado» en un archivo.
5. **Aprobar humanamente:** el responsable designado y **otro integrante revisor**,
   con comentarios identificables y fecha. El agente no es aprobador; Daniel no
   puede reemplazar al revisor con su propia aprobación. Si cambia una exigencia
   académica obligatoria, **también se necesita aprobación del docente**.
6. **Revisar antes de liberar.** Pablo verifica la ficha y el vínculo al registro,
   y el responsable de la versión confirma alcance y vigencia. La excepción no
   aprueba controles sin ejecutar ni convierte un fallo operativo en hallazgo aceptado.
7. **Aplicar cualquier cambio de política solo por PR revisado**, limitado al
   hallazgo exacto, con evidencia de que otros defectos siguen detectándose.
   El gate actual no tiene mecanismo de bypass: registrar E-NN no lo desactiva.
8. **Cerrar o revisar a tiempo.** Una excepción vencida, sin aprobación, fuera
   de alcance o sin evidencia no es vigente. No autorrenovar. Al corregir,
   reanalizar, eliminar cualquier supresión temporal y cerrar la excepción
   enlazando el commit y evidencia; conservar el historial de decisiones.

Estados humanos sugeridos en el registro: solicitada → en revisión → vigente
(solo después de aprobaciones) → cerrada; alternativas: rechazada o vencida.
Crear una solicitud o marcar casillas no prueba ninguna transición de aprobación.

## Credenciales reales: no son un trámite de excepción

Ante exposición confirmada, no publicar ni reutilizar el valor. Notificar al
propietario, **revocar o rotar en el servicio de origen**, actualizar los almacenes
de secretos autorizados y verificar que la credencial anterior dejó de funcionar
mediante evidencia del propietario, sin exponer valores. Evaluar accesos/logs e
historial Git y coordinar cualquier limpieza con el equipo. Borrar un archivo,
suprimir Gitleaks o abrir E-NN no remedia la exposición.

No se ha confirmado ni ejecutado una rotación en este trabajo; las coincidencias
del 2.3 no prueban por sí solas una credencial de producción expuesta. Validar
que la clave localhost nunca se reutilizó y revisar el hash de verificación
del relay con su propietario antes de resolver la clasificación.

## Lista de revisión de Pablo

- [ ] Axel confirmó dónde está el registro único y cuáles excepciones siguen abiertas para el commit/version candidato.
- [ ] Cada excepción abierta tiene vínculo E-NN → H-NN y H-NN → E-NN.
- [ ] Version/alcance, evidencia, justificación, controles y responsable están completos.
- [ ] Existen dos aprobaciones humanas identificables, de personas distintas; y docente cuando corresponde.
- [ ] La fecha límite no ha vencido y corresponde al alcance de la versión.
- [ ] Ninguna credencial real se dejó sin revocación/rotación como supuesto riesgo aceptado.
- [ ] Ningún control ausente o incompleto se presenta como aprobado.
- [ ] La revisión quedó documentada por Pablo antes de marcar el ítem Listo.

Si el registro confirma que no hay excepciones abiertas, registrar esa
confirmación con enlace/fecha y commit candidato; no crear excepciones ficticias
solo para llenar la tabla. Esa confirmación aún está pendiente.
