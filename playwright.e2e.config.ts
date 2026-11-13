import { defineConfig } from '@playwright/test';

// E2E de los tres flujos críticos (docs-proyecto-seguridad, ítem 4.4).
// Ambiente aislado y local: la API usa PostgreSQL embebido (PGlite) con datos
// ficticios y Onvo simulado; la interfaz es el build de Vercel. No hay red externa.
// Requiere `npm run build:vercel` antes de ejecutar (ver README de tests/e2e).
const API = 'http://127.0.0.1:4188';
const UI = 'http://127.0.0.1:4190';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results/e2e',
  use: {
    baseURL: UI,
    browserName: 'chromium',
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node --import ./tests/mail/register.mjs tests/qa/checkout-server.mjs',
      url: `${API}/__qa/state`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node tests/qa/production-server.mjs',
      url: `${UI}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
