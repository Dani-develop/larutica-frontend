// Stub mínimo del runtime de Cloudflare para ejecutar el worker compilado
// bajo Node en las pruebas. El runtime real inyecta `env` y `ctx` en cada
// petición; aquí se pasan explícitamente a `worker.fetch`.
export const env = {};
export const tracing = undefined;
export class WorkerEntrypoint {}
export class DurableObject {}
export class RpcTarget {}
