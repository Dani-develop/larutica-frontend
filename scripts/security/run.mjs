import { spawnSync } from 'node:child_process';

// WSL hereda el directorio actual traducido, incluso si contiene espacios.
const args = ['scripts/security/scan.sh', ...process.argv.slice(2)];
const result = process.platform === 'win32'
  ? spawnSync('wsl', ['-d', 'Ubuntu', '--', 'bash', ...args], { stdio: 'inherit' })
  : spawnSync('bash', args, { stdio: 'inherit' });
if (result.error) console.error(`No se pudo iniciar el análisis: ${result.error.message}`);
process.exit(result.status ?? 2);
