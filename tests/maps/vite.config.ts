import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('./browser', import.meta.url)),
  envDir: false,
  cacheDir: root + 'node_modules/.cache/maps-tests',
  publicDir: root + 'public',
  resolve: { alias: {'@': root} },
  plugins: [react()],
  server: {host:'127.0.0.1',port:4175,strictPort:true,fs:{allow:[root]}},
});
