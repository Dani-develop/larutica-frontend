-- Cancela una salida y las reservas pendientes o confirmadas de esa fecha.
-- Una salida que ya estaba cancelada no cambia filas ni devuelve avisos.
create or replace function public.cancel_departure_reservations(
  p_departure_id uuid
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
  v_status text;
begin
  select departure.status
  into v_status
  from public.publication_departures as departure
  where departure.id = p_departure_id
  for update;

  if not found then
    raise exception 'La salida no existe.'
      using errcode = 'P0002';
  end if;

  if v_status = 'CANCELLED' then
    return;
  end if;

  update public.publication_departures
  set status = 'CANCELLED'
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
      reservation.departure_id,
      reservation.number_of_people,
      reservation.unit_price
  )
  select
    closed.id,
    profile.email,
    profile.full_name,
    publication.title,
    departure.start_at,
    closed.number_of_people,
    round(closed.unit_price * closed.number_of_people, 2)
  from closed
  join public.profiles as profile on profile.id = closed.passenger_id
  join public.publication_departures as departure on departure.id = closed.departure_id
  join public.publications as publication on publication.id = departure.publication_id;
end;
$$;

revoke all on function public.cancel_departure_reservations(uuid) from public, anon, authenticated;
grant execute on function public.cancel_departure_reservations(uuid) to service_role;
