# Registro de hallazgos — 7.5

> Este archivo conserva el índice documental. El registro operativo oficial es GitHub Issues;
> los identificadores `H-NN` deben mantenerse sincronizados.

## H-01 — DAST autenticado pendiente de ejecución en ambiente aislado

| Campo | Valor |
|---|---|
| Origen | 4.7 / ZAP Automation Framework |
| Estado | Pendiente de investigación |
| Severidad | Informativa |
| Versión afectada | `2bab16164c6159100518395cbeb3eeec88a61995` |
| Componente | `.zap/larutica.yaml`, `.github/workflows/zap.yml` |
| Responsable | Axel |
| Tratamiento | Investigar / ejecutar |
| Amenazas relacionadas | `T-01`, `T-05`, `T-06` |
| Evidencia | [plan DAST](4.7-plan-y-ejecucion.md) |
| Issue oficial | [H-01 en GitHub](https://github.com/Dani-develop/larutica-frontend/issues/25) |
| PR correctivo | [PR #24](https://github.com/Dani-develop/larutica-frontend/pull/24) |
| Prueba de verificación | Workflow `DAST ZAP aislado` con reporte HTML |
| Fecha de revisión | 2026-11-13 |

La condición registrada es una comprobación incompleta, no una vulnerabilidad confirmada. El
candidato aislado y la cuenta ficticia ya están disponibles; falta una ejecución exitosa y la
revisión del reporte.

