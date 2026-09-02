import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

const originalEnvironment = {
  remote: process.env.LARUTICA_REMOTE_API_ORIGIN,
  secret: process.env.SUPABASE_SECRET_KEY,
  legacySecret: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

test.after(() => {
  for (const [name, value] of Object.entries({
    LARUTICA_REMOTE_API_ORIGIN: originalEnvironment.remote,
    SUPABASE_SECRET_KEY: originalEnvironment.secret,
    SUPABASE_SERVICE_ROLE_KEY: originalEnvironment.legacySecret,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("el proxy conserva same-origin y adapta la cookie para localhost", async (t) => {
  let received;
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      received = {
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
        method: request.method,
        url: request.url,
      };
      response.statusCode = 201;
      response.setHeader("content-type", "application/json");
      response.setHeader("location", "/dashboard");
      response.setHeader(
        "set-cookie",
        "__Host-larutica_session=opaque-token; Path=/; HttpOnly; Secure; SameSite=Strict",
      );
      response.end('{"data":{"ok":true}}');
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");

  process.env.LARUTICA_REMOTE_API_ORIGIN = `http://127.0.0.1:${address.port}`;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  const response = await proxyRemoteApiRequest(new Request(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
      },
      body: '{"email":"viajero@example.com"}',
    },
  ));

  assert.ok(response);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard");
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^larutica_session=opaque-token/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.doesNotMatch(cookie, /;\s*Secure\b/i);
  assert.equal(received.method, "POST");
  assert.equal(received.url, "/api/auth/login");
  assert.equal(received.body, '{"email":"viajero@example.com"}');
  assert.equal(received.headers.origin, `http://127.0.0.1:${address.port}`);
  assert.equal(received.headers["x-larutica-client-origin"], "http://localhost:3000");
});

test("un backend con secreto configurado no se reenvía", async () => {
  process.env.LARUTICA_REMOTE_API_ORIGIN = "https://backend.example.com";
  process.env.SUPABASE_SECRET_KEY = "server-only-test-key";
  const { proxyRemoteApiRequest } = await import("../lib/api/remote-proxy.ts");
  const response = await proxyRemoteApiRequest(new Request(
    "http://localhost:3000/api/auth/session",
  ));
  assert.equal(response, null);
});
