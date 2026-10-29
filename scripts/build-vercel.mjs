import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const args of [
  ['scripts/check-runtime.mjs'],
  ['scripts/prepare-map-worker.mjs'],
  ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.vercel.config.ts'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: fileURLToPath(root), stdio: 'inherit',
    env: { ...process.env, NITRO_PRESET: 'vercel', LARUTICA_REMOTE_API_ORIGIN: '' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
