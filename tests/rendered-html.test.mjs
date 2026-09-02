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
  ["/login", "Iniciar sesión"],
  ["/register", "Registrarse"],
  ["/forgot-password", "Recuperar contraseña"],
  ["/update-password", "Nueva contraseña"],
  ["/dashboard", "Validando sesión"],
]) {
  test(`renderiza ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), new RegExp(expected, "i"));
  });
}
