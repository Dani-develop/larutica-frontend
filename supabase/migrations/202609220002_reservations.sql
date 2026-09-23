-- LaRutica: reservas de un viajero sobre una salida concreta.
-- El cupo y el precio se resuelven aquí. El cliente no escribe esta tabla.

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null
    references public.profiles(id)
    on delete restrict,
  departure_id uuid not null
    references public.publication_departures(id)
    on delete restrict,
  number_of_people integer not null
    check (number_of_people > 0),
  unit_price numeric(10, 2) not null
    check (unit_price >= 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'PAST', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_passenger_id_idx on public.reservations (passenger_id);
create index reservations_departure_id_idx on public.reservations (departure_id);
create index reservations_status_idx on public.reservations (status);

drop trigger if exists reservations_set_updated_at on public.reservations;

create trigger reservations_set_updated_at
before update on public.reservations
for each row
execute procedure public.set_updated_at();

alter table public.reservations enable row level security;

revoke all on table public.reservations from anon, authenticated;

-- Alta: bloquea la salida y copia publications.price_per_person.
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

  select *
  into v_publication
  from public.publications
  where id = v_departure.publication_id;

  if not found
     or v_departure.status <> 'ACTIVE'
     or v_departure.start_at <= now()
     or v_publication.status <> 'APPROVED'
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
    'PENDING'
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Cambio de personas: vuelve a bloquear la salida y excluye la fila que se edita.
create or replace function public.update_reservation_party_size(
  p_reservation_id uuid,
  p_number_of_people integer
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_departure_id uuid;
  v_departure public.publication_departures%rowtype;
  v_reservation public.reservations%rowtype;
  v_reserved integer;
begin
  if p_number_of_people is null or p_number_of_people <= 0 then
    raise exception 'El número de personas debe ser mayor que cero.'
      using errcode = '22023';
  end if;

  select departure_id
  into v_departure_id
  from public.reservations
  where id = p_reservation_id;

  if not found then
    raise exception 'La reserva no existe.'
      using errcode = 'P0002';
  end if;

  select *
  into v_departure
  from public.publication_departures
  where id = v_departure_id
  for update;

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'La reserva no existe.'
      using errcode = 'P0002';
  end if;

  if v_reservation.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'Esta reserva ya no admite cambios de personas.'
      using errcode = '22023';
  end if;

  if v_departure.start_at <= now() then
    raise exception 'La salida ya comenzó.'
      using errcode = '22023';
  end if;

  select coalesce(sum(number_of_people), 0)
  into v_reserved
  from public.reservations
  where departure_id = v_departure_id
    and status <> 'CANCELLED'
    and id <> p_reservation_id;

  if v_reserved + p_number_of_people > v_departure.capacity then
    raise exception 'No hay cupo suficiente.'
      using errcode = '22023';
  end if;

  update public.reservations
  set number_of_people = p_number_of_people
  where id = p_reservation_id
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- Una reserva CONFIRMED pasa a PAST cuando la salida ya empezó.
-- PENDING y CANCELLED no se tocan.
create or replace function public.mark_elapsed_reservations_past()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reservations as reservation
  set status = 'PAST'
  from public.publication_departures as departure
  where reservation.departure_id = departure.id
    and reservation.status = 'CONFIRMED'
    and departure.start_at <= now();
end;
$$;

revoke all on function public.create_reservation(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.update_reservation_party_size(uuid, integer) from public, anon, authenticated;
revoke all on function public.mark_elapsed_reservations_past() from public, anon, authenticated;

grant execute on function public.create_reservation(uuid, uuid, integer) to service_role;
grant execute on function public.update_reservation_party_size(uuid, integer) to service_role;
grant execute on function public.mark_elapsed_reservations_past() to service_role;
