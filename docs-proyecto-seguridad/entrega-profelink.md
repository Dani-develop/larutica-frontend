# Entrega en Profelink

Texto base para el documento de entrega del proyecto final de desarrollo seguro de software (viernes 13 de noviembre de 2026, 23:59, hora de Costa Rica). Todo lo que sigue se puede comprobar en el repositorio; lo que no tiene evidencia se dice así.

## 1. Repositorio público

| Repositorio | Enlace | Para qué sirve |
|---|---|---|
| Repositorio de trabajo | <https://github.com/Dani-develop/larutica-frontend> | Código, PR con su revisión, Issues de hallazgos (`H-NN`), ejecuciones de GitHub Actions y ruleset. Es donde viven los enlaces de las fichas. |
| Repositorio de entrega | <https://github.com/FranderCT/larutica-frontend-entrega> | Copia pública de entrega de la rama `main`. |

Ambos son públicos. Al redactar este texto, `main` del repositorio de trabajo está en `10e90b8` (merge del PR #55, «Entrega unificada») y `main` del repositorio de entrega estaba en `981b084`: antes de entregar hay que sincronizar el repositorio de entrega y confirmar que su `main` apunta al mismo commit que se defiende. Los enlaces a PR, Issues y corridas de las fichas apuntan al repositorio de trabajo.

La carpeta de documentación del proyecto es [`docs-proyecto-seguridad/`](README.md); el índice de lo que falta es [pendientes](pendientes.md).

## 2. Alcance

El equipo de cinco integrantes eligió **15 ítems** (3 por integrante, con al menos uno por fase) de los lineamientos oficiales ([`documento-proyecto.docx`](documento-proyecto.docx)): planificación segura (1.1, 1.3), desarrollo (2.3, 2.6), construcción e integración (3.1, 3.2, 3.5), pruebas (4.4, 4.5, 4.7), preparación de la versión (5.3, 5.6), despliegue (6.5) y operación y mejora (7.5, 7.6). El producto es LaRutica, una aplicación Next.js sobre Supabase con pagos en OnvoPAY. Los tres flujos críticos son F-01 (inicio de sesión y acceso por rol), F-02 (compra y pago) y F-03 (consulta y cancelación de reservas).

## 3. Responsabilidades de cada integrante

| Integrante | Usuario de GitHub (según los PR) | Ítems | Revisor de sus ítems |
|---|---|---|---|
| Daniel | `Gvrh05` | [2.3](fase-2-desarrollo/2.3-semgrep-gitleaks-local.md), [3.2](fase-3-construccion-integracion/3.2-analisis-ci-semgrep-gitleaks-osv.md), [5.6](fase-5-preparacion-version/5.6-excepciones-seguridad.md) | Frander (2.3), Axel (3.2), Pablo (5.6) |
| Frander | `FranderCT` | [1.1](fase-1-planificacion/1.1-flujos-criticos.md), [3.1](fase-3-construccion-integracion/3.1-ci-por-pr.md), [4.4](fase-4-pruebas/4.4-e2e-playwright-flujos.md) | Daniel Núñez (1.1), Pablo (3.1), Daniel (4.4) |
| Daniel Núñez | `Dani-develop` | [1.3](fase-1-planificacion/1.3-modelo-amenazas-stride.md), [4.5](fase-4-pruebas/4.5-pruebas-autorizacion.md), [5.3](fase-5-preparacion-version/5.3-resumen-cambios-limitaciones.md) | Axel (1.3), Frander (4.5), Daniel (5.3) |
| Axel | `11Axel11` | [2.6](fase-2-desarrollo/2.6-revision-codigo-ia.md), [4.7](fase-4-pruebas/4.7-dast-zap.md), [7.5](fase-7-operacion-mejora/7.5-registro-unico-hallazgos.md) | Pablo (2.6), Daniel Núñez (4.7), Frander (7.5) |
| Pablo | `PabloObando` | [3.5](fase-3-construccion-integracion/3.5-proteccion-ramas-pipeline.md), [6.5](fase-6-despliegue/6.5-comprobaciones-post-despliegue.md), [7.6](fase-7-operacion-mejora/7.6-renovate-reescaneos.md) | Axel (3.5), Daniel (6.5), Daniel Núñez (7.6) |

La asignación de usuarios de GitHub se dedujo de los autores de los PR de cada ítem; si un nombre o usuario está mal, corregirlo aquí y en el [README](README.md).

## 4. Cómo se repartió el trabajo

1. **Reparto inicial.** Cada integrante tomó tres ítems y los documentó en su propio archivo (`N.M-nombre.md`), en una rama `seg/<ítem>-<tema>` y con un PR cuyo título empieza por el ítem. Así no hubo conflictos de merge entre fichas.
2. **Revisión cruzada.** Cada ítem tiene un revisor distinto de su responsable (tabla de la sección 3). Un ítem pasa a **Listo** solo cuando su revisor reprodujo la evidencia; una ejecución ausente o incompleta se reporta como incompleta, nunca como aprobada.
3. **Integración.** Los PR de cada ítem entraron a `development` y de allí a `main` mediante el PR #28 y luego el PR #55 (entrega unificada, que además corrige los hallazgos H-05 y H-06 en la rama). Los PR de actualización de dependencias los abre Renovate y pasan por los mismos checks.
4. **Ventana final.** En la ventana final del 13 de noviembre, varios integrantes no estuvieron disponibles para completar sus ítems. Los ítems restantes fueron completados por Frander en esa ventana final: unir las ramas, cerrar fichas con lo verificable, corregir hallazgos de dependencias y de lint, y documentar lo que depende de una acción del propietario del repositorio. Ese trabajo se hizo con asistencia de un agente de IA (Claude Code) y consta en el historial de Git y en los PR [#41](https://github.com/Dani-develop/larutica-frontend/pull/41), [#45](https://github.com/Dani-develop/larutica-frontend/pull/45), [#53](https://github.com/Dani-develop/larutica-frontend/pull/53) y [#55](https://github.com/Dani-develop/larutica-frontend/pull/55).
5. **Qué no sustituye ese trabajo.** Completar una ficha no equivale a revisarla ni a firmarla. Las revisiones, las firmas, las decisiones humanas (por ejemplo, sobre H-02, H-03, H-04 y AI-01 a AI-03) y las defensas individuales siguen pendientes de cada responsable y de cada revisor. Cada persona debe poder explicar y demostrar sus tres ítems en la defensa.

## 5. Evidencias por ítem

Estado según las fichas y [pendientes](pendientes.md). **Ningún ítem está en Listo**: ninguna ficha tiene las casillas de revisión marcadas por su revisor.

Leyenda: «Evidencia» es lo que ya se puede abrir y verificar; «Espera» es lo que falta y quién lo hace.

| Ítem | Ficha | Evidencia disponible | Espera |
|---|---|---|---|
| 1.1 Flujos críticos | [1.1](fase-1-planificacion/1.1-flujos-criticos.md) | PR [#10](https://github.com/Dani-develop/larutica-frontend/pull/10) fusionado; flujos F-01 a F-03 con criterios de aceptación | Cerrar preguntas abiertas y revisión de Daniel Núñez |
| 1.3 Modelo STRIDE | [1.3](fase-1-planificacion/1.3-modelo-amenazas-stride.md) | PR [#15](https://github.com/Dani-develop/larutica-frontend/pull/15); [modelo Threat Dragon](fase-1-planificacion/larutica-threat-dragon.json) (7 amenazas T-01 a T-07, contrastado con la tabla) y [diagrama](fase-1-planificacion/larutica-diagrama.png) | Firma de Axel |
| 2.3 Semgrep y Gitleaks locales | [2.3](fase-2-desarrollo/2.3-semgrep-gitleaks-local.md) | PR [#18](https://github.com/Dani-develop/larutica-frontend/pull/18); salida local sanitizada ([docs/security](../docs/security/README.md)) | Confirmaciones de H-03 y H-04 por sus dueños; revisión de Frander |
| 2.6 Revisión de código con IA | [2.6](fase-2-desarrollo/2.6-revision-codigo-ia.md) | PR [#19](https://github.com/Dani-develop/larutica-frontend/pull/19); [instrucciones, salida y diff revisado](evidencia/2.6-salida-ia.md) | Decisión de Pablo sobre cada hallazgo de la IA (H-07) y su revisión |
| 3.1 CI por PR | [3.1](fase-3-construccion-integracion/3.1-ci-por-pr.md) | PR [#12](https://github.com/Dani-develop/larutica-frontend/pull/12); [`validate.yml`](../.github/workflows/validate.yml) con corridas verdes en los PR de Renovate (por ejemplo [PR #44](https://github.com/Dani-develop/larutica-frontend/pull/44)) | Revisión de Pablo |
| 3.2 Semgrep, Gitleaks y OSV en CI | [3.2](fase-3-construccion-integracion/3.2-analisis-ci-semgrep-gitleaks-osv.md) | PR [#20](https://github.com/Dani-develop/larutica-frontend/pull/20); [`security.yml`](../.github/workflows/security.yml); corrida en success en el [PR #49](https://github.com/Dani-develop/larutica-frontend/pull/49) ([run 43514974243](https://github.com/Dani-develop/larutica-frontend/actions/runs/43514974243)) | Corrida de OSV sobre el SHA final (H-06) y revisión de Axel |
| 3.5 Protección de ramas y pipeline | [3.5](fase-3-construccion-integracion/3.5-proteccion-ramas-pipeline.md) | PR [#22](https://github.com/Dani-develop/larutica-frontend/pull/22); [`CODEOWNERS`](../.github/CODEOWNERS); `permissions: contents: read` en los cinco workflows; ruleset creado | **Configuración documentada, activación pendiente**: el propietario activa el ruleset (hoy `disabled`) y se guarda un PR bloqueado; revisión de Axel |
| 4.4 E2E con Playwright | [4.4](fase-4-pruebas/4.4-e2e-playwright-flujos.md) | PR [#11](https://github.com/Dani-develop/larutica-frontend/pull/11); job `E2E flujos críticos` en success en los PR recientes | Anotar la corrida final y revisión de Daniel |
| 4.5 Pruebas de autorización | [4.5](fase-4-pruebas/4.5-pruebas-autorizacion.md) | PR [#14](https://github.com/Dani-develop/larutica-frontend/pull/14); suite `npm run test:authorization` | Que Frander la reproduzca y firme |
| 4.7 DAST con ZAP | [4.7](fase-4-pruebas/4.7-dast-zap.md) | PR [#24](https://github.com/Dani-develop/larutica-frontend/pull/24); [`zap.yml`](../.github/workflows/zap.yml), plan `.zap/larutica.yaml`, [plan y ejecución](evidencia/4.7-plan-y-ejecucion.md) | **Sin ejecución exitosa** del DAST autenticado (H-01); revisión de Daniel Núñez |
| 5.3 Resumen de cambios | [5.3](fase-5-preparacion-version/5.3-resumen-cambios-limitaciones.md) | PR [#16](https://github.com/Dani-develop/larutica-frontend/pull/16); resumen del candidato | Rehacerlo sobre el commit final y revisión de Daniel |
| 5.6 Excepciones de seguridad | [5.6](fase-5-preparacion-version/5.6-excepciones-seguridad.md) | PR [#21](https://github.com/Dani-develop/larutica-frontend/pull/21); [solicitudes](../docs/security/solicitudes-excepciones.md) | Decisiones humanas registradas en 7.5 y revisión de Pablo |
| 6.5 Post-despliegue | [6.5](fase-6-despliegue/6.5-comprobaciones-post-despliegue.md) | PR [#23](https://github.com/Dani-develop/larutica-frontend/pull/23); [`post-deploy-check.yml`](../.github/workflows/post-deploy-check.yml) | **Ejecución pendiente/incompleta** (la corrida sobre `main` falló); CI pendiente de enlazar; revisión de Daniel |
| 7.5 Registro único de hallazgos | [7.5](fase-7-operacion-mejora/7.5-registro-unico-hallazgos.md) | PR [#27](https://github.com/Dani-develop/larutica-frontend/pull/27); [registro](evidencia/registro-hallazgos.md) y [procedimiento](evidencia/7.5-taxonomia-y-procedimiento.md); Issues `H-NN` en GitHub | Cerrar o dejar con estado explícito H-01 a H-07; revisión de Frander |
| 7.6 Renovate y reescaneos | [7.6](fase-7-operacion-mejora/7.6-renovate-reescaneos.md) | PR [#17](https://github.com/Dani-develop/larutica-frontend/pull/17); [`renovate.json`](../renovate.json); PR reales de Renovate con checks ([#44](https://github.com/Dani-develop/larutica-frontend/pull/44), [#35](https://github.com/Dani-develop/larutica-frontend/pull/35), [#36](https://github.com/Dani-develop/larutica-frontend/pull/36), [#43](https://github.com/Dani-develop/larutica-frontend/pull/43)) | **Brecha:** no hay reescaneo programado (`cron`); revisión de Daniel Núñez |

### Hallazgos y excepciones

Los hallazgos están en GitHub Issues (`H-NN`) y en [registro-hallazgos](evidencia/registro-hallazgos.md). Los resueltos en la rama de entrega son H-05 (reglas de lint de `react-hooks` otra vez en error, 0 avisos) y H-06 (OSV local de 78 a 0 y `npm audit` en 0; falta la corrida de OSV en CI sobre el SHA final). H-01, H-03, H-04 y H-07 siguen pendientes de una decisión o ejecución humana; H-02 (falso positivo de AAGUID) tiene decisión registrada que debe revisar su revisor.

## 6. Qué esperar de la defensa

Cada integrante defiende sus tres ítems: qué decidió, qué demuestra la evidencia y qué limitaciones quedan. Las fichas tienen una sección «Preparación para la defensa» con las preguntas que debe poder responder. Lo que esta entrega afirma se limita a lo que las fichas enlazan; lo pendiente figura como pendiente.
