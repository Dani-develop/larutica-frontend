-- LaRutica: un envío de recuperación por fila.
-- El código de 5 dígitos no se guarda en claro: solo su HMAC, la sal y el hash
-- del reto. El permiso para elegir la contraseña es otro secreto de un solo uso.
-- El timestamp 202610290001 ya lo usa la migración de promociones.

create table public.password_reset_codes (
  challenge_hash text primary key
    check (challenge_hash ~ '^[0-9a-f]{64}$'),
  email text not null
    check (email = lower(email) and position('@' in email) > 1),
  user_id uuid references auth.users(id) on delete cascade,
  code_hash text
    check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  salt text
    check (salt is null or salt ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0
    check (attempts >= 0 and attempts <= 5),
  consumed_at timestamptz,
  grant_hash text
    check (grant_hash is null or grant_hash ~ '^[0-9a-f]{64}$'),
  grant_expires_at timestamptz,
  check (expires_at > created_at),
  check (user_id is not null or code_hash is null),
  check (code_hash is null or salt is not null)
);

create index password_reset_codes_email_created_idx
  on public.password_reset_codes (email, created_at desc);

alter table public.password_reset_codes enable row level security;
revoke all on table public.password_reset_codes from anon, authenticated;
