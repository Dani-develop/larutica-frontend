import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/maps',testMatch:'runtime.spec.ts',workers:1,retries:0,timeout:60000,
  outputDir:'test-results/maps-runtime',
  reporter:[['list']],
  use:{baseURL:'http://localhost:3000',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--enable-webgl','--enable-unsafe-swiftshader']}},
  projects:[{name:'vinext-desktop',use:{...devices['Desktop Chrome']}},{name:'vinext-mobile',use:{...devices['Pixel 7']}}],
  webServer:{command:'npm run dev -- --port 3000 --hostname localhost',url:'http://localhost:3000/login',reuseExistingServer:!process.env.CI,timeout:120000},
});
