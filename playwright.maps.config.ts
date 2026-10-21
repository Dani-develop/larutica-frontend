import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/maps',testMatch:'journey.spec.ts',fullyParallel:false,workers:1,
  outputDir:'test-results/maps-browser',
  timeout:30000,expect:{timeout:10000},retries:0,
  reporter:[['list'],['html',{outputFolder:'playwright-report/maps',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4175',trace:'retain-on-failure',screenshot:'only-on-failure',
    launchOptions:{args:['--enable-webgl','--enable-unsafe-swiftshader']}},
  projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 7']}}],
  webServer:{command:'node scripts/prepare-map-worker.mjs && node node_modules/vite/bin/vite.js --config tests/maps/vite.config.ts',url:'http://127.0.0.1:4175',reuseExistingServer:false,timeout:30000},
});
