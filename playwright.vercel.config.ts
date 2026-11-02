import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/vercel',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.LARUTICA_TEST_URL ?? 'http://127.0.0.1:3101',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
