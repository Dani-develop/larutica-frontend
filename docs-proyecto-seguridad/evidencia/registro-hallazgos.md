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

No se reproducen valores sensibles en el registro.

Decisión humana (Frander, 2026-11-13): las 3 coincidencias son AAGUID de passkeys; identifican
modelos de autenticador y no son credenciales ni secretos utilizables. Falso positivo informativo,
**cerrado**. La excepción de `.gitleaks.toml` es acotada (regla + ruta exacta + forma UUID); la
prueba negativa sigue bloqueando otros valores. Detalle en
[2.6 decisión humana](2.6-decision-humana.md).

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
| Estado | Corregido en la rama `seg/entrega-unificada`; el cierre del Issue lo decide Axel al integrar |
| Severidad | Baja |
| Responsable | Axel |
| Tratamiento | Corregir |
| Evidencia | Antes: 72 avisos `react-hooks/*`. Ahora: 0; `react-hooks/refs`, `set-state-in-effect` y `purity` vuelven a *error* en `eslint.config.mjs` y `npm run lint` termina con 0 errores |
| Issue oficial | [H-05](https://github.com/Dani-develop/larutica-frontend/issues/34) |

Se corrigieron los avisos restantes (formularios de recuperación de contraseña, `PlaceSearch`, `EditPublicationPage` y `PublicationDepartures`) sin excepción: ya no hay nada que aceptar con fecha.

## H-06 — SCA sin artefacto CI asociado

| Campo | Valor |
|---|---|
| Origen | 3.2 / OSV-Scanner o SCA |
| Estado | Avisos corregidos en la rama `seg/entrega-unificada`; falta el artefacto OSV de CI sobre el SHA final |
| Severidad | Informativa |
| Responsable | Axel |
| Tratamiento | Corregir / ejecutar |
| Evidencia | Local con osv-scanner sobre `package-lock.json`: 78 avisos antes, 0 después (`No issues found`). `npm audit`: 0 (completo, no solo producción). Cambios: `npm audit fix` sin `--force`; vite 8.3.8, wrangler 4.162.0 y @cloudflare/vite-plugin 1.69.1; `overrides` de image-size, esbuild de `@esbuild-kit/core-utils`, minimatch de typescript-estree, `@vercel/og` y fflate. No se añadió ninguna allowlist ni bypass al gate. |
| Issue oficial | [H-06](https://github.com/Dani-develop/larutica-frontend/issues/33) |

El resultado local no sustituye el artefacto del análisis SCA en CI.

## H-07 — Observaciones de revisión IA pendientes

| Campo | Valor |
|---|---|
| Origen | 2.6 / revisión asistida por IA |
| Estado | Abierto: AI-01 resuelta, AI-02 limitación aceptada, AI-03 pendiente de verificación manual |
| Severidad | Informativa |
| Responsable | Axel |
| Tratamiento | Investigar / validar |
| Evidencia | AI-01, AI-02 y AI-03 en la evidencia de 2.6 |
| Issue oficial | [H-07](https://github.com/Dani-develop/larutica-frontend/issues/32) |

Decisión humana (Frander, 2026-11-13; la revisión de Pablo sigue pendiente):

- **AI-01:** resuelta; los controles de 1.3 se mantienen como propuesta hasta tener evidencia.
- **AI-02:** limitación aceptada; el frontend no persiste quién cancela, T-07 se verifica en el
  backend y se registra en 5.3.
- **AI-03:** **abierta**; falta abrir el JSON en Threat Dragon 2.6.2, comprobar T-01 a T-07 y
  regenerar el PNG.

La salida de IA no sustituyó la decisión humana. Detalle en
[2.6 decisión humana](2.6-decision-humana.md). El Issue #32 no debe cerrarse mientras AI-03 siga abierta.

## Regla de numeración

Axel mantiene la secuencia `H-NN` y `E-NN` en este índice antes de crear un Issue. Si dos ramas proponen el mismo identificador, se conserva el primero creado en GitHub y se corrige el segundo antes de fusionar.

