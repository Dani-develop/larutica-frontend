import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Auth → JWT/refresh → perfil → RLS/Admin", { skip: !url || !publishableKey || !serviceRoleKey }, async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `codexauth${Date.now()}${Math.random().toString(36).slice(2, 8)}@gmail.com`;
  const password = `LaRutica-${suffix}!`;
  const client = createClient(url, publishableKey, { auth: { persistSession: false } });
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Prueba LaRutica", role: "Viajero", phone: "+506 0000-0000" },
  });
  assert.ifError(createError);
  assert.ok(createData.user?.id);
  const userId = createData.user.id;
  t.after(async () => { await admin.auth.admin.deleteUser(userId); });

  const { data: createdProfile, error: profileError } = await admin.from("profiles").select("*").eq("id", userId).single();
  assert.ifError(profileError);
  assert.equal(createdProfile.email, email);
  assert.equal(createdProfile.full_name, "Prueba LaRutica");

  const { data: loginData, error: loginError } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(loginError);
  assert.match(loginData.session.access_token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.ok(loginData.session.refresh_token.length > 0);

  const { data: ownProfile, error: ownError } = await client.from("profiles").select("*").eq("id", userId).single();
  assert.ifError(ownError);
  assert.equal(ownProfile.email, email);

  const { data: updatedProfile, error: updateError } = await client.from("profiles").update({ full_name: "Nombre Actualizado" }).eq("id", userId).select("*").single();
  assert.ifError(updateError);
  assert.equal(updatedProfile.full_name, "Nombre Actualizado");

  const { error: promoteError } = await admin.from("profiles").update({ role: "Admin" }).eq("id", userId);
  assert.ifError(promoteError);
  const { data: visibleProfiles, error: listError } = await client.from("profiles").select("id");
  assert.ifError(listError);
  assert.ok(visibleProfiles.some((profile) => profile.id === userId));

  const { data: refreshed, error: refreshError } = await client.auth.refreshSession({ refresh_token: loginData.session.refresh_token });
  assert.ifError(refreshError);
  assert.ok(refreshed.session?.access_token);

  const opaqueSession = randomBytes(32).toString("base64url");
  const sessionHash = createHash("sha256").update(opaqueSession).digest("hex");
  const { error: appSessionError } = await admin.from("app_sessions").insert({
    session_hash: sessionHash,
    user_id: userId,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    idle_expires_at: new Date(Date.now() + 30_000).toISOString(),
  });
  assert.ifError(appSessionError);
  const { data: storedSession, error: storedSessionError } = await admin
    .from("app_sessions")
    .select("session_hash,user_id")
    .eq("session_hash", sessionHash)
    .single();
  assert.ifError(storedSessionError);
  assert.equal(storedSession.session_hash, sessionHash);
  assert.notEqual(storedSession.session_hash, opaqueSession);

  const anonymous = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: leakedSessions, error: anonymousSessionError } = await anonymous
    .from("app_sessions")
    .select("session_hash");
  assert.ok(anonymousSessionError || leakedSessions?.length === 0);
});
