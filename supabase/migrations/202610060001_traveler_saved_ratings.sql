create table public.saved_publications (
  user_id uuid not null references public.profiles(id) on delete cascade,
  publication_id uuid not null references public.publications(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, publication_id)
);

create index saved_publications_publication_id_idx
  on public.saved_publications (publication_id);

alter table public.saved_publications enable row level security;
revoke all on table public.saved_publications from anon, authenticated;

create table public.reservation_ratings (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservation_ratings_passenger_id_idx
  on public.reservation_ratings (passenger_id);

drop trigger if exists reservation_ratings_set_updated_at
  on public.reservation_ratings;

create trigger reservation_ratings_set_updated_at
before update on public.reservation_ratings
for each row
execute procedure public.set_updated_at();

alter table public.reservation_ratings enable row level security;
revoke all on table public.reservation_ratings from anon, authenticated;

create or replace function public.rate_past_reservation(
  p_reservation_id uuid,
  p_passenger_id uuid,
  p_rating smallint
)
returns public.reservation_ratings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reservation_ratings%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'La calificación debe ser de 1 a 5 estrellas.'
      using errcode = '22023';
  end if;

  perform 1
  from public.reservations
  where id = p_reservation_id
    and passenger_id = p_passenger_id
    and status = 'PAST';

  if not found then
    raise exception 'Solo puedes calificar tus viajes que ya pasaron.'
      using errcode = '42501';
  end if;

  insert into public.reservation_ratings (reservation_id, passenger_id, rating)
  values (p_reservation_id, p_passenger_id, p_rating)
  on conflict (reservation_id)
  do update set rating = excluded.rating
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.rate_past_reservation(uuid, uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.rate_past_reservation(uuid, uuid, smallint)
  to service_role;
