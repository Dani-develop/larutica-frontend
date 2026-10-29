import { ApiError } from "@/lib/api/errors";
import { passwordResetCodeMessage } from "@/lib/mail/messages";
import { deliverMail } from "@/lib/mail/send";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/supabase/session";
import {
  assessSendWindow,
  buildIssuedRow,
  evaluateCode,
  generateResetCode,
  publicResetLimitMessage,
  type ResetRow,
} from "./password-reset";

const TABLE = "password_reset_codes";
const COLUMNS = "email,user_id,code_hash,salt,created_at,expires_at,attempts,consumed_at,grant_hash,grant_expires_at";

type DbRow = {
  email: string;
  user_id: string | null;
  code_hash: string | null;
  salt: string | null;
  created_at: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  grant_hash: string | null;
  grant_expires_at: string | null;
};

function resetSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new ApiError("Falta configurar Supabase en el servidor.", 500);
  return secret;
}

function fromDb(row: DbRow): ResetRow {
  return {
    email: row.email,
    userId: row.user_id,
    codeHash: row.code_hash,
    salt: row.salt,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    attempts: row.attempts,
    consumedAt: row.consumed_at,
    grantHash: row.grant_hash,
    grantExpiresAt: row.grant_expires_at,
  };
}

async function purgePasswordResetRows(now: number) {
  const admin = getSupabaseAdminClient();
  const cutoff = new Date(now - 60 * 60 * 1000).toISOString();
  const { error: withoutGrant } = await admin
    .from(TABLE)
    .delete()
    .lt("created_at", cutoff)
    .is("grant_expires_at", null);
  if (withoutGrant) throw withoutGrant;
  const { error: expiredGrant } = await admin
    .from(TABLE)
    .delete()
    .lt("created_at", cutoff)
    .lt("grant_expires_at", new Date(now).toISOString());
  if (expiredGrant) throw expiredGrant;
}

export async function requestPasswordReset(email: string, now = Date.now()) {
  const admin = getSupabaseAdminClient();
  await purgePasswordResetRows(now);
  const { data: recent, error: recentError } = await admin
    .from(TABLE)
    .select("created_at")
    .eq("email", email)
    .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString());
  if (recentError) throw recentError;

  const limit = assessSendWindow((recent ?? []).map((row) => String(row.created_at)), now);
  if (limit !== "ok") throw new ApiError(publicResetLimitMessage(limit), 429);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();
  if (profileError) throw profileError;
  const userId = profile?.status === "Activo" ? profile.id : null;
  const code = userId ? generateResetCode() : null;

  const { error: consumeError } = await admin
    .from(TABLE)
    .update({ consumed_at: new Date(now).toISOString() })
    .eq("email", email)
    .is("consumed_at", null);
  if (consumeError) throw consumeError;

  const challengeId = createOpaqueToken();
  const issued = await buildIssuedRow({ email, userId, code, secret: resetSecret(), now });
  const { error: insertError } = await admin.from(TABLE).insert({
    challenge_hash: await hashOpaqueToken(challengeId),
    email: issued.email,
    user_id: issued.userId,
    code_hash: issued.codeHash,
    salt: issued.salt,
    created_at: issued.createdAt,
    expires_at: issued.expiresAt,
    attempts: issued.attempts,
    consumed_at: null,
    grant_hash: null,
    grant_expires_at: null,
  });
  if (insertError) throw insertError;

  if (code) {
    // Un fallo de correo no cambia la respuesta: si no, el correo quedaría marcado como registrado.
    await deliverMail(passwordResetCodeMessage(email, code));
  }
  return { challengeId };
}

export async function verifyResetCode(challengeId: string, code: string, now = Date.now()) {
  const admin = getSupabaseAdminClient();
  await purgePasswordResetRows(now);
  const challengeHash = await hashOpaqueToken(challengeId);
  const { data, error } = await admin
    .from(TABLE)
    .select(COLUMNS)
    .eq("challenge_hash", challengeHash)
    .maybeSingle();
  if (error) throw error;

  const current = data ? fromDb(data as DbRow) : null;
  const decision = await evaluateCode(current, code, resetSecret(), now);
  if (decision.outcome === "grant" && decision.row?.grantExpiresAt) {
    const resetGrant = createOpaqueToken();
    const { data: updated, error: updateError } = await admin
      .from(TABLE)
      .update({
        grant_hash: await hashOpaqueToken(resetGrant),
        grant_expires_at: decision.row.grantExpiresAt,
      })
      .eq("challenge_hash", challengeHash)
      .is("grant_hash", null)
      .is("consumed_at", null)
      .select("challenge_hash");
    if (updateError) throw updateError;
    if (!updated?.length) return { outcome: "invalid" as const };
    return { outcome: "grant" as const, resetGrant };
  }

  if (current && decision.row && (decision.row.attempts !== current.attempts || decision.row.consumedAt !== current.consumedAt)) {
    const { error: updateError } = await admin
      .from(TABLE)
      .update({ attempts: decision.row.attempts, consumed_at: decision.row.consumedAt })
      .eq("challenge_hash", challengeHash);
    if (updateError) throw updateError;
  }
  return { outcome: decision.outcome === "exhausted" ? "exhausted" as const : "invalid" as const };
}

export async function findResetGrant(resetGrant: string, now = Date.now()) {
  const admin = getSupabaseAdminClient();
  await purgePasswordResetRows(now);
  const { data, error } = await admin
    .from(TABLE)
    .select(COLUMNS)
    .eq("grant_hash", await hashOpaqueToken(resetGrant))
    .maybeSingle();
  if (error) throw error;
  return data ? fromDb(data as DbRow) : null;
}

export async function consumeResetGrant(resetGrant: string, now = Date.now()) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from(TABLE)
    .update({ consumed_at: new Date(now).toISOString() })
    .eq("grant_hash", await hashOpaqueToken(resetGrant))
    .is("consumed_at", null);
  if (error) throw error;
}
