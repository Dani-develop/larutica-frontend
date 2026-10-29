-- LaRutica: promoción de una publicación durante 7 días.
-- El monto lo fija el servidor. El cliente no escribe esta tabla.
-- Aplicar esta migración antes de publicar el código que lee promoted_until.

alter table public.publications
  add column if not exists promoted_until timestamptz;

comment on column public.publications.promoted_until is
  'Fin de la promoción. Null o una fecha pasada: la publicación no está promocionada. Cubre todas sus salidas.';

create table if not exists public.publication_promotion_payments (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null
    references public.publications(id)
    on delete restrict,
  provider text not null default 'onvopay'
    check (provider = 'onvopay'),
  provider_payment_id text not null unique,
  amount numeric(10, 2) not null
    check (amount > 0),
  currency text not null default 'USD'
    check (currency in ('USD', 'CRC')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'canceled', 'expired', 'refunded')),
  refunded_amount numeric(10, 2) not null default 0
    check (refunded_amount >= 0),
  provider_refund_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  last_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_promotion_payments_publication_id_idx
  on public.publication_promotion_payments (publication_id);

-- Un intento abierto por publicación. Los cobros ya pagados se conservan para el siguiente periodo.
create unique index if not exists publication_promotion_payments_one_pending_idx
  on public.publication_promotion_payments (publication_id)
  where status = 'pending';

drop trigger if exists publication_promotion_payments_set_updated_at
on public.publication_promotion_payments;

create trigger publication_promotion_payments_set_updated_at
before update on public.publication_promotion_payments
for each row
execute procedure public.set_updated_at();

alter table public.publication_promotion_payments enable row level security;

revoke all on table public.publication_promotion_payments from anon, authenticated;


-- El catálogo antepone las publicaciones con promoción vigente.

create or replace function public.catalog_publication_ranking(
  p_page integer default 1,
  p_page_size integer default 9,
  p_search text default null,
  p_service_type text default null,
  p_sort text default 'newest'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page integer;
  v_page_size integer;
  v_search text;
  v_service_type text;
  v_sort text;
  v_offset integer;
  v_total bigint;
  v_items jsonb;
begin

  -- =======================================================
  -- 1. VALIDAR PAGINACIÓN
  -- =======================================================

  if p_page is null or p_page < 1 then
    raise exception 'La página debe ser mayor o igual a 1.'
      using errcode = '22023';
  end if;

  if p_page_size is null
    or p_page_size < 1
    or p_page_size > 24
  then
    raise exception 'El tamaño de página debe estar entre 1 y 24.'
      using errcode = '22023';
  end if;

  v_page := p_page;
  v_page_size := p_page_size;
  v_offset := (v_page - 1) * v_page_size;


  -- =======================================================
  -- 2. NORMALIZAR BÚSQUEDA
  -- =======================================================

  v_search :=
    nullif(
      btrim(
        coalesce(p_search, '')
      ),
      ''
    );


  -- =======================================================
  -- 3. NORMALIZAR TIPO
  -- =======================================================

  v_service_type :=
    nullif(
      upper(
        btrim(
          coalesce(p_service_type, '')
        )
      ),
      ''
    );

  if v_service_type is not null
    and v_service_type not in (
      'EXCURSION',
      'TRANSPORT'
    )
  then
    raise exception 'El tipo de experiencia no es válido.'
      using errcode = '22023';
  end if;


  -- =======================================================
  -- 4. NORMALIZAR ORDENAMIENTO
  -- =======================================================

  v_sort :=
    lower(
      btrim(
        coalesce(p_sort, 'newest')
      )
    );

  if v_sort not in (
    'newest',
    'most_saved'
  )
  then
    raise exception 'El ordenamiento solicitado no es válido.'
      using errcode = '22023';
  end if;


  -- =======================================================
  -- 5. TOTAL DE RESULTADOS
  -- =======================================================

  select count(*)
  into v_total
  from public.publications p
  inner join public.agencies a
    on a.id = p.agency_id
  where p.status = 'APPROVED'
    and a.status = 'APPROVED'
    and p.price_per_person is not null

    and (
      v_service_type is null
      or p.service_type = v_service_type
    )

    and (
      v_search is null
      or p.title ilike '%' || v_search || '%'
      or p.destination ilike '%' || v_search || '%'
    );


  -- =======================================================
  -- 6. RANKING + PAGINACIÓN
  -- =======================================================

  with ranked as (
    select
      p.id as publication_id,

      count(sp.user_id)::bigint as saved_count,

      p.created_at,

      row_number() over (
        order by

          case
            when p.promoted_until > now()
            then p.promoted_until
          end desc nulls last,

          case
            when v_sort = 'most_saved'
            then count(sp.user_id)
          end desc nulls last,

          case
            when v_sort = 'newest'
            then p.created_at
          end desc nulls last,

          p.created_at desc,

          p.id asc
      ) as position

    from public.publications p

    inner join public.agencies a
      on a.id = p.agency_id

    left join public.saved_publications sp
      on sp.publication_id = p.id

    where p.status = 'APPROVED'
      and a.status = 'APPROVED'
      and p.price_per_person is not null

      and (
        v_service_type is null
        or p.service_type = v_service_type
      )

      and (
        v_search is null
        or p.title ilike '%' || v_search || '%'
        or p.destination ilike '%' || v_search || '%'
      )

    group by
      p.id,
      p.created_at,
      p.promoted_until
  ),

  paged as (
    select
      publication_id,
      saved_count,
      position
    from ranked
    where position > v_offset
      and position <= v_offset + v_page_size
    order by position
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'publicationId',
        publication_id,
        'savedCount',
        saved_count
      )
      order by position
    ),
    '[]'::jsonb
  )
  into v_items
  from paged;


  -- =======================================================
  -- 7. RESPUESTA
  -- =======================================================

  return jsonb_build_object(
    'items',
    v_items,

    'pagination',
    jsonb_build_object(
      'page',
      v_page,

      'pageSize',
      v_page_size,

      'total',
      v_total,

      'totalPages',
      case
        when v_total = 0 then 0
        else ceil(
          v_total::numeric
          /
          v_page_size::numeric
        )::integer
      end
    )
  );
end;
$$;


-- =========================================================
-- 8. SEGURIDAD
-- =======================================================

revoke all
on function public.catalog_publication_ranking(
  integer,
  integer,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.catalog_publication_ranking(
  integer,
  integer,
  text,
  text,
  text
)
to service_role;