import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = 'Dani-develop/larutica-frontend';

// Inventario de solo lectura, NO registro paralelo ni validador de aprobaciones.
export async function inventory(getPage) {
  let issues = 0;
  const candidates = [];
  for (let page = 1; page <= 100; page++) {
    const entries = await getPage(page);
    if (!Array.isArray(entries)) throw new Error('Respuesta de Issues inválida');
    for (const issue of entries) {
      if (issue.pull_request) continue;
      if (!Number.isInteger(issue.number) || typeof issue.title !== 'string' || !['open', 'closed'].includes(issue.state)) {
        throw new Error('Issue incompleto');
      }
      issues++;
      const labels = (issue.labels ?? []).map(label => typeof label === 'string' ? label : label.name);
      const text = `${issue.title} ${labels.join(' ')}`;
      const id = issue.title.match(/\bE-\d+\b/i)?.[0]?.toUpperCase() ?? null;
      if (id || /excepci[oó]n|exception|E-pendiente/i.test(text)) {
        // No conservar cuerpo, valores, comentarios ni nombres de personas.
        candidates.push({ number: issue.number, id, state: issue.state, url: `https://github.com/${repository}/issues/${issue.number}` });
      }
    }
    if (entries.length < 100) {
      return { repository, issuesVisible: issues, exceptionCandidates: candidates, registryConfirmedByOwner: false, approvalsVerified: false };
    }
  }
  throw new Error('Inventario excede el límite: no afirmar consulta completa');
}

export async function main() {
  const file = 'outputs/security/excepciones-inventario.json';
  mkdirSync('outputs/security', { recursive: true });
  rmSync(file, { force: true });
  try {
    const result = await inventory(async page => {
      const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'LaRutica-5.6-read-only' },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`GitHub respondió HTTP ${response.status}`);
      return response.json();
    });
    writeFileSync(file, JSON.stringify({ ...result, checkedAt: new Date().toISOString(), state: 'consulta-completa-confirmacion-humana-pendiente' }, null, 2) + '\n');
    console.log(`Issues visibles: ${result.issuesVisible}; candidatos a excepción: ${result.exceptionCandidates.length}.`);
    console.log('Consulta de solo lectura correcta; NO acredita ausencia de excepciones del equipo ni aprobación humana.');
    return 0;
  } catch {
    writeFileSync(file, JSON.stringify({ repository, state: 'incompleto', checkedAt: new Date().toISOString() }, null, 2) + '\n');
    console.error('INCOMPLETO: no se pudo consultar todo el inventario. No interpretar como cero excepciones.');
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
