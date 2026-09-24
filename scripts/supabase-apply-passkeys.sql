-- LaRutica: aplica la migración de passkeys directamente desde el SQL Editor de
-- Supabase y la registra en el historial de la CLI.
--
-- Equivale a supabase/migrations/202609240001_passkeys.sql. Es idempotente:
-- se puede ejecutar más de una vez sin duplicar nada. Si prefieres la CLI, usa
-- `npx supabase db push` en lugar de este archivo.

begin;

-- LaRutica: inicio de sesión con passkeys (WebAuthn).
-- Solo se guarda la clave pública de cada credencial; la clave privada nunca
-- sale del dispositivo del usuario. Los desafíos se guardan por hash y son de
-- un solo uso.
create table if not exists public.user_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique
    check (credential_id ~ '^[A-Za-z0-9_-]+$'),
  public_key text not null,
  counter bigint not null default 0 check (counter >= 0),
  transports text[] not null default '{}',
  device_type text not null
    check (device_type in ('singleDevice', 'multiDevice')),
  backed_up boolean not null default false,
  name text not null default 'Passkey'
    check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists user_passkeys_user_id_idx on public.user_passkeys (user_id);

alter table public.user_passkeys enable row level security;
revoke all on table public.user_passkeys from anon, authenticated;

create table if not exists public.passkey_challenges (
  flow_hash text primary key
    check (flow_hash ~ '^[0-9a-f]{64}$'),
  challenge text not null,
  flow_kind text not null
    check (flow_kind in ('registration', 'authentication')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at),
  check (flow_kind = 'authentication' or user_id is not null)
);

create index if not exists passkey_challenges_expiry_idx on public.passkey_challenges (expires_at);

alter table public.passkey_challenges enable row level security;
revoke all on table public.passkey_challenges from anon, authenticated;

-- Registra la migración en el historial de la CLI para que `db push` no la repita.
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
insert into supabase_migrations.schema_migrations (version, name)
values ('202609240001', 'passkeys')
on conflict (version) do nothing;

commit;

-- Refresca la caché de PostgREST para que supabase-js vea las tablas nuevas.
notify pgrst, 'reload schema';

-- Verificación: debe aparecer 202609240001 y ambas tablas con rowsecurity = true.
select version, name from supabase_migrations.schema_migrations order by version;
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('user_passkeys', 'passkey_challenges');
