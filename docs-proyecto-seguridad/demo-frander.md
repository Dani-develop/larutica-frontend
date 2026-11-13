# Comandos de la demo (Frander)

Ejecutar desde la raíz del repositorio.

## Preparación

```bash
node --version
npm ci
npx playwright install chromium
npm run build:vercel
npm run test:e2e
```

## 1.1 Flujos críticos

```bash
open docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md
grep -n "F02-A2" docs-proyecto-seguridad/fase-1-planificacion/1.1-flujos-criticos.md
grep -n "F02-A2" tests/e2e/f02-compra-pago.spec.ts
```

## 3.1 CI por PR

```bash
npm run runtime:check
npm run design:check
npm run lint
npx --no-install tsc --noEmit
open .github/workflows/validate.yml
gh run list --workflow "Validar proyecto" --limit 5
gh run view --web
```

## 4.4 E2E con Playwright

```bash
npm run test:e2e
npx playwright show-report
```

Por flujo (opcional):

```bash
npx playwright test --config playwright.e2e.config.ts f01-login
npx playwright test --config playwright.e2e.config.ts f02-compra-pago
npx playwright test --config playwright.e2e.config.ts f03-reservas
```
