# LaRutica — qué debemos tener y qué ejecutar

Todo en orden de fase. Ejecutar desde la raíz del repo (`larutica-frontend`).
Corte: 13-nov-2026 · `main` = `1ad8b66` · código entregado = `4f1e8c7`.
✔ = comando probado en esta máquina el 13-nov.

> Si algo falla o no corre, se reporta como **incompleto**, no como aprobado. Sin secretos en pantalla ni en capturas.

---

## 0 · Preparación (una sola vez)

**Código al día, Node 24 y dependencias exactas del lockfile** — esperado: Node ≥ 22.13 (equipo: 24), sin `EBADENGINE`.

```bash
git pull --ff-only origin main
node --version
npm ci
npm run runtime:check
npx playwright install chromium
```

**GitHub CLI con sesión** — esperado: sesión activa en github.com.

```bash
gh auth status
```

**Herramientas de seguridad en el PATH** (macOS: Homebrew; Windows: WSL) — esperado: las tres imprimen versión (fijadas: Semgrep 1.185.0, Gitleaks 8.30.1, OSV 2.7.1).

```bash
semgrep --version && gitleaks version && osv-scanner --version
# Windows: wsl -d Ubuntu -- bash scripts/security/install.sh
```

---

## 1 · Planificación

### 1.1 — Tres flujos críticos
**Debemos tener:** F-01 login, F-02 pago, F-03 reservas, con criterios Dado/Cuando/Entonces de éxito, error y abuso.
**Esperado:** ✔ **19** criterios. Q-01 abierta.

```bash
open docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md
grep -oE "F0[123]-[CEA][0-9]" docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md | sort -u | wc -l
```

### 1.3 — Modelo de amenazas STRIDE
**Debemos tener:** modelo en Threat Dragon con 7 amenazas, impacto, prioridad y control.
**Esperado:** ✔ **7** amenazas (T-01…T-07).

```bash
open docs-proyecto-seguridad/fase-1-planificacion/larutica-diagrama.png
grep -c '"title": "T-0' docs-proyecto-seguridad/fase-1-planificacion/larutica-threat-dragon.json
# Editar: threatdragon.com → sesión local → abrir el JSON (v2.6.2)
```

---

## 2 · Desarrollo

### 2.3 — Semgrep CE y Gitleaks en local
**Debemos tener:** análisis locales y una demo que prueba que detectan (defecto y secreto ficticio).
**Esperado:** ✔ `DEMO_OK` (1/1 → 0/0) · Semgrep 0 hallazgos · Gitleaks *no leaks found*.

```bash
npm run security:demo
npm run security:code
npm run security:secrets
npm run security:context      # 3/3 pruebas de contexto
```

### 2.6 — Revisión de código con IA
**Debemos tener:** instrucciones, salida, diff y decisión humana por hallazgo.
**Esperado:** AI-01 resuelta · AI-02 aceptada · **AI-03 abierta** (Threat Dragon).

```bash
ls docs-proyecto-seguridad/evidencia/2.6-*
open docs-proyecto-seguridad/evidencia/2.6-decision-humana.md
```

---

## 3 · Construcción e integración (CI)

### 3.1 — CI por PR
**Debemos tener:** `npm ci`, lint, TypeScript, build, pruebas y job E2E (Ubuntu + Windows) en cada PR.
**Esperado:** ✔ último run *success* sobre `1ad8b66` (43525412488). Lint 0 errores.

```bash
gh run list -R Dani-develop/larutica-frontend -w "Validar proyecto" -L 3
npm run lint && npx tsc --noEmit && npm test
```

### 3.2 — Semgrep + Gitleaks + OSV en CI con compuerta
**Debemos tener:** los tres análisis en CI; lo ausente o incompleto cuenta como fallo.
**Esperado:** ✔ `test:security` 11/11 · gate devuelve 0 · CI *success* sobre `1ad8b66` (43525412490).

```bash
npm run test:security
# Con el árbol limpio y con ";" (no "&&"), para no ocultar resultados:
npm run security:code; npm run security:secrets; npm run security:deps; npm run security:gate
gh run list -R Dani-develop/larutica-frontend -w "Analisis de seguridad (3.2)" -L 3
```

### 3.5 — Protección de ramas y permisos del pipeline ⚠ ruleset desactivado
**Debemos tener:** PR + 1 aprobación + CODEOWNER + 3 checks; permisos mínimos y acciones fijadas por SHA.
**Esperado:** ✔ hoy `enforcement: disabled`. Meta: `active` (ver sección 6, punto 8).

