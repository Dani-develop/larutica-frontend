-- =========================================================
-- LaRutica
-- Ranking del catálogo público
-- =========================================================
--
-- No crea tablas nuevas.
--
-- Reutiliza:
--   public.publications
--   public.agencies
--   public.saved_publications
--
-- Permite:
--   - búsqueda por título/destino
--   - filtro por tipo
--   - paginación
--   - ordenar por recientes
--   - ordenar por más guardadas
-- =========================================================

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
      p.created_at
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