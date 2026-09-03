-- LaRutica: sesiones opacas administradas exclusivamente por el servidor.
-- El navegador conserva el identificador aleatorio en una cookie HttpOnly.
-- La base de datos guarda solo su hash SHA-256; nunca JWT ni refresh tokens.

create table public.app_sessions (
  session_hash text primary key
    check (session_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  idle_expires_at timestamptz not null,
  check (expires_at > created_at),
  check (idle_expires_at > created_at)
);

create index app_sessions_user_id_idx on public.app_sessions (user_id);
create index app_sessions_expiry_idx
  on public.app_sessions (expires_at, idle_expires_at);

-- PostgREST puede conocer la tabla, pero anon/authenticated no reciben permisos
-- ni políticas. Solo service_role, usado en el servidor, puede administrarla.
alter table public.app_sessions enable row level security;
revoke all on table public.app_sessions from anon, authenticated;

create table public.auth_pkce_flows (
  flow_hash text primary key
    check (flow_hash ~ '^[0-9a-f]{64}$'),
  code_verifier text not null,
  flow_kind text not null
    check (flow_kind in ('signup', 'recovery')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

create index auth_pkce_flows_expiry_idx on public.auth_pkce_flows (expires_at);

alter table public.auth_pkce_flows enable row level security;
revoke all on table public.auth_pkce_flows from anon, authenticated;