```bash
gh api repos/Dani-develop/larutica-frontend/rulesets --jq '.[] | {id,name,enforcement}'
cat .github/CODEOWNERS
grep -n "permissions" -A1 .github/workflows/*.yml | head -30
```

---

## 4 · Pruebas

### 4.4 — E2E con Playwright
**Debemos tener:** E2E de F-01, F-02 y F-03, cada prueba enlazada a su criterio.
**Esperado:** **19 passed** (~20 s).

```bash
npm run build:vercel
CI=true npm run test:e2e
npx playwright show-report
```

### 4.5 — Pruebas de autorización
**Debemos tener:** pruebas por rol, propiedad y sin sesión, directo a la API.
**Esperado:** ✔ **8 pass**, 0 fail (~2 s).

```bash
npm run test:authorization
```

### 4.7 — DAST con ZAP ⚠ sin ejecutar
**Debemos tener:** plan reproducible, sesión autenticada y reporte.
**Esperado:** hoy incompleta, sin reporte. Meta: artefacto HTML (sección 6, punto 1).

```bash
head -40 .zap/larutica.yaml
gh run list -R Dani-develop/larutica-frontend -w "DAST ZAP aislado" -L 3
```

---

## 5 · Versión, despliegue y operación

### 5.3 — Resumen de cambios y limitaciones
**Debemos tener:** resumen sobre un SHA exacto, sin afirmar de más.
**Esperado:** ✔ diff **vacío** (el código entregado no cambió) · `ANCESTRO_OK`.

```bash
git diff --stat 4f1e8c7 HEAD -- . ':!docs-proyecto-seguridad'
git merge-base --is-ancestor 4f1e8c7 HEAD && echo ANCESTRO_OK
```

### 5.6 — Excepciones de seguridad ⚠ #38 y #39 sin aprobar
**Debemos tener:** excepciones abiertas en el registro, con responsable, aprobación y fecha.
**Esperado:** `test:exceptions` 5/5 · lista solicitudes sin aprobar.

```bash
npm run security:exceptions
npm run test:exceptions
gh issue view 38 -R Dani-develop/larutica-frontend
gh issue view 39 -R Dani-develop/larutica-frontend
```

### 6.5 — Comprobaciones post-despliegue ⚠ sin correr en Vercel
**Debemos tener:** health check + smoke test contra la app desplegada, ligados a URL y commit.
**Esperado:** meta: run *success* con artefacto `post-deploy-<id>` (sección 6, punto 2).

```bash
gh run list -R Dani-develop/larutica-frontend -w "Comprobaciones post-despliegue" -L 3
```

