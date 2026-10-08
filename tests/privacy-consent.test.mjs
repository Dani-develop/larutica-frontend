import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { FormApi, FieldApi } from "@tanstack/react-form";
import { createServer } from "vite";

let server;
let schema;
let version;

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("../", import.meta.url)),
    resolve: { alias: { "@": fileURLToPath(new URL("../", import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
  });
  schema = (await server.ssrLoadModule("/modules/auth/validators/authValidators.ts")).signUpValidators;
  version = (await server.ssrLoadModule("/lib/privacyPolicy.ts")).PRIVACY_POLICY_VERSION;
});

after(async () => { await server?.close(); });

function registration(role = "Viajero") {
  return {
    role,
    fullName: "Prueba Registro",
    email: "privacy@example.invalid",
    phone: role === "Viajero" ? "" : "+50688888888",
    companyName: role === "Viajero" ? "" : "Servicio Prueba",
    password: "Password123!",
    confirmPassword: "Password123!",
    acceptPrivacyPolicy: false,
    privacyPolicyVersion: version,
  };
}

test("el esquema rechaza consentimiento ausente, falso o enviado como texto", () => {
  for (const role of ["Viajero", "Agencia", "Transporte"]) {
    for (const consent of [undefined, false, "true", "false", 1]) {
      const result = schema.safeParse({ ...registration(role), acceptPrivacyPolicy: consent });
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "acceptPrivacyPolicy"));
    }
    assert.equal(schema.safeParse({ ...registration(role), acceptPrivacyPolicy: true }).success, true);
  }
});

test("la aceptación debe corresponder a la versión vigente", () => {
  const result = schema.safeParse({ ...registration(), acceptPrivacyPolicy: true, privacyPolicyVersion: "2020-01-01" });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "privacyPolicyVersion"));
});

test("TanStack muestra el error de Zod en onSubmit y bloquea la creación de cuenta", async () => {
  let submissions = 0;
  const form = new FormApi({
    defaultValues: registration(),
    validators: { onSubmit: schema },
    onSubmit: () => { submissions++; },
  });
  const unmountForm = form.mount();
  const field = new FieldApi({ form, name: "acceptPrivacyPolicy" });
  const unmountField = field.mount();
  try {
    await form.handleSubmit();
    assert.equal(submissions, 0);
    assert.equal(field.state.meta.isTouched, true);
    assert.equal(field.state.meta.isValid, false);
    assert.match(field.state.meta.errors[0].message, /Debes aceptar la política de privacidad/);
    field.handleChange(true);
    await form.handleSubmit();
    assert.equal(submissions, 1);
    assert.equal(field.state.meta.isValid, true);
    field.handleChange(false);
    await form.handleSubmit();
    assert.equal(submissions, 1);
  } finally {
    unmountField();
    unmountForm();
  }
});
