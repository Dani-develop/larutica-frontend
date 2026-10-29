export const RESET_CODE_LENGTH = 5;
export const RESET_CODE_SPACE = 100_000;
export const RESET_CODE_TTL_MS = 15 * 60 * 1000;
export const RESET_GRANT_TTL_MS = 15 * 60 * 1000;
export const RESET_MAX_ATTEMPTS = 5;
export const RESET_COOLDOWN_MS = 60 * 1000;
export const RESET_HOURLY_LIMIT = 5;
export const RESET_HOUR_MS = 60 * 60 * 1000;

const UINT32_SPAN = 2 ** 32;
export const RESET_CODE_UNBIASED_LIMIT = UINT32_SPAN - (UINT32_SPAN % RESET_CODE_SPACE);

export const RESET_RATE_LIMITED = "Espera un momento antes de pedir otro código.";
export const RESET_CODE_INVALID = "El código no es válido.";
export const RESET_CODE_EXHAUSTED = "Ese código ya no sirve. Pide otro código.";
export const RESET_PASSWORD_LENGTH = "La contraseña debe tener entre 8 y 128 caracteres.";
export const RESET_PASSWORD_MISMATCH = "Las contraseñas no coinciden.";
export const RESET_GRANT_INVALID = "El permiso para cambiar la contraseña no es válido. Pide un código nuevo.";
export const RESET_EMAIL_INVALID = "Ingresa un correo válido.";

const DUMMY_HEX = "0".repeat(64);

export type ResetRow = {
  email: string;
  userId: string | null;
  codeHash: string | null;
  salt: string | null;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  grantHash: string | null;
  grantExpiresAt: string | null;
};

export type CodeDecision = {
  outcome: "grant" | "invalid" | "exhausted";
  row: ResetRow | null;
};

export function normalizeResetEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

export function publicResetLimitMessage(_reason: "cooldown" | "hourly") {
  return RESET_RATE_LIMITED;
}

export function assessSendWindow(createdAt: string[], now: number): "ok" | "cooldown" | "hourly" {
  const recent = createdAt
    .map((value) => Date.parse(value))
    .filter((time) => Number.isFinite(time) && time <= now && now - time < RESET_HOUR_MS);
  if (recent.length >= RESET_HOURLY_LIMIT) return "hourly";
  const latest = recent.reduce((max, time) => Math.max(max, time), 0);
  if (latest && now - latest < RESET_COOLDOWN_MS) return "cooldown";
  return "ok";
}

export function formatResetCode(value: number) {
  return String(value % RESET_CODE_SPACE).padStart(RESET_CODE_LENGTH, "0");
}

export function resetCodeFromRandom(randomUint32: () => number) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const draw = randomUint32();
    if (draw < RESET_CODE_UNBIASED_LIMIT) return formatResetCode(draw);
  }
  throw new Error("No se pudo generar el código.");
}

export function generateResetCode() {
  const buffer = new Uint32Array(1);
  return resetCodeFromRandom(() => {
    crypto.getRandomValues(buffer);
    return buffer[0] ?? 0;
  });
}

export function createResetSalt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function hmacResetCode(salt: string, code: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${salt}${code}`));
  return toHex(new Uint8Array(signature));
}

export function digestsMatch(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length, 1);
  let diff = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

export async function buildIssuedRow(input: {
  email: string;
  userId: string | null;
  code: string | null;
  secret: string;
  now: number;
}): Promise<ResetRow> {
  const salt = input.userId && input.code ? createResetSalt() : null;
  const codeHash = salt && input.code ? await hmacResetCode(salt, input.code, input.secret) : null;
  return {
    email: input.email,
    userId: input.userId,
    codeHash,
    salt,
    createdAt: new Date(input.now).toISOString(),
    expiresAt: new Date(input.now + RESET_CODE_TTL_MS).toISOString(),
    attempts: 0,
    consumedAt: null,
    grantHash: null,
    grantExpiresAt: null,
  };
}

export async function evaluateCode(
  row: ResetRow | null,
  code: string,
  secret: string,
  now: number,
): Promise<CodeDecision> {
  const normalized = /^\d{5}$/.test(code) ? code : "";
  const actual = await hmacResetCode(row?.salt ?? DUMMY_HEX, normalized || "00000", secret);
  const matches = normalized.length === RESET_CODE_LENGTH
    && digestsMatch(actual, row?.codeHash ?? DUMMY_HEX);

  if (!row) return { outcome: "invalid", row: null };
  const expired = Date.parse(row.expiresAt) <= now;
  if (row.consumedAt || row.grantHash || expired) return { outcome: "invalid", row };

  if (matches && row.userId && row.codeHash) {
    return {
      outcome: "grant",
      row: {
        ...row,
        grantHash: "issued",
        grantExpiresAt: new Date(now + RESET_GRANT_TTL_MS).toISOString(),
      },
    };
  }

  const attempts = row.attempts + 1;
  if (attempts >= RESET_MAX_ATTEMPTS) {
    return {
      outcome: "exhausted",
      row: { ...row, attempts, consumedAt: new Date(now).toISOString() },
    };
  }
  return { outcome: "invalid", row: { ...row, attempts } };
}

export function preparePasswordChange(
  row: ResetRow | null,
  password: string,
  confirmation: string,
  now: number,
): { ok: false; message: string } | { ok: true; userId: string } {
  const grantExpires = row?.grantExpiresAt ? Date.parse(row.grantExpiresAt) : Number.NaN;
  if (!row?.userId || !row.grantHash || row.consumedAt || !Number.isFinite(grantExpires) || grantExpires <= now) {
    return { ok: false, message: RESET_GRANT_INVALID };
  }
  if (password.length < 8 || password.length > 128) {
    return { ok: false, message: RESET_PASSWORD_LENGTH };
  }
  if (password !== confirmation) {
    return { ok: false, message: RESET_PASSWORD_MISMATCH };
  }
  return { ok: true, userId: row.userId };
}

export function consumeGrant(row: ResetRow, now: number): ResetRow {
  return { ...row, consumedAt: new Date(now).toISOString() };
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
