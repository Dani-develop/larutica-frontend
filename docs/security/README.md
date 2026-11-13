# Trabajo de seguridad de Daniel

- **2.3:** [Instalación, alcance y demo local](analisis-local.md), [clasificación inicial](triage-local-2.3.md).
- **3.2:** [Política y workflow de CI](analisis-ci.md), [evidencia local](evidencia-local-3.2.md).
- **5.6:** [Procedimiento y estado real de excepciones](excepciones.md).

Ramas locales encadenadas: `seg/2.3-semgrep-gitleaks` →
`seg/3.2-analisis-seguridad-ci` → `seg/5.6-excepciones-seguridad`.
No hay push, PR ni ejecuciones de Actions creados por este trabajo.
No marcar Listo sin evidencia y revisión del integrante asignado.

Para mantener revisiones separadas cuando Daniel autorice subirlas, la base
inicial del PR 2.3 será `main`, la del PR 3.2 será `seg/2.3-semgrep-gitleaks`
y la del PR 5.6 será `seg/3.2-analisis-seguridad-ci`. Integrar en ese orden y
ajustar las bases según se fusionen. No usar `git push --all`: existe una rama
previa de revisión que no pertenece a estos tres ítems.
