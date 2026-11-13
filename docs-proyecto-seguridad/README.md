# Proyecto final de desarrollo seguro de software

Documentación del equipo para la entrega del **viernes 13 de noviembre de 2026, 23:59 (hora de Costa Rica)**.
Lineamientos oficiales: [`documento-proyecto.docx`](documento-proyecto.docx).

Alcance elegido: **15 ítems** (3 por integrante, mínimo para un equipo de 5), con al menos uno por fase.

Lista de lo que falta para cerrar la entrega: [pendientes](pendientes.md).

## Cómo usar esta carpeta

- Cada fase tiene su carpeta con un `README.md` y **un archivo por ítem** (`N.M-nombre.md`).
- Cada persona documenta **solo sus ítems**, en su propio archivo: así no hay conflictos de merge.
- Cada archivo tiene la misma estructura: qué demostrar, qué se hizo, evidencia, decisiones, resultados, limitaciones, revisión y preparación de la defensa.
- La evidencia enlaza a configuración o código, PR y ejecución, con commit (y digest si aplica). No se copian reportes completos.
- Nunca incluir secretos, tokens ni datos reales en estos documentos.

## Reparto

| Integrante | Ítem | Revisor |
|---|---|---|
| Daniel | [2.3](fase-2-desarrollo/2.3-semgrep-gitleaks-local.md) Semgrep CE y Gitleaks en el entorno de desarrollo | Frander |
|  | [3.2](fase-3-construccion-integracion/3.2-analisis-ci-semgrep-gitleaks-osv.md) Análisis de código, secretos y dependencias en CI | Axel |
|  | [5.6](fase-5-preparacion-version/5.6-excepciones-seguridad.md) Excepciones de seguridad abiertas | Pablo |
| Frander | [1.1](fase-1-planificacion/1.1-flujos-criticos.md) Tres flujos críticos y criterios de aceptación | Daniel Núñez |
|  | [3.1](fase-3-construccion-integracion/3.1-ci-por-pr.md) GitHub Actions por PR: lockfile, lint, build y pruebas | Pablo |
|  | [4.4](fase-4-pruebas/4.4-e2e-playwright-flujos.md) Pruebas E2E con Playwright de los tres flujos críticos | Daniel |
| Daniel Núñez | [1.3](fase-1-planificacion/1.3-modelo-amenazas-stride.md) Modelo de amenazas con STRIDE y OWASP Threat Dragon | Axel |
|  | [4.5](fase-4-pruebas/4.5-pruebas-autorizacion.md) Pruebas de autorización por rol, propiedad y sin sesión | Frander |
|  | [5.3](fase-5-preparacion-version/5.3-resumen-cambios-limitaciones.md) Resumen de cambios y limitaciones conocidas | Daniel |
| Axel | [2.6](fase-2-desarrollo/2.6-revision-codigo-ia.md) Revisión de código asistida por IA | Pablo |
|  | [4.7](fase-4-pruebas/4.7-dast-zap.md) DAST con ZAP Automation Framework | Daniel Núñez |
|  | [7.5](fase-7-operacion-mejora/7.5-registro-unico-hallazgos.md) Registro único de hallazgos | Frander |
| Pablo | [3.5](fase-3-construccion-integracion/3.5-proteccion-ramas-pipeline.md) Protección de ramas y permisos del pipeline | Axel |
|  | [6.5](fase-6-despliegue/6.5-comprobaciones-post-despliegue.md) Comprobaciones posteriores al despliegue | Daniel |
|  | [7.6](fase-7-operacion-mejora/7.6-renovate-reescaneos.md) Renovate y reescaneos periódicos | Daniel Núñez |

> Supuesto: Frander es el quinto integrante. Si cambia un nombre, actualizar esta tabla, los encabezados de los ítems y el README de cada fase.

### Revisiones asignadas

| Revisor | Ítems que revisa |
|---|---|
| Daniel | 4.4, 5.3, 6.5 |
| Frander | 2.3, 4.5, 7.5 |
| Daniel Núñez | 1.1, 4.7, 7.6 |
| Axel | 1.3, 3.2, 3.5 |
| Pablo | 2.6, 3.1, 5.6 |

## Fases

| Fase | Ítems |
|---|---|
| [1. Planificación](fase-1-planificacion/README.md) | 1.1, 1.3 |
| [2. Desarrollo](fase-2-desarrollo/README.md) | 2.3, 2.6 |
| [3. Construcción e integración](fase-3-construccion-integracion/README.md) | 3.1, 3.2, 3.5 |
| [4. Pruebas](fase-4-pruebas/README.md) | 4.4, 4.5, 4.7 |
| [5. Preparación de la versión](fase-5-preparacion-version/README.md) | 5.3, 5.6 |
| [6. Despliegue](fase-6-despliegue/README.md) | 6.5 |
| [7. Operación y mejora continua](fase-7-operacion-mejora/README.md) | 7.5, 7.6 |

## Orden sugerido (dependencias)

1. Sin dependencias: 1.1, 1.3, 2.3, 3.5 y 7.5.
2. Después: 3.1, 4.4 (usa los flujos de 1.1) y 4.5 (usa los permisos definidos).
3. Luego: 3.2 (reutiliza la config de 2.3) y 4.7 (necesita sesión autenticada).
4. Al final: 2.6, 6.5, 7.6, 5.3 y 5.6, que usan resultados de CI y de los PR.

## Convenciones

| Qué | Formato | Ejemplo |
|---|---|---|
| Flujo crítico | `F-NN` | `F-01` reservas |
| Amenaza | `T-NN` | `T-03` |
| Hallazgo | `H-NN` (issue de GitHub) | `H-07` |
| Excepción | `E-NN` | `E-01` |
| Rama | `seg/<ítem>-<tema>` | `seg/3.2-osv-scanner` |
| PR | Título empieza con el ítem | `3.2: OSV-Scanner en CI` |

- Cada PR lo revisa y aprueba otro integrante (el revisor del ítem).
- Un ítem solo pasa a **Listo** cuando el revisor reprodujo la evidencia.
- Una ejecución ausente o incompleta se reporta como incompleta, nunca como aprobada.

## Entrega en Profelink

El documento de entrega debe incluir:

- [ ] Enlace al repositorio público de GitHub.
- [ ] Alcance de cada miembro y sus responsabilidades.
- [ ] Cómo se distribuyó el trabajo (esta carpeta, sección Reparto).
- [ ] Evidencias de la implementación y artefactos terminados, enlazadas desde cada ítem.

## Criterios de calificación (30 %)

| Criterio | Valor |
|---|---|
| Repositorio y entrega | 5 % |
| Documentación | 5 % |
| Cumplimiento técnico (calidad 5 %, seguridad 5 %) | 10 % |
| Defensa individual | 10 % |

La defensa es por persona: cada integrante explica y demuestra sus 3 ítems, decisiones, resultados y limitaciones.
