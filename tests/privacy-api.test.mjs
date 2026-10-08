import assert from "node:assert/strict";
import test from "node:test";

test("la API rechaza registros sin consentimiento antes de contactar al backend", async (t) => {
  const names = ["LARUTICA_REMOTE_API_ORIGIN", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  t.after(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
  process.env.LARUTICA_REMOTE_API_ORIGIN = "https://privacy-backend.example.invalid";
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const upstream = t.mock.method(globalThis, "fetch", async () => Response.json({ data: { requiresEmailConfirmation: true } }, { status: 201 }));
  const worker = (await import(new URL("../dist/server/index.js", import.meta.url))).default;

  async function register(body) {
    return worker.fetch(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  }

  const body = {
    role: "Viajero", fullName: "Prueba Privacidad", email: "privacy@example.invalid",
    phone: "", companyName: "", password: "Password123!", confirmPassword: "Password123!",
    privacyPolicyVersion: "2026-10-07",
  };
  for (const accepted of [undefined, false, "true"]) {
    const response = await register({ ...body, acceptPrivacyPolicy: accepted });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Debes aceptar la política de privacidad/);
  }
  assert.equal(upstream.mock.callCount(), 0);
  const outdated = await register({ ...body, acceptPrivacyPolicy: true, privacyPolicyVersion: "2020-01-01" });
  assert.equal(outdated.status, 400);
  assert.equal(upstream.mock.callCount(), 0);
  const accepted = await register({ ...body, acceptPrivacyPolicy: true });
  assert.equal(accepted.status, 201);
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(JSON.parse(new TextDecoder().decode(upstream.mock.calls[0].arguments[1].body)).acceptPrivacyPolicy, true);
});
