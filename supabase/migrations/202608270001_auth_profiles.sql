-- LaRutica: perfiles vinculados 1:1 con Supabase Auth.
-- Las contraseñas y los refresh tokens permanecen exclusivamente en Auth.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null,
  role text not null default 'Viajero'
    check (role in ('Viajero', 'Agencia', 'Transporte', 'Admin')),
  phone text,
  business_name text,
  status text not null default 'Activo'
    check (status in ('Activo', 'Inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique_idx on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  safe_role text;
begin
  -- El registro público nunca puede autoasignarse Admin.
  safe_role := case
    when requested_role in ('Viajero', 'Agencia', 'Transporte') then requested_role
    else 'Viajero'
  end;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    phone,
    business_name
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    safe_role,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    email = lower(new.email),
    full_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), full_name),
    phone = nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    business_name = nullif(trim(new.raw_user_meta_data ->> 'business_name'), '')
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_auth_user_updated();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'Admin'
      and status = 'Activo'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, business_name) on table public.profiles to authenticated;

create policy "profile_select_own_or_admin"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or (select public.is_admin()));

create policy "profile_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id and status = 'Activo')
with check ((select auth.uid()) = id);

-- Permite que una sesión Admin abierta reciba altas/cambios en el listado.
alter publication supabase_realtime add table public.profiles;
