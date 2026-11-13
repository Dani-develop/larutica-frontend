# Evidencia de GitHub Actions — 3.2

Fecha: **2026-11-13**. Responsable: Daniel. Revisión de Axel: **pendiente**.

- [Ejecución real 43457663931](https://github.com/Dani-develop/larutica-frontend/actions/runs/43457663931).
- Commit ejecutado: [`ed7dc63c83dd5d799935c5f944ae6db27070eaac`](https://github.com/Dani-develop/larutica-frontend/commit/ed7dc63c83dd5d799935c5f944ae6db27070eaac).
- Evento: push a `seg/3.2-analisis-seguridad-ci`.
- Artefacto: `seguridad-ed7dc63c83dd5d799935c5f944ae6db27070eaac-1`, ID `14055166079`.
- Resultado global: **failure por hallazgos bloqueantes**, no una versión aprobada.

## Resultados comprobados

Daniel descargó el artefacto autenticado en GitHub. Se revisaron sus tres JSON
sanitizados, que coinciden en el commit de esta ejecución. No se copian reportes
completos al repositorio ni valores de secretos.

| Control | Evidencia en el reporte | Resultado |
|---|---|---|
| Semgrep CE | `semgrep.json`: 436 archivos, 0 hallazgos, estado `sin-hallazgos` | Ejecución correcta |
| Gitleaks | `gitleaks.json`: 5 coincidencias, estado `bloqueado` | Bloqueo por coincidencias; ver clasificación 2.3 |
| OSV-Scanner | `osv.json`: 838 paquetes, 23 paquetes/versiones con avisos, 88 asociaciones y 81 avisos únicos; estado `bloqueado` | Bloqueo por vulnerabilidades reportadas, no explotabilidad demostrada |

La API de Actions confirmó instalación, pruebas del gate, pruebas de contexto
y SAST correctos; pasos de Gitleaks, OSV y gate fallidos; subida del artefacto
correcta. Los tres reportes tienen resultados, ninguno figura `incompleto`.
Así se distingue un bloqueo por hallazgos de un fallo operativo o análisis ausente.
Esto demuestra el funcionamiento del control **3.2**, no la seguridad de toda
la aplicación ni autorización para integrar la rama.

SHA-256 calculados sobre los archivos **sanitizados descargados**:

- `semgrep.json`: `b083230cc08ee903978c5d3dcef17ab13a8f880b6e9170e6f624da444aa13eba`.
- `gitleaks.json`: `e32d934c7108870abd0627260fa11aedb298e6c579b32e50355d72286f0cdbcd`.
- `osv.json`: `275e0ccb13f553909ad6ced71442f19b5e27949b31df31c71fb1c44e9b3d6aac`.

El campo `reportSha256` dentro de cada JSON corresponde al original del runner,
no al archivo sanitizado. No confundir ambos hashes ni afirmar que aquí se
descargaron los originales. Los artefactos tienen retención de 14 días; conservar
la descarga autorizada y esta referencia para la revisión.

## Pendientes

- Abrir el PR **Draft** del 3.2 con base `seg/2.3-semgrep-gitleaks`, sin duplicar el 2.3.
- Axel debe revisar ejecución, artefactos y política; no se marca su aprobación.
- Investigar/tratar hallazgos en el registro único 7.5. Sin supresiones ni aceptación automática.
- Pablo debe configurar protección de ramas en 3.5 para exigir el check.
- Mantener el PR como Draft según lo solicitado por Daniel. No hacer merge con estos bloqueos.