### 7.5 — Registro único de hallazgos
**Debemos tener:** GitHub Issues H-01…H-07 con estado, severidad, responsable y enlaces.
**Esperado:** H-01, H-03, H-04, H-07 abiertos · H-02 cerrado · H-05 y H-06 corregidos (cerrar #34 y #33).

```bash
gh issue list -R Dani-develop/larutica-frontend --state all --search "H-0" -L 20
open docs-proyecto-seguridad/evidencia/registro-hallazgos.md
```

### 7.6 — Renovate y reescaneos ⚠ cron sin correr
**Debemos tener:** Renovate con PR reales bajo los mismos controles + reescaneo semanal con `cron`.
**Esperado:** config válida · PR #35, #36, #43, #44 fusionados · `cron: "0 12 * * 1"` (primera corrida lun 16-nov).

```bash
npx --yes --package renovate renovate-config-validator renovate.json
gh pr list -R Dani-develop/larutica-frontend --state all --search "author:app/renovate"
grep -n "cron" .github/workflows/security.yml
```

---

## 6 · Lo que falta ejecutar (en este orden)

> **El orden importa:** activar el ruleset **al final**; desde ese momento no se puede subir directo a `main`.
> Ninguna de estas ejecuciones se hizo todavía: no afirmarlas como logradas hasta tener la corrida o captura.

### 1. 4.7 · ZAP con sesión (cierra H-01)
Secrets de una cuenta **ficticia** del ambiente aislado y una ejecución exitosa. Requiere permiso de administración del repo. **Nunca** producción, Supabase ni Onvo. El despliegue de Render actual es modo proxy: no sirve como objetivo.
**Guardar:** reporte HTML de ZAP + enlace del run en la ficha 4.7 y en el Issue H-01.

```bash
gh secret set ZAP_USER -R Dani-develop/larutica-frontend
gh secret set ZAP_PASSWORD -R Dani-develop/larutica-frontend
gh workflow run zap.yml -R Dani-develop/larutica-frontend -f target_url=https://<AMBIENTE-AISLADO>/
gh run watch -R Dani-develop/larutica-frontend
gh run download <RUN_ID> -R Dani-develop/larutica-frontend
```

### 2. 6.5 · Post-despliegue sobre el SHA realmente desplegado en Vercel
Primero confirmar en el panel de Vercel qué SHA está desplegado (el workflow no lo verifica).
**Guardar:** `health-evidence.txt` y `smoke-evidence.txt` con URL y commit; enlace del run.

```bash
gh workflow run post-deploy-check.yml -R Dani-develop/larutica-frontend \
  -f target_url=https://larutica-cr.vercel.app -f deployed_commit=<SHA>
gh run watch -R Dani-develop/larutica-frontend
gh run download <RUN_ID> -R Dani-develop/larutica-frontend
```

### 3. 3.2 · Reescaneo manual sobre el SHA final
**Guardar:** run *success* sobre el SHA final. El `cron` corre solo el lun 16-nov.

```bash
gh workflow run security.yml -R Dani-develop/larutica-frontend
gh run list -R Dani-develop/larutica-frontend -w "Analisis de seguridad (3.2)" -L 2
```

### 4. H-03 / H-04 · Confirmaciones del dueño
El dueño del relay confirma entropía del token (o lo rota) y que la clave de `abcccf6` fue solo de pruebas.
**Guardar:** comentario firmado en los Issues #29 y #30.

```bash
gh issue comment 29 -R Dani-develop/larutica-frontend -b "<confirmación del dueño, sin valores secretos>"
gh issue comment 30 -R Dani-develop/larutica-frontend -b "<confirmación>"
```

### 5. Cerrar Issues resueltos (Axel)

```bash
gh issue close 34 -R Dani-develop/larutica-frontend -c "H-05 corregido: 0 avisos react-hooks, lint verde en CI"
gh issue close 33 -R Dani-develop/larutica-frontend -c "H-06 corregido: OSV 0 en CI"
```

### 6. AI-03 · Threat Dragon
Abrir el JSON en Threat Dragon 2.6.2, comprobar T-01…T-07 y exportar el PNG de nuevo.
**Guardar:** PNG regenerado y AI-03 marcado en 2.6 / H-07.

```bash
# Manual: threatdragon.com → Exportar → PNG → reemplazar
# docs-proyecto-seguridad/fase-1-planificacion/larutica-diagrama.png
```

### 7. Un solo repositorio de entrega
✔ Hoy: `HEAD` = `1ad8b66`; el espejo (`upstream`) está en `981b084`, distinto. Decidir cuál se entrega antes de actualizar el documento de Profelink.
**Guardar:** el enlace de Profelink apunta al repo y SHA que se defiende.

```bash
git rev-parse HEAD
git ls-remote upstream main
```

### 8. 3.5 · Activar el ruleset (al final)
Dueño del repo, o Settings → Rules → Rulesets → Enforcement: Active. El `PUT` **no está probado**: si falla, usar Settings. Luego abrir un PR de prueba sin aprobar y capturar el botón de fusión bloqueado.
**Guardar:** captura del PR bloqueado + `enforcement: active` y bypass vacío.

```bash
gh api -X PUT repos/Dani-develop/larutica-frontend/rulesets/27221926 -f enforcement=active
gh api repos/Dani-develop/larutica-frontend/rulesets/27221926 --jq .enforcement
```

---

## 7 · Verificación final antes de entregar

```bash
npm run runtime:check && npm run design:check
npx tsc --noEmit
npm run lint
npm test                      # build + contratos + pagos + correo + autorización
npm run build:vercel && CI=true npm run test:e2e
```

**Esperado:** `DESIGN_OK` · TypeScript sin errores · lint 0 errores (17 avisos `no-img-element`) · `npm test` exit 0 (autorización 8/8, pagos 6/6, correo 40/40 y 68/68) · E2E 19 passed.

---

**Faltan dos datos tuyos:** la URL del ambiente aislado para ZAP (`<AMBIENTE-AISLADO>`) y el SHA desplegado en Vercel para 6.5 (`<SHA>`).
