import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  RESET_CODE_TTL_MS,
  RESET_CODE_UNBIASED_LIMIT,
  RESET_MAX_ATTEMPTS,
  assessSendWindow,
  buildIssuedRow,
  consumeGrant,
  digestsMatch,
  evaluateCode,
  formatResetCode,
  hmacResetCode,
  preparePasswordChange,
  publicResetLimitMessage,
  resetCodeFromRandom,
} from "../lib/auth/password-reset.ts";
import { passwordResetCodeMessage } from "../lib/mail/messages.ts";
import { english } from "../lib/preferences/messages.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const secret = "reset-test-secret";
const now = Date.parse("2026-10-29T16:00:00.000Z");

test("el código conserva ceros a la izquierda y el hash no guarda los dígitos", async () => {
  assert.equal(formatResetCode(1234), "01234");
  assert.equal(formatResetCode(0), "00000");
  let draws = 0;
  assert.equal(resetCodeFromRandom(() => {
    draws += 1;
    return draws === 1 ? RESET_CODE_UNBIASED_LIMIT : 1234;
  }), "01234");
  assert.equal(draws, 2);

  const hash = await hmacResetCode("a".repeat(64), "01234", secret);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash.includes("01234"), false);
  assert.notEqual(hash, await hmacResetCode("a".repeat(64), "1234", secret));
  assert.equal(digestsMatch(hash, hash), true);
  assert.equal(digestsMatch(hash, `${hash}00`), false);
});

test("el quinto fallo agota el código y un acierto no se puede repetir", async () => {
  let row = await buildIssuedRow({
    email: "persona@example.com",
    userId: "user-1",
    code: "01234",
    secret,
    now,
  });
  assert.equal(row.codeHash?.includes("01234"), false);
  for (let attempt = 1; attempt < RESET_MAX_ATTEMPTS; attempt += 1) {
    const wrong = await evaluateCode(row, "99999", secret, now);
    assert.equal(wrong.outcome, "invalid");
    row = wrong.row;
  }
  const fifth = await evaluateCode(row, "99999", secret, now);
  assert.equal(fifth.outcome, "exhausted");
  assert.ok(fifth.row?.consumedAt);
  assert.equal((await evaluateCode(fifth.row, "01234", secret, now)).outcome, "invalid");

  const fresh = await buildIssuedRow({
    email: "persona@example.com",
    userId: "user-1",
    code: "01234",
    secret,
    now,
  });
  const accepted = await evaluateCode(fresh, "01234", secret, now + 1000);
  assert.equal(accepted.outcome, "grant");
  assert.equal((await evaluateCode(accepted.row, "01234", secret, now + 1000)).outcome, "invalid");
  assert.equal((await evaluateCode(fresh, "01234", secret, now + RESET_CODE_TTL_MS)).outcome, "invalid");
  assert.equal((await evaluateCode(null, "01234", secret, now)).outcome, "invalid");
});

test("un reto sin cuenta no obtiene permiso y los límites usan el mismo mensaje", async () => {
  const placeholder = await buildIssuedRow({
    email: "nadie@example.com",
    userId: null,
    code: null,
    secret,
    now,
  });
  const decision = await evaluateCode(placeholder, "01234", secret, now);
  assert.notEqual(decision.outcome, "grant");
  assert.equal(decision.row?.grantHash ?? null, null);

  const issued = await buildIssuedRow({
    email: "persona@example.com",
    userId: "user-1",
    code: "01234",
    secret,
    now,
  });
  const stripped = await evaluateCode({ ...issued, userId: null }, "01234", secret, now);
  assert.notEqual(stripped.outcome, "grant");

  assert.equal(assessSendWindow([], now), "ok");
  assert.equal(assessSendWindow([new Date(now - 30_000).toISOString()], now), "cooldown");
  assert.equal(assessSendWindow([new Date(now - 60_000).toISOString()], now), "ok");
  const five = [1, 2, 3, 4, 5].map((minutes) => new Date(now - minutes * 60_000).toISOString());
  assert.equal(assessSendWindow(five, now), "hourly");
  assert.equal(publicResetLimitMessage("cooldown"), publicResetLimitMessage("hourly"));
});

