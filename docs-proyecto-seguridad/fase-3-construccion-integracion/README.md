# Fase 3. Construcción e integración

**Integrantes de la fase:** Frander (3.1); Daniel (3.2); Pablo (3.5)

**Objetivo.** Pipeline de CI que ejecuta comprobaciones, y bloquea la integración cuando no se cumplen.

**Cierre de la fase (para el alcance elegido).** Se demuestra un PR bloqueado por un fallo, su corrección y posterior integración, con resultados asociados al commit fusionado.

## Ítems seleccionados

| Ítem | Descripción | Responsable | Revisor | Depende de | Estado |
|---|---|---|---|---|---|
| [3.1](3.1-ci-por-pr.md) | GitHub Actions por PR: lockfile, lint, build y pruebas | Frander | Pablo | — | En curso |
| [3.2](3.2-analisis-ci-semgrep-gitleaks-osv.md) | Análisis de código, secretos y dependencias en CI | Daniel | Axel | 2.3 | Pendiente |
| [3.5](3.5-proteccion-ramas-pipeline.md) | Protección de ramas y permisos del pipeline | Pablo | Axel | 3.1 | Pendiente |

Los demás ítems de esta fase son catálogo de referencia y no se evalúan (ver `../documento-proyecto.docx`).

## Resumen de la fase

_Lo completa la persona responsable del cierre de fase cuando todos los ítems estén Listos: qué quedó demostrado, qué limitaciones hay y cómo se conectan los ítems entre sí._
