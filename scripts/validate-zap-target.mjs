const rawTarget = process.argv[2] ?? process.env.ZAP_TARGET_URL;

if (!rawTarget) {
  console.error("ZAP_TARGET_URL es obligatorio.");
  process.exit(2);
}

let target;
try {
  target = new URL(rawTarget);
} catch {
  console.error("ZAP_TARGET_URL no es una URL válida.");
  process.exit(2);
}

if (!['http:', 'https:'].includes(target.protocol)) {
  console.error("El objetivo ZAP debe usar HTTP o HTTPS.");
  process.exit(2);
}

const host = target.hostname.toLowerCase();
const productionHosts = new Set([
  'larutica.com',
  'www.larutica.com',
  'larutica.vercel.app',
]);

const repositoryAllowedHosts = new Set([
  'larutica-frontend-pruebas4-7.onrender.com',
  // Candidato aislado propio (Render Free): Supabase de pruebas y cuenta ficticia, sin proxy a producción.
  'larutica-frontend-entrega.onrender.com',
]);

const normalizeHost = value => value.toLowerCase().replace(/\.+$/, '');
const normalizedHost = normalizeHost(host);

if (productionHosts.has(normalizedHost) || normalizedHost.endsWith('.supabase.co') || normalizedHost.includes('onvo')) {
  console.error(`Objetivo rechazado por no estar aislado: ${normalizedHost}`);
  process.exit(3);
}

if (!repositoryAllowedHosts.has(normalizedHost)) {
  console.error(`El host ${normalizedHost} no está en la lista de candidatos aislados del repositorio.`);
  process.exit(3);
}

const allowedHosts = (process.env.ZAP_ALLOWED_HOSTS ?? '')
  .split(',')
  .map(value => normalizeHost(value.trim()))
  .filter(Boolean);

if (allowedHosts.length > 0 && !allowedHosts.includes(normalizedHost)) {
  console.error(`El host ${normalizedHost} no está en ZAP_ALLOWED_HOSTS.`);
  process.exit(3);
}

console.log(`Objetivo ZAP aceptado: ${target.origin} (${normalizedHost})`);
