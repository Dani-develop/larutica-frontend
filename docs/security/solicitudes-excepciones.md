# Solicitudes de excepción — enlaces al registro único

Fecha: **2026-11-13**. Preparadas con asistencia de un agente a petición de
Daniel. Esta página es un índice de enlaces, **no otro registro de riesgos**.
Las fichas viven en GitHub Issues, registro del ítem 7.5 de Axel.

| Hallazgo | Solicitud en el mismo registro | Estado |
|---|---|---|
| [H-03 / #29: configuración del relay](https://github.com/Dani-develop/larutica-frontend/issues/29) | [#38: revisión del verificador del relay](https://github.com/Dani-develop/larutica-frontend/issues/38) | Solicitada, no vigente; clasificación y propietario pendientes |
| [H-04 / #30: clave localhost](https://github.com/Dani-develop/larutica-frontend/issues/30) | [#39: fixture TLS de pruebas](https://github.com/Dani-develop/larutica-frontend/issues/39) | Solicitada, no vigente; confirmar uso exclusivo en pruebas |
| [H-06 / #33: SCA](https://github.com/Dani-develop/larutica-frontend/issues/33) | [#40: evaluación de avisos OSV](https://github.com/Dani-develop/larutica-frontend/issues/40) | Solicitada, no vigente; requiere evaluación por advisory |

Los hallazgos tienen comentarios que enlazan de vuelta a estas solicitudes.
Axel debe asignar los IDs E-NN definitivos. No se inventaron IDs oficiales ni
se creó una excepción para los AAGUID: [H-02 / #31](https://github.com/Dani-develop/larutica-frontend/issues/31)
ya los clasifica como falsos positivos, no como vulnerabilidades aceptadas.

## Qué se registró y qué NO se aprobó

Cada solicitud incluye alcance, versión/commits, evidencia real de Actions,
justificación propuesta, incertidumbres, medidas y plan de tratamiento.
Responsable designado, revisor, aprobaciones verificables y fecha de vencimiento
deben completarse humanamente antes de considerarla vigente. Si cambia una
exigencia académica obligatoria, requiere también aprobación del docente.

**Cero solicitudes aprobadas por este trabajo.** No se añadió ningún bypass,
allowlist o ignore SCA. Los checks de los PR #20 y #21 continúan bloqueando.
Una solicitud publicada desde la cuenta de Daniel no equivale a una firma de
aprobación de Daniel ni de otra persona; esa distinción figura en los Issues.

La solicitud #40 no acepta en bloque 23 paquetes ni avisos presentes/futuros:
debe desglosarse por riesgo, responsable y advisory antes de cualquier decisión.
Una credencial real expuesta debe revocarse/rotarse; una solicitud no lo sustituye.

## Evidencia de origen

- [PR #20, ejecución 43493723747](https://github.com/Dani-develop/larutica-frontend/actions/runs/43493723747), commit `f603bdd7ed9fbe1a05dd98df1b8dcac5ba40128f`.
- [PR #21, ejecución 43494226457](https://github.com/Dani-develop/larutica-frontend/actions/runs/43494226457), commit `6c354ff14ff93a30a7d3e20c057a9380c6aabef5`.
- Resultados: 5 coincidencias Gitleaks y 88 asociaciones OSV en 23 paquetes/versiones.

Las decisiones y la evidencia completa se mantienen en las solicitudes enlazadas;
esta página no duplica los reportes ni contiene secretos.
