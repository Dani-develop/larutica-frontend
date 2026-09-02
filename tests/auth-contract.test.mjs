import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("la migración vincula Auth con profiles y protege los datos", async () => {
  const sql = await read("supabase/migrations/202608270001_auth_profiles.sql");
  assert.match(sql, /references auth\.users\(id\) on delete cascade/i);
  assert.match(sql, /create trigger on_auth_user_created/i);
  assert.match(sql, /alter table public\.profiles enable row level security/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /requested_role in \('Viajero', 'Agencia', 'Transporte'\)/i);
  assert.doesNotMatch(sql, /requested_role in \([^)]*'Admin'/i);
});

test("las sesiones opacas guardan solo hashes y bloquean acceso público", async () => {
  const sql = await read("supabase/migrations/202608270002_server_sessions.sql");
  assert.match(sql, /create table public\.app_sessions/i);
  assert.match(sql, /session_hash text primary key/i);
  assert.match(sql, /references auth\.users\(id\) on delete cascade/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.app_sessions from anon, authenticated/i);
  assert.doesNotMatch(sql, /access_token|refresh_token/i);
});

test("la cookie es HttpOnly y el servidor almacena el hash SHA-256", async () => {
  const session = await read("lib/supabase/session.ts");
  assert.match(session, /httpOnly:\s*true/i);
  assert.match(session, /secure:\s*process\.env\.NODE_ENV === "production"/i);
  assert.match(session, /sameSite:\s*"strict"/i);
  assert.match(session, /crypto\.subtle\.digest\("SHA-256"/i);
  assert.match(session, /SESSION_BYTES = 32/i);
  assert.match(session, /IDLE_SESSION_SECONDS = 30 \* 60/i);
});

test("el navegador no inicializa Supabase ni recibe JWT", async () => {
  const context = await read("modules/auth/context/AuthContext.tsx");
  const service = await read("modules/crm/users/services/usersService.ts");
  assert.doesNotMatch(context, /@supabase|access_token|refresh_token|getSession\(/i);
  assert.doesNotMatch(service, /@supabase|authorization|Bearer|access_token|refresh_token/i);
  assert.match(context, /credentials:\s*"same-origin"/i);
  assert.match(service, /credentials:\s*"same-origin"/i);
  assert.match(context, /clearLegacySupabaseStorage/);
});

test("las operaciones Admin validan cookie, sesión, rol y estado en servidor", async () => {
  const admin = await read("lib/supabase/admin.ts");
  const session = await read("lib/supabase/session.ts");
  assert.match(admin, /requireAppSession\(request\)/i);
  assert.match(admin, /profile\.role !== "Admin"/i);
  assert.match(session, /profile as ProfileRow\)\.status !== "Activo"/i);
  assert.doesNotMatch(admin, /authorization|Bearer|getUser\(token\)/i);
  assert.doesNotMatch(await read("modules/auth/context/AuthContext.tsx"), /SUPABASE_SERVICE_ROLE_KEY/);
});

test("perfil y listado administrativo pasan por APIs del servidor", async () => {
  const service = await read("modules/crm/users/services/usersService.ts");
  const profile = await read("modules/crm/users/components/MyProfilePage.tsx");
  const list = await read("modules/crm/users/hooks/useUsers.ts");
  assert.match(service, /\/api\/profile/);
  assert.match(service, /\/api\/admin\/users/);
  assert.match(profile, /saveProfile/);
  assert.match(list, /setInterval/);
  assert.doesNotMatch(list, /postgres_changes|supabase\.channel/i);
});

test("un clon nuevo usa el backend compartido sin recibir secretos", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const proxy = await read("lib/api/remote-proxy.ts");
  const development = await read(".env.development");
  const ignore = await read(".gitignore");
  const example = await read(".env.example");

  assert.equal(packageJson.devDependencies.supabase, undefined);
  assert.match(development, /^LARUTICA_REMOTE_API_ORIGIN=https:\/\//m);
  assert.match(proxy, /process\.env\.SUPABASE_SECRET_KEY\s*\|\|/);
  assert.match(proxy, /x-larutica-client-origin/);
  assert.match(proxy, /__Host-larutica_session/);
  assert.match(proxy, /larutica_session/);
  assert.match(proxy, /httpOnly|set-cookie/i);
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^!\.env\.development$/m);
  assert.match(example, /SUPABASE_SECRET_KEY=sb_secret_REEMPLAZAR/);
  assert.doesNotMatch(example, /sb_secret_[A-Za-z0-9]{16,}/);
});
