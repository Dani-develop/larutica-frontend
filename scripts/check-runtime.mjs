import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const minimum = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(manifest.engines.node);
if (!minimum) throw new Error('Revisar check-runtime.mjs al cambiar el formato de engines.node.');
const required = minimum.slice(1).map(Number);
const actual = process.versions.node.split('.').map(Number);
const difference = actual.map((value, index) => value - required[index]).find(value => value !== 0) ?? 0;

if (difference < 0) {
  console.error(`LaRutica requiere Node.js ${manifest.engines.node}. Tu terminal usa ${process.version}.`);
  console.error(`Ejecutable actual: ${process.execPath}`);
  console.error('Usa Node 24 (version de referencia del equipo), cierra y abre la terminal y ejecuta npm ci.');
  process.exit(1);
}

try {
  await import('rolldown');
  console.log(`Entorno compatible: Node ${process.versions.node}; Rolldown disponible para ${process.platform}/${process.arch}.`);
} catch (error) {
  console.error('No se pudo cargar Rolldown y su modulo nativo para esta computadora.');
  console.error('Con Node compatible, ejecuta npm ci y vuelve a intentar. Conserva package-lock.json.');
  const code = error?.code ?? error?.cause?.code;
  if (code) console.error(`Codigo del cargador: ${code}`);
  process.exitCode = 1;
}
