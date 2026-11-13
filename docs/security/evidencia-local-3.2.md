# Evidencia local de 3.2 — 2026-11-13

Commit analizado con árbol limpio:
`ba1c25bb65bc7bd8d64346eaa11205c843bc4e35`.
Ejecución entre 14:59 y 15:01 UTC. **No es una ejecución de GitHub Actions**.

| Comando | Resultado | Salida |
|---|---|---|
| `npm run security:code` | 435 archivos JS/TS, 4 reglas, 0 coincidencias, 0 errores | 0 |
| `npm run security:secrets` | 5 coincidencias; ver clasificación inicial 2.3 | 1 |
| `npm run security:deps` | 838 paquetes; 23 paquetes/versiones con avisos, 88 asociaciones y 81 avisos únicos | 1 |
| `npm run security:gate` | SAST sin hallazgos; secretos y SCA **bloqueados** | 1 |
| `npm run test:security` | 11/11 pruebas aprobadas | 0 |

Los reportes completos permanecen en `outputs/security/` (ignorados) y los
sanitizados en `outputs/security/ci/`. No se copian reportes completos aquí.
Hashes SHA-256 de originales para comprobar integridad de esta ejecución:

- Semgrep: `941ab915e199d2cf324f69b9f734689c0a7b18e80847080f5ad8778856b29c28`.
- Gitleaks: `55138491f73e20c6ac34387f9eea877cf0c8a9b6f6bdd49024f4c61318a405ed`.
- OSV: `a1dc72759302e04f2c4b86f58dd3a1e8473f99a9c9fbcb7ce50cd7848fc3acd1`.

La base de OSV cambia con el tiempo: repetir el análisis puede producir otros
resultados/hashes. Los avisos no prueban explotabilidad, pero sí mantienen el
bloqueo hasta investigar y tratar cada caso. Entre los paquetes reportados están
`react-server-dom-webpack@19.2.6`, `undici@7.24.8`, `vite@8.0.13` y `zod@4.4.3`;
no se aplicaron actualizaciones ni ignores automáticos.

Pendiente: Axel debe trasladar hallazgos al registro único 7.5, investigar
severidad/alcance y coordinar responsables. Las solicitudes del 5.6 no aprueban
ni silencian estos resultados. La ejecución real de Actions, PR y revisión
siguen pendientes hasta que Daniel decida hacer push.
