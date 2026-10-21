import assert from "node:assert/strict";
import test from "node:test";

let worker;

async function render(pathname) {
  worker ??= (await import(new URL(`../dist/server/index.js?test=${process.pid}`, import.meta.url))).default;
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}
for (const [pathname, expected] of [
  ["/", "Encuentra tours"],
  ["/experiencias/00000000-0000-4000-8000-000000000001", "Consultando disponibilidad"],
  ["/login", "Iniciar sesión"],
  ["/register", "Crear cuenta"],
  ["/forgot-password", "Recuperar contraseña"],
  ["/update-password", "Nueva contraseña"],
  ["/dashboard", "Validando sesión"],
  ...['/dashboard/my-agency','/dashboard/my-agency/new','/dashboard/my-agency/edit','/dashboard/users','/dashboard/users/new','/dashboard/users/00000000-0000-4000-8000-000000000001','/dashboard/users/00000000-0000-4000-8000-000000000001/edit','/dashboard/agencies','/dashboard/agencies/new','/dashboard/agencies/00000000-0000-4000-8000-000000000001','/dashboard/agencies/00000000-0000-4000-8000-000000000001/edit','/dashboard/publications','/dashboard/publications/new','/dashboard/publications/00000000-0000-4000-8000-000000000001','/dashboard/publications/00000000-0000-4000-8000-000000000001/edit','/dashboard/reservations','/dashboard/profile','/dashboard/reviews','/dashboard/promotions','/dashboard/destinations','/dashboard/graficas'].map(path => [path, 'Validando sesión']),
  ['/terminos', 'LaRutica'],
  ['/privacidad', 'Política de privacidad'],
]) {
  test(`renderiza ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), new RegExp(expected, "i"));
  });
}

for (const [query, expected] of [
  ['', '/?viaje=reservas'],
  ['?reserva=reserva-123', '/?viaje=reservas&reserva=reserva-123'],
  ['?reserva=reserva-123&existente=1', '/?viaje=reservas&reserva=reserva-123&existente=1'],
  ['?existente=0&next=https%3A%2F%2Fexample.com', '/?viaje=reservas'],
  ['?reserva=primera&reserva=segunda&existente=1&existente=0', '/?viaje=reservas&reserva=primera&existente=1'],
  ['?reserva=a%26existente%3D1', '/?viaje=reservas&reserva=a%26existente%3D1'],
]) {
  test(`redirige el enlace antiguo de reservas ${query || 'sin parámetros'}`, async () => {
    const response = await render(`/mis-reservas${query}`);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), expected);
  });
}