test("las reglas de contraseña rechazan el cambio y el permiso solo sirve una vez", async () => {
  const issued = await buildIssuedRow({
    email: "persona@example.com",
    userId: "user-1",
    code: "01234",
    secret,
    now,
  });
  const granted = (await evaluateCode(issued, "01234", secret, now)).row;
  assert.equal(preparePasswordChange(granted, "secreta1", "secreta1", now).ok, true);
  assert.equal(preparePasswordChange(granted, "corta", "corta", now).ok, false);
  assert.equal(preparePasswordChange(granted, "x".repeat(129), "x".repeat(129), now).ok, false);
  assert.equal(preparePasswordChange(granted, "secreta1", "secreta2", now).ok, false);
  assert.equal(preparePasswordChange(null, "secreta1", "secreta1", now).ok, false);
  assert.equal(preparePasswordChange(consumeGrant(granted, now), "secreta1", "secreta1", now).ok, false);

  const complete = await read("app/api/auth/forgot-password/complete/route.ts");
  const prepareAt = complete.indexOf("preparePasswordChange(");
  const updateAt = complete.indexOf("updateUserById");
  const sessionAt = complete.indexOf("await createAppSession(");
  const consumeAt = complete.indexOf("await consumeResetGrant");
  assert.ok(prepareAt >= 0 && prepareAt < updateAt && updateAt < sessionAt && sessionAt < consumeAt);
  assert.doesNotMatch(complete, /passwordReset/);
  const passwordRoute = await read("app/api/auth/password/route.ts");
  assert.match(passwordRoute, /requiresCurrentPassword/);
  assert.match(passwordRoute, /currentPassword/);
});

test("el correo trae el código y no un enlace para elegir la contraseña", () => {
  const message = passwordResetCodeMessage("persona@example.com", "01234");
  for (const body of [message.text, message.html]) {
    assert.match(body, /01234/);
    assert.match(body, /15 minutos/);
    assert.doesNotMatch(body, /\/update-password|resetPasswordForEmail/);
  }
});

test("la migración no guarda el código en claro y cierra el acceso público", async () => {
  const sql = await read("supabase/migrations/202610290002_password_reset_codes.sql");
  const passkeys = await read("supabase/migrations/202609240001_passkeys.sql");
  assert.match(sql, /create table public\.password_reset_codes/i);
  assert.match(sql, /code_hash text/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.password_reset_codes from anon, authenticated/i);
  assert.match(passkeys, /revoke all on table public\.passkey_challenges from anon, authenticated/i);
  assert.doesNotMatch(sql, /\bcode\s+(text|varchar|char)/i);
});

test("las rutas dejan el enlace de Supabase y comprueban el código en el servidor", async () => {
  const forgot = await read("app/api/auth/forgot-password/route.ts");
  const verify = await read("app/api/auth/forgot-password/verify/route.ts");
  const store = await read("lib/auth/password-reset-store.ts");
  assert.doesNotMatch(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /challengeId/);
  assert.match(verify, /assertSameOrigin\(request\)/);
  assert.match(verify, /resetGrant/);
  assert.ok(store.indexOf("assessSendWindow") < store.indexOf('from("profiles")'));
  assert.match(store, /status === "Activo"/);
  assert.match(store, /deliverMail\(passwordResetCodeMessage/);
});

test("las pantallas guardan el reto fuera de la URL y traducen los textos nuevos", async () => {
  const email = await read("app/forgot-password/ForgotPasswordForm.tsx");
  const code = await read("app/forgot-password/code/ResetCodeForm.tsx");
  const next = await read("app/forgot-password/new/NewPasswordForm.tsx");
  const traveler = await read("components/dashboard/TravelerViews.tsx");
  const readme = await read("README.md");
  assert.match(email, /AuthShell/);
  assert.match(email, /<Button/);
  assert.match(email, /<Input/);
  assert.match(email, /<Field/);
  assert.match(email, /writePasswordResetDraft/);
  assert.match(email, /\/forgot-password\/code/);
  assert.doesNotMatch(email, /Si el correo está registrado/);
  assert.match(code, /inputMode="numeric"/);
  assert.match(code, /autoComplete="one-time-code"/);
  assert.match(code, /\/api\/auth\/forgot-password"/);
  assert.match(code, /router\.replace\("\/forgot-password"\)/);
  assert.match(code, /resetGrant/);
  assert.match(next, /\/api\/auth\/forgot-password\/complete/);
  assert.match(next, /window\.location\.assign\("\/dashboard"\)/);
  assert.match(next, /password !== confirmation/);
  assert.match(next, /phase === "ready" && resetGrant/);
  assert.match(traveler, /href="\/forgot-password"/);
  assert.match(readme, /5-digit code/);
  assert.match(readme, /202610290002_password_reset_codes\.sql/);

  const copy = [
    "Código de recuperación",
    "Escribe el código de 5 dígitos. Caduca a los 15 minutos.",
    "Código",
    "Comprobar código",
    "Comprobando código…",
    "Pedir otro código",
    "Enviando código…",
    "Puedes usar el código más reciente.",
    "Espera un momento antes de pedir otro código.",
    "El código no es válido.",
    "Ese código ya no sirve. Pide otro código.",
    "Elige una contraseña de 8 a 128 caracteres y confírmala.",
    "La contraseña debe tener entre 8 y 128 caracteres.",
    "Las contraseñas no coinciden.",
    "El permiso para cambiar la contraseña no es válido. Pide un código nuevo.",
    "Ingresa un correo válido.",
    "No se pudo preparar la recuperación.",
    "No se pudo guardar la contraseña.",
  ];
  for (const key of copy) {
    assert.equal(typeof english[key], "string");
    assert.notEqual(english[key], "");
    assert.notEqual(english[key], key);
  }
});
