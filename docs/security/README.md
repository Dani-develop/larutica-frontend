# Trabajo de seguridad de Daniel

- **2.3:** [Instalación, alcance y demo local](analisis-local.md), [clasificación inicial](triage-local-2.3.md).
- **3.2:** [Política y workflow de CI](analisis-ci.md), [evidencia real de Actions](evidencia-actions-3.2.md).
- **5.6:** [Procedimiento y estado real de excepciones](excepciones.md).
- **Hallazgos:** [tratamiento H-01..H-07](hallazgos-h01-h07.md) y
  [evidencia consolidada H-04/H-05/H-06](tratamiento-h-04-h-06.md).

Ramas encadenadas: `seg/2.3-semgrep-gitleaks` →
`seg/3.2-analisis-seguridad-ci` → `seg/5.6-excepciones-seguridad`.
PR publicados: [2.3 #18](https://github.com/Dani-develop/larutica-frontend/pull/18)
y [3.2 #20](https://github.com/Dani-develop/larutica-frontend/pull/20).
Actions 3.2 ejecutado y verificado; sigue bloqueando por hallazgos.
No marcar Listo sin evidencia y revisión del integrante asignado.

Para mantener revisiones separadas, la base propuesta del PR 5.6 es
`seg/3.2-analisis-seguridad-ci`. Los PR #18 y #20 se observaron contra `main`;
si se necesita aislar la revisión del #20, Daniel puede cambiar su base a la rama
del 2.3 mientras ese PR no se haya integrado. No se cambia la base remotamente
por este trabajo. Integrar en orden 2.3 → 3.2 → 5.6 y ajustar bases según se
fusionen. No usar `git push --all`: existe una rama
previa de revisión que no pertenece a estos tres ítems.
