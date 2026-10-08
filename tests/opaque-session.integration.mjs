import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.LARUTICA_TEST_URL ?? "http://localhost:3000";

function request(path, init = {}, cookie) {
  return fetch(`${appUrl}${path}`, {
    ...init,
    headers: {
      origin: appUrl,
      "sec-fetch-site": "same-origin",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });
}

async function json(response) {
  const text = await response.text();
  assert.doesNotMatch(text, /access_token|refresh_token|eyJ[\w-]+\.[\w-]+\.[\w-]+/i);
  return JSON.parse(text);
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /(?:^|,\s*)(?:__Host-)?larutica_session=[A-Za-z0-9_-]{43}/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Path=\//i);
  const pair = setCookie.match(/((?:__Host-)?larutica_session)=([A-Za-z0-9_-]{43})/);
  assert.ok(pair);
  if (pair[1].startsWith("__Host-")) assert.match(setCookie, /Secure/i);
  return { header: `${pair[1]}=${pair[2]}`, name: pair[1], token: pair[2] };
}

test(
  "cookie opaca: login, perfil, permisos Admin, CRUD y logout",
  { skip: !supabaseUrl || !serviceRoleKey },
  async (t) => {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const adminEmail = `opaque-admin-${suffix}@example.com`;
    const travelerEmail = `opaque-traveler-${suffix}@example.com`;
    const managedEmail = `opaque-managed-${suffix}@example.com`;
    const password = `LaRutica-${suffix}!`;
    const cleanupIds = new Set();

    t.after(async () => {
      for (const id of cleanupIds) await admin.auth.admin.deleteUser(id);
    });

    const { data: seededAdmin, error: seedError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Admin Opaco", role: "Viajero" },
    });
    assert.ifError(seedError);
    assert.ok(seededAdmin.user);
    cleanupIds.add(seededAdmin.user.id);
    const { error: promoteError } = await admin
      .from("profiles")
      .update({ role: "Admin" })
      .eq("id", seededAdmin.user.id);
    assert.ifError(promoteError);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: adminEmail, password }),
    });
    assert.equal(login.status, 200, await login.clone().text());
    const adminCookie = sessionCookie(login);
    const loginPayload = await json(login);
    assert.equal(loginPayload.data.user.role, "Admin");
    assert.equal(loginPayload.data.session.userId, seededAdmin.user.id);

    const sessionHash = createHash("sha256").update(adminCookie.token).digest("hex");
    const { data: stored, error: storedError } = await admin
      .from("app_sessions")
      .select("session_hash,user_id")
      .eq("session_hash", sessionHash)
      .single();
    assert.ifError(storedError);
    assert.equal(stored.user_id, seededAdmin.user.id);
    assert.equal(stored.session_hash, sessionHash);
    assert.notEqual(stored.session_hash, adminCookie.token);

    const anonymousAdmin = await request("/api/admin/users");
    assert.equal(anonymousAdmin.status, 401);

    const activeSession = await request("/api/auth/session", {}, adminCookie.header);
    assert.equal(activeSession.status, 200);
    assert.equal((await json(activeSession)).data.user.email, adminEmail);

    const profileUpdate = await request("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Admin Sesión Opaca",
        phone: "+506 2222-2222",
        businessName: "LaRutica",
      }),
    }, adminCookie.header);
    assert.equal(profileUpdate.status, 200);
    assert.equal((await json(profileUpdate)).data.name, "Admin Sesión Opaca");

    const createManaged = await request("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        name: "Usuario Gestionado",
        email: managedEmail,
        role: "Agencia",
        phone: "+506 8888-8888",
        businessName: "Agencia Prueba",
        status: "Activo",
        password,
      }),
    }, adminCookie.header);
    assert.equal(createManaged.status, 201);
    const managed = (await json(createManaged)).data;
    cleanupIds.add(managed.id);
    assert.equal(managed.role, "Agencia");

    const updateManaged = await request(`/api/admin/users/${managed.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: "Usuario Gestionado Actualizado",
        email: managedEmail,
        role: "Transporte",
        phone: "+506 8888-0000",
        businessName: "Transporte Prueba",
        status: "Activo",
      }),
    }, adminCookie.header);
    assert.equal(updateManaged.status, 200);
    assert.equal((await json(updateManaged)).data.role, "Transporte");

    const list = await request("/api/admin/users", {}, adminCookie.header);
    assert.equal(list.status, 200);
    const listed = (await json(list)).data;
    assert.ok(listed.some((profile) => profile.id === managed.id && profile.full_name === "Usuario Gestionado Actualizado"));

    const register = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        role: "Viajero",
        fullName: "Viajero Opaco",
        email: travelerEmail,
        phone: "",
        companyName: "",
        password,
        confirmPassword: password,
        acceptPrivacyPolicy: true,
        privacyPolicyVersion: "2026-10-07",
      }),
    });
    assert.equal(register.status, 201);
    const travelerCookie = sessionCookie(register);
    const registered = await json(register);
    assert.equal(registered.data.requiresEmailConfirmation, false);
    cleanupIds.add(registered.data.user.id);

    const forbidden = await request("/api/admin/users", {}, travelerCookie.header);
    assert.equal(forbidden.status, 403);

    const removeManaged = await request(`/api/admin/users/${managed.id}`, {
      method: "DELETE",
    }, adminCookie.header);
    assert.equal(removeManaged.status, 200);
    cleanupIds.delete(managed.id);
    const { data: removedAuthUser } = await admin.auth.admin.getUserById(managed.id);
    assert.equal(removedAuthUser.user, null);

    const logout = await request("/api/auth/logout", { method: "POST" }, adminCookie.header);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie") ?? "", new RegExp(`${adminCookie.name}=;`));
    const afterLogout = await request("/api/auth/session", {}, adminCookie.header);
    assert.equal(afterLogout.status, 401);
    const { data: revoked } = await admin
      .from("app_sessions")
      .select("session_hash")
      .eq("session_hash", sessionHash)
      .maybeSingle();
    assert.equal(revoked, null);
  },
);
