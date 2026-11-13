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

if (productionHosts.has(host) || host.endsWith('.supabase.co') || host.includes('onvo')) {
  console.error(`Objetivo rechazado por no estar aislado: ${host}`);
  process.exit(3);
}

const allowedHosts = (process.env.ZAP_ALLOWED_HOSTS ?? '')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean);

if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
  console.error(`El host ${host} no está en ZAP_ALLOWED_HOSTS.`);
  process.exit(3);
}

console.log(`Objetivo ZAP aceptado: ${target.origin}`);
