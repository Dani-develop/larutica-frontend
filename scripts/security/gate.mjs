import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function evaluate(tool, report, receipt, commit, digest) {
  if (receipt.tool !== tool || !commit || receipt.commit !== commit || receipt.reportSha256 !== digest || receipt.workingTreeDirty !== false) {
    throw new Error('Evidencia ausente, alterada o de otro commit');
  }
  let findings;
  let scanned;
  let details;
  if (tool === 'semgrep') {
    if (!Array.isArray(report.results) || !Array.isArray(report.errors) || !report.paths?.scanned?.length) {
      throw new Error('Reporte SAST inválido o sin archivos analizados');
    }
    if (report.errors.length) throw new Error('SAST incompleto: contiene errores');
    if (report.results.some(item => !item.check_id || !item.path || !Number.isInteger(item.start?.line))) throw new Error('Resultado SAST inválido');
    findings = report.results.length;
    scanned = report.paths.scanned.length;
    details = report.results.map(item => ({ rule: item.check_id, file: item.path, line: item.start?.line }));
  } else if (tool === 'gitleaks') {
    if (!Array.isArray(report)) throw new Error('Reporte de secretos inválido');
    if (report.some(item => !item.RuleID || !item.File || !Number.isInteger(item.StartLine))) throw new Error('Resultado de secretos inválido');
    findings = report.length;
    details = report.map(item => ({ rule: item.RuleID, file: item.File, line: item.StartLine }));
  } else if (tool === 'osv') {
    if (!Array.isArray(report.results)) throw new Error('Reporte SCA inválido');
    const packages = report.results.flatMap(source => {
      if (!Array.isArray(source.packages)) throw new Error('Paquetes SCA ausentes');
      return source.packages;
    });
    if (!packages.length) throw new Error('SCA incompleto: ningún paquete analizado');
    if (packages.some(pkg => !pkg.package?.name || !pkg.package?.version || (pkg.vulnerabilities !== undefined && !Array.isArray(pkg.vulnerabilities)))) {
      throw new Error('SCA incompleto: identidad o vulnerabilidades inválidas');
    }
    if (packages.some(pkg => pkg.vulnerabilities?.some(item => !item.id))) throw new Error('Identificador SCA ausente');
    scanned = packages.length;
    findings = packages.reduce((count, pkg) => count + (pkg.vulnerabilities?.length ?? 0), 0);
    details = packages.filter(pkg => pkg.vulnerabilities?.length).map(pkg => ({
      name: pkg.package.name,
      version: pkg.package.version,
      advisories: pkg.vulnerabilities.map(item => item.id),
    }));
  } else {
    throw new Error('Herramienta desconocida');
  }
  if (![0, 1].includes(receipt.exitCode)) throw new Error('Error operativo del analizador');
  if (receipt.exitCode !== (findings ? 1 : 0)) throw new Error('Código de salida inconsistente con el reporte');
  return { tool, state: findings ? 'bloqueado' : 'sin-hallazgos', findings, ...(scanned ? { scanned } : {}), details, commit };
}

export function main() {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const commit = git.status === 0 ? git.stdout.trim() : null;
  let failed = false;
  mkdirSync('outputs/security/ci', { recursive: true });
  for (const tool of ['semgrep', 'gitleaks', 'osv']) {
    let summary;
    try {
      const bytes = readFileSync(`outputs/security/${tool}.json`);
      const receipt = JSON.parse(readFileSync(`outputs/security/${tool}.status.json`, 'utf8'));
      summary = evaluate(tool, JSON.parse(bytes), receipt, commit, createHash('sha256').update(bytes).digest('hex'));
      // Conservar evidencia de integridad, no líneas de código ni secretos.
      summary.reportSha256 = receipt.reportSha256;
      summary.startedAt = receipt.startedAt;
      summary.finishedAt = receipt.finishedAt;
      if (summary.findings) failed = true;
    } catch {
      failed = true;
      summary = { tool, state: 'incompleto', commit };
    }
    writeFileSync(`outputs/security/ci/${tool}.json`, JSON.stringify(summary, null, 2) + '\n');
    console.log(`${tool}: ${summary.state}${summary.findings !== undefined ? ` (${summary.findings})` : ''}`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
