-- Prepared for local review; not applied to the shared database.
BEGIN;
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'CONFIRMED';
UPDATE public.reservations r SET status='CONFIRMED'
FROM public.publication_departures d
WHERE r.departure_id=d.id AND r.status='PENDING'
  AND d.status='ACTIVE' AND d.start_at>now();
-- Reservas personales: reintentos sin duplicar cupos. No modifica reservas existentes.
create or replace function public.create_reservation(
  p_passenger_id uuid,
  p_departure_id uuid,
  p_number_of_people integer
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_departure public.publication_departures%rowtype;
  v_publication public.publications%rowtype;
  v_reserved integer;
  v_row public.reservations%rowtype;
begin
  if p_number_of_people is null or p_number_of_people <= 0 then
    raise exception 'El número de personas debe ser mayor que cero.'
      using errcode = '22023';
  end if;

  select *
  into v_departure
  from public.publication_departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception 'La salida no existe.'
      using errcode = 'P0002';
  end if;

  -- The departure lock serializes concurrent submissions; only this passenger
  -- is deduplicated. Other passengers can still book the remaining capacity.
  select * into v_row
  from public.reservations
  where passenger_id = p_passenger_id
    and departure_id = p_departure_id
    and status in ('PENDING', 'CONFIRMED')
  order by created_at desc
  limit 1;
  if found then
    return v_row;
  end if;

  select *
  into v_publication
  from public.publications
  where id = v_departure.publication_id;

  if not found
     or v_departure.status <> 'ACTIVE'
     or v_departure.start_at <= now()
     or v_publication.status <> 'APPROVED'
     or not exists (
       select 1 from public.agencies
       where id = v_publication.agency_id and status = 'APPROVED'
     )
     or v_publication.price_per_person is null
     or v_publication.price_per_person < 0 then
    raise exception 'La salida no está disponible para reservar.'
      using errcode = '22023';
  end if;

  select coalesce(sum(number_of_people), 0)
  into v_reserved
  from public.reservations
  where departure_id = p_departure_id
    and status <> 'CANCELLED';

  if v_reserved + p_number_of_people > v_departure.capacity then
    raise exception 'No hay cupo suficiente.'
      using errcode = '22023';
  end if;

  insert into public.reservations (
    passenger_id,
    departure_id,
    number_of_people,
    unit_price,
    status
  ) values (
    p_passenger_id,
    p_departure_id,
    p_number_of_people,
    v_publication.price_per_person,
    'CONFIRMED'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_reservation(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.create_reservation(uuid, uuid, integer) to service_role;

COMMIT;
