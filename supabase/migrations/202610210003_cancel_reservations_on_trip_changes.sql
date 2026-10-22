create or replace function public.deactivate_publication_and_cancel_reservations(
  p_publication_id uuid
)
returns table (
  id uuid,
  passenger_email text,
  passenger_name text,
  publication_title text,
  departure_start_at timestamptz,
  number_of_people integer,
  total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publication public.publications%rowtype;
begin
  select publication.*
  into v_publication
  from public.publications as publication
  where publication.id = p_publication_id
  for update;

  if not found then
    raise exception 'La publicación no existe.'
      using errcode = 'P0002';
  end if;

  if v_publication.status = 'INACTIVE' then
    return;
  end if;

  update public.publications
  set status = 'INACTIVE'
  where publications.id = p_publication_id;

  update public.publication_departures
  set status = 'CANCELLED'
  where publication_departures.publication_id = p_publication_id
    and publication_departures.status = 'ACTIVE';

  return query
  with closed as (
    update public.reservations as reservation
    set status = 'CANCELLED'
    from public.publication_departures as departure
    where reservation.departure_id = departure.id
      and departure.publication_id = p_publication_id
      and reservation.status in ('PENDING', 'CONFIRMED')
    returning
      reservation.id,
      reservation.passenger_id,
      reservation.departure_id,
      reservation.number_of_people,
      reservation.unit_price
  )
  select
    closed.id,
    profile.email,
    profile.full_name,
    v_publication.title,
    departure.start_at,
    closed.number_of_people,
    round(closed.unit_price * closed.number_of_people, 2)
  from closed
  join public.profiles as profile on profile.id = closed.passenger_id
  join public.publication_departures as departure on departure.id = closed.departure_id;
end;
$$;

revoke all on function public.deactivate_publication_and_cancel_reservations(uuid) from public, anon, authenticated;
grant execute on function public.deactivate_publication_and_cancel_reservations(uuid) to service_role;

create or replace function public.reschedule_departure_and_cancel_reservations(
  p_departure_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_capacity integer,
  p_status text
)
returns table (
  id uuid,
  passenger_email text,
  passenger_name text,
  publication_title text,
  departure_start_at timestamptz,
  new_departure_start_at timestamptz,
  number_of_people integer,
  total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_departure public.publication_departures%rowtype;
  v_publication_title text;
begin
  select departure.*
  into v_departure
  from public.publication_departures as departure
  where departure.id = p_departure_id
  for update;

  if not found then
    raise exception 'La salida no existe.'
      using errcode = 'P0002';
  end if;

  if v_departure.status = 'CANCELLED' then
    raise exception 'No puedes editar una salida cancelada.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.publication_departures as duplicate
    where duplicate.publication_id = v_departure.publication_id
      and duplicate.start_at = p_start_at
      and duplicate.id <> p_departure_id
  ) then
    raise exception 'Ya existe otra salida para esta publicación en la misma fecha y hora.'
      using errcode = '23505';
  end if;

  select publication.title
  into v_publication_title
  from public.publications as publication
  where publication.id = v_departure.publication_id;

  update public.publication_departures
  set
    start_at = p_start_at,
    end_at = p_end_at,
    capacity = p_capacity,
    status = p_status
  where publication_departures.id = p_departure_id;

  return query
  with closed as (
    update public.reservations as reservation
    set status = 'CANCELLED'
    where reservation.departure_id = p_departure_id
      and reservation.status in ('PENDING', 'CONFIRMED')
    returning
      reservation.id,
      reservation.passenger_id,
      reservation.number_of_people,
      reservation.unit_price
  )
  select
    closed.id,
    profile.email,
    profile.full_name,
    v_publication_title,
    v_departure.start_at,
    p_start_at,
    closed.number_of_people,
    round(closed.unit_price * closed.number_of_people, 2)
  from closed
  join public.profiles as profile on profile.id = closed.passenger_id;
end;
$$;

revoke all on function public.reschedule_departure_and_cancel_reservations(uuid, timestamptz, timestamptz, integer, text) from public, anon, authenticated;
grant execute on function public.reschedule_departure_and_cancel_reservations(uuid, timestamptz, timestamptz, integer, text) to service_role;
