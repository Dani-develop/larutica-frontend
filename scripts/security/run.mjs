import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const tool = process.argv[2];
const recorded = ['semgrep', 'gitleaks', 'osv'].includes(tool);
const report = `outputs/security/${tool}.json`;
const receipt = `outputs/security/${tool}.status.json`;
const startedAt = new Date().toISOString();
if (recorded) {
  mkdirSync('outputs/security', { recursive: true });
  rmSync(report, { force: true });
  rmSync(receipt, { force: true });
}

// WSL hereda el directorio actual traducido, incluso si contiene espacios.
const args = ['scripts/security/scan.sh', ...process.argv.slice(2)];
const result = process.platform === 'win32'
  ? spawnSync('wsl', ['-d', 'Ubuntu', '--', 'bash', ...args], { stdio: 'inherit' })
  : spawnSync('bash', args, { stdio: 'inherit' });
if (result.error) console.error(`No se pudo iniciar el análisis: ${result.error.message}`);
if (recorded) {
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const changes = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  writeFileSync(receipt, JSON.stringify({
    tool,
    commit: commit.status === 0 ? commit.stdout.trim() : null,
    workingTreeDirty: changes.status !== 0 || changes.stdout.trim().length > 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status ?? 2,
    reportSha256: existsSync(report) ? createHash('sha256').update(readFileSync(report)).digest('hex') : null,
  }, null, 2) + '\n');
}
process.exit(result.status ?? 2);
