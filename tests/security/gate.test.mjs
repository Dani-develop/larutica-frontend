import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../../scripts/security/gate.mjs';

const commit = 'test-commit';
const digest = 'test-digest';
const reports = {
  semgrep: { results: [], errors: [], paths: { scanned: ['app/test.ts'] } },
  gitleaks: [],
  osv: { results: [{ packages: [{ package: { name: 'fixture', version: '1.0.0' } }] }] },
};
const receipt = (tool, exitCode = 0) => ({ tool, commit, reportSha256: digest, exitCode, workingTreeDirty: false });
for (const tool of Object.keys(reports)) {
  test(`${tool}: aprueba reporte válido sin hallazgos`, () => {
    assert.equal(evaluate(tool, reports[tool], receipt(tool), commit, digest).state, 'sin-hallazgos');
  });
  test(`${tool}: rechaza evidencia de otro commit, alterada o sin ejecución`, () => {
    for (const invalid of [{ commit: 'old' }, { reportSha256: 'wrong' }, { exitCode: 127 }, { workingTreeDirty: true }]) {
      assert.throws(() => evaluate(tool, reports[tool], { ...receipt(tool), ...invalid }, commit, digest));
    }
  });
}
test('SAST: no aprueba un error de parsing ni cero archivos', () => {
  for (const report of [{ ...reports.semgrep, errors: [{}] }, { ...reports.semgrep, paths: { scanned: [] } }]) {
    assert.throws(() => evaluate('semgrep', report, receipt('semgrep'), commit, digest));
  }
});
test('SCA: no aprueba cero paquetes o esquema inválido', () => {
  for (const report of [{ results: [] }, {}, { results: [{}] }, { results: [{ packages: [{}] }] }]) {
    assert.throws(() => evaluate('osv', report, receipt('osv'), commit, digest));
  }
});
test('los tres analizadores bloquean hallazgos y exigen código 1', () => {
  const dirty = {
    semgrep: { ...reports.semgrep, results: [{ check_id: 'test-rule', path: 'app/test.ts', start: { line: 1 } }] },
    gitleaks: [{ RuleID: 'test-rule', File: 'test.txt', StartLine: 1 }],
    osv: { results: [{ packages: [{ package: { name: 'fixture', version: '1.0.0' }, vulnerabilities: [{ id: 'TEST-ONLY' }] }] }] },
  };
  for (const [tool, report] of Object.entries(dirty)) {
    assert.equal(evaluate(tool, report, receipt(tool, 1), commit, digest).state, 'bloqueado');
    assert.throws(() => evaluate(tool, report, receipt(tool), commit, digest));
  }
});
test('el artefacto de secretos nunca copia Match, Secret ni contexto', () => {
  const report = [{ RuleID: 'fixture', File: 'fixture.txt', StartLine: 1, Secret: 'NO_PUBLICAR', Match: 'NO_PUBLICAR' }];
  const summary = evaluate('gitleaks', report, receipt('gitleaks', 1), commit, digest);
  assert.doesNotMatch(JSON.stringify(summary), /NO_PUBLICAR|Secret|Match/);
});
test('CLI sin reportes deja tres resultados incompletos y falla', () => {
  const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Temp', 'opencode') : tmpdir();
  const directory = mkdtempSync(join(base, 'larutica-gate-test-'));
  try {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/security/gate.mjs', import.meta.url))], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    for (const tool of Object.keys(reports)) {
      assert.equal(JSON.parse(readFileSync(join(directory, 'outputs/security/ci', `${tool}.json`), 'utf8')).state, 'incompleto');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
