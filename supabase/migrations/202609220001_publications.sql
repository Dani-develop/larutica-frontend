-- =========================================================
-- LaRutica
-- Publicaciones + idiomas + salidas/fechas
-- =========================================================


-- =========================================================
-- 1. PUBLICATIONS
-- =========================================================

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),

  agency_id uuid not null
    references public.agencies(id)
    on delete cascade,

  -- EXCURSION | TRANSPORT
  service_type text
    check (
      service_type is null
      or service_type in (
        'EXCURSION',
        'TRANSPORT'
      )
    ),

  title text,

  description text,

  -- Por ahora se guarda como texto.
  -- Más adelante puede migrarse a destination_id
  -- cuando el módulo Destinos esté definido.
  destination text,

  price_per_person numeric(10, 2)
    check (
      price_per_person is null
      or price_per_person >= 0
    ),

  -- Ejemplo:
  -- 4 horas = 240 minutos
  -- 1 hora 30 min = 90 minutos
  duration_minutes integer
    check (
      duration_minutes is null
      or duration_minutes > 0
    ),

  included text,

  not_included text,

  meeting_point text,

  main_image_url text,

  -- Capacidad sugerida/predeterminada para cada salida.
  default_capacity integer
    check (
      default_capacity is null
      or default_capacity > 0
    ),

  status text not null default 'DRAFT'
    check (
      status in (
        'DRAFT',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'INACTIVE'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- =========================================================
-- 2. UPDATED_AT AUTOMÁTICO
-- =========================================================
-- Reutilizamos la función public.set_updated_at()
-- que ya existe desde la migración de profiles.

drop trigger if exists publications_set_updated_at
on public.publications;

create trigger publications_set_updated_at
before update on public.publications
for each row
execute procedure public.set_updated_at();


-- =========================================================
-- 3. IDIOMAS DE LA PUBLICACIÓN
-- =========================================================
-- Reutiliza public.languages, que ya existe
-- por el módulo de Agencias.

create table if not exists public.publication_languages (
  publication_id uuid not null
    references public.publications(id)
    on delete cascade,

  language_id bigint not null
    references public.languages(id)
    on delete cascade,

  primary key (
    publication_id,
    language_id
  )
);


-- =========================================================
-- 4. SALIDAS / FECHAS DE UNA PUBLICACIÓN
-- =========================================================
-- Esta tabla es especialmente importante para Reservas.
--
-- Ejemplo:
-- Tour Volcán Arenal
--   25/09/2026 08:00 - capacidad 20
--   26/09/2026 08:00 - capacidad 20
--   27/09/2026 13:00 - capacidad 15

create table if not exists public.publication_departures (
  id uuid primary key default gen_random_uuid(),

  publication_id uuid not null
    references public.publications(id)
    on delete cascade,

  start_at timestamptz not null,

  end_at timestamptz,

  capacity integer not null
    check (capacity > 0),

  status text not null default 'ACTIVE'
    check (
      status in (
        'ACTIVE',
        'CANCELLED',
        'COMPLETED'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint publication_departure_valid_dates
    check (
      end_at is null
      or end_at > start_at
    ),

  constraint publication_departure_unique_start
    unique (
      publication_id,
      start_at
    )
);


-- =========================================================
-- 5. UPDATED_AT DE SALIDAS
-- =========================================================

drop trigger if exists publication_departures_set_updated_at
on public.publication_departures;

create trigger publication_departures_set_updated_at
before update on public.publication_departures
for each row
execute procedure public.set_updated_at();


-- =========================================================
-- 6. ÍNDICES
-- =========================================================

create index if not exists idx_publications_agency_id
  on public.publications(agency_id);

create index if not exists idx_publications_status
  on public.publications(status);

create index if not exists idx_publications_service_type
  on public.publications(service_type);

create index if not exists idx_publication_languages_publication_id
  on public.publication_languages(publication_id);

create index if not exists idx_publication_departures_publication_id
  on public.publication_departures(publication_id);

create index if not exists idx_publication_departures_start_at
  on public.publication_departures(start_at);

create index if not exists idx_publication_departures_status
  on public.publication_departures(status);


-- =========================================================
-- 7. ROW LEVEL SECURITY
-- =========================================================

alter table public.publications
  enable row level security;

alter table public.publication_languages
  enable row level security;

alter table public.publication_departures
  enable row level security;


-- =========================================================
-- 8. BLOQUEAR ACCESO DIRECTO DESDE CLIENTE
-- =========================================================
-- Igual que hicimos con Agencias:
-- las operaciones pasarán por la API/backend.

revoke all
on table public.publications
from anon, authenticated;

revoke all
on table public.publication_languages
from anon, authenticated;

revoke all
on table public.publication_departures
from anon, authenticated;