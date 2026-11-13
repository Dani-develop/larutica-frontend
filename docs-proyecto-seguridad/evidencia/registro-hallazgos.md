# Registro de hallazgos — 7.5

> Este archivo conserva el índice documental. El registro operativo oficial es GitHub Issues;
> los identificadores `H-NN` deben mantenerse sincronizados.

## H-01 — DAST autenticado pendiente de ejecución en ambiente aislado

| Campo | Valor |
|---|---|
| Origen | 4.7 / ZAP Automation Framework |
| Estado | Pendiente de investigación |
| Severidad | Informativa |
| Versión afectada | `a3e92a0fdf2bb5f1fa46eaaf9dd4d026657fa36a` |
| Componente | `.zap/larutica.yaml`, `.github/workflows/zap.yml` |
| Responsable | Axel |
| Tratamiento | Investigar / ejecutar |
| Amenazas relacionadas | `T-01`, `T-05`, `T-06` |
| Evidencia | [plan DAST en PR #24](https://github.com/Dani-develop/larutica-frontend/blob/seg/4.7-dast-zap/docs-proyecto-seguridad/evidencia/4.7-plan-y-ejecucion.md) |
| Issue oficial | [H-01 en GitHub](https://github.com/Dani-develop/larutica-frontend/issues/25) |
| PR correctivo | [PR #24](https://github.com/Dani-develop/larutica-frontend/pull/24) |
| Prueba de verificación | Workflow `DAST ZAP aislado` con reporte HTML |
| Fecha de revisión | 2026-11-13 |

La condición registrada es una comprobación incompleta, no una vulnerabilidad confirmada. El
candidato aislado y la cuenta ficticia ya están disponibles; falta una ejecución exitosa y la
revisión del reporte.

## H-02 — Coincidencias Gitleaks asociadas a AAGUID

| Campo | Valor |
|---|---|
| Origen | 2.3 / Gitleaks |
| Estado | Falso positivo / cerrado |
| Severidad | Informativa |
| Responsable | Axel |
| Tratamiento | Descartar con justificación |
| Evidencia | 3 coincidencias asociadas a valores AAGUID de passkeys |
| Issue oficial | [H-02](https://github.com/Dani-develop/larutica-frontend/issues/31) |

No se reproducen valores sensibles en el registro. Falta la decisión humana que confirme la justificación del falso positivo.

Decisión humana: las 3 coincidencias son AAGUID de passkeys; identifican autenticadores y no son
credenciales ni secretos utilizables. El Issue fue cerrado como falso positivo informativo.

## H-03 — Coincidencia Gitleaks del token del relay

| Campo | Valor |
|---|---|
| Origen | 2.3 / Gitleaks |
| Estado | Pendiente de investigación |
| Severidad | Alta |
| Responsable | Axel |
| Tratamiento | Investigar / rotar si aplica |
| Issue oficial | [H-03](https://github.com/Dani-develop/larutica-frontend/issues/29) |

El propietario debe confirmar si la coincidencia es ficticia/local o si requiere invalidación y rotación. El valor detectado no se copia aquí.

## H-04 — Coincidencia Gitleaks de clave localhost

| Campo | Valor |
|---|---|
| Origen | 2.3 / Gitleaks |
| Estado | Pendiente de investigación |
| Severidad | Media |
| Responsable | Axel |
| Tratamiento | Investigar / aceptar temporalmente |
| Issue oficial | [H-04](https://github.com/Dani-develop/larutica-frontend/issues/30) |

Debe confirmarse que la clave/certificado solo sirve para fixtures localhost y no tiene alcance fuera de pruebas locales.

## H-05 — Avisos react-hooks pendientes de revisión

| Campo | Valor |
|---|---|
| Origen | 3.1 / ESLint CI |
| Estado | Pendiente de investigación |
| Severidad | Baja |
| Responsable | Axel |
| Tratamiento | Corregir / aceptar temporalmente |
| Evidencia | 72 avisos `react-hooks/*`, 62 en `JourneyEditor.tsx` |
| Issue oficial | [H-05](https://github.com/Dani-develop/larutica-frontend/issues/34) |

Los avisos son deuda visible y no se presentan como corregidos.

## H-06 — SCA sin artefacto CI asociado

| Campo | Valor |
|---|---|
| Origen | 3.2 / OSV-Scanner o SCA |
| Estado | Pendiente de investigación |
| Severidad | Informativa |
| Responsable | Axel |
| Tratamiento | Investigar / ejecutar |
| Evidencia | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades |
| Issue oficial | [H-06](https://github.com/Dani-develop/larutica-frontend/issues/33) |

El resultado local no sustituye el artefacto del análisis SCA en CI.

## H-07 — Observaciones de revisión IA pendientes

| Campo | Valor |
|---|---|
| Origen | 2.6 / revisión asistida por IA |
| Estado | Cerrado con limitación aceptada |
| Severidad | Informativa |
| Responsable | Axel |
| Tratamiento | Investigar / validar |
| Evidencia | AI-01, AI-02 y AI-03 en la evidencia de 2.6 |
| Issue oficial | [H-07](https://github.com/Dani-develop/larutica-frontend/issues/32) |

Pablo decidió AI-01 y AI-03 como cerrados y aceptó AI-02 como limitación pendiente. La salida de IA
no sustituyó la decisión humana; el Issue fue cerrado con esa decisión registrada.

## Regla de numeración

Axel mantiene la secuencia `H-NN` y `E-NN` en este índice antes de crear un Issue. Si dos ramas proponen el mismo identificador, se conserva el primero creado en GitHub y se corrige el segundo antes de fusionar.

