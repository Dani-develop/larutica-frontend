-- Apply before deploying the checkout API. No unpaid reservation is created.
begin;

create table public.reservation_checkouts (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles(id) on delete restrict,
  departure_id uuid not null references public.publication_departures(id) on delete restrict,
  number_of_people integer not null check (number_of_people > 0),
  unit_price numeric(10,2) not null check (unit_price > 0),
  departure_start_at timestamptz not null,
  journey_snapshot jsonb,
  meeting_point_snapshot text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','EXPIRED','CANCELLED')),
  expires_at timestamptz not null default now() + interval '15 minutes',
  reservation_id uuid references public.reservations(id) on delete restrict,
  payment_starting_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index reservation_checkouts_one_active on public.reservation_checkouts(passenger_id,departure_id) where status='ACTIVE';
create index reservation_checkouts_departure on public.reservation_checkouts(departure_id,expires_at) where status='ACTIVE';
alter table public.reservation_checkouts enable row level security;
revoke all on public.reservation_checkouts from public,anon,authenticated;
grant all on public.reservation_checkouts to service_role;

alter table public.reservations add column departure_start_at_snapshot timestamptz;
update public.reservations r set departure_start_at_snapshot=d.start_at from public.publication_departures d where d.id=r.departure_id;
alter table public.reservation_payments alter column reservation_id drop not null;
alter table public.reservation_payments
  add column checkout_id uuid references public.reservation_checkouts(id) on delete restrict,
  add column refund_status text check (refund_status in ('pending','succeeded','failed')),
  add column notification_sent_at timestamptz;
update public.reservation_payments p set notification_sent_at=coalesce(p.paid_at,p.updated_at)
  from public.reservations r where r.id=p.reservation_id and r.status in ('CONFIRMED','PAST','CANCELLED') and p.status in ('paid','refunded');
alter table public.reservation_payments add constraint reservation_payment_subject check (reservation_id is not null or checkout_id is not null);
create unique index reservation_checkout_one_paid on public.reservation_payments(checkout_id) where status='paid';
create unique index reservation_checkout_one_pending on public.reservation_payments(checkout_id) where status='pending';

-- Preserve existing payment references while moving unpaid purchases out of reservations.
do $$ declare r record; c uuid; begin
  for r in select * from public.reservations old where old.status in ('PENDING','CONFIRMED')
    and not exists(select 1 from public.reservation_payments p where p.reservation_id=old.id and p.status in ('paid','refunded'))
  loop
    if r.unit_price<=0 then update public.reservations set status='CANCELLED' where id=r.id;continue;end if;
    insert into public.reservation_checkouts(passenger_id,departure_id,number_of_people,unit_price,departure_start_at,
      journey_snapshot,meeting_point_snapshot,status,expires_at,created_at)
    values(r.passenger_id,r.departure_id,r.number_of_people,r.unit_price,r.departure_start_at_snapshot,
      r.journey_snapshot,r.meeting_point_snapshot,'EXPIRED',now(),r.created_at) returning id into c;
    update public.reservation_payments set status='canceled' where reservation_id=r.id and status='pending'
      and id<>(select id from public.reservation_payments where reservation_id=r.id and status='pending' order by created_at desc,id desc limit 1);
    update public.reservation_payments set checkout_id=c,reservation_id=null where reservation_id=r.id;
    update public.reservations set status='CANCELLED' where id=r.id;
  end loop;
end $$;
-- Repair previously interrupted successful payments, without reviving cancellations.
update public.reservations r set status='CONFIRMED' where r.status='PENDING'
  and exists(select 1 from public.reservation_payments p where p.reservation_id=r.id and p.status='paid');

create or replace function public.set_payment_commission() returns trigger language plpgsql security definer set search_path='' as $$
begin
  select a.commission_rate into new.commission_rate from public.agencies a
  join public.publications p on p.agency_id=a.id
  join public.publication_departures d on d.publication_id=p.id
  where d.id=coalesce((select r.departure_id from public.reservations r where r.id=new.reservation_id),
    (select c.departure_id from public.reservation_checkouts c where c.id=new.checkout_id));
  new.commission_rate:=coalesce(new.commission_rate,0); return new;
end $$;

create or replace function public.create_reservation_checkout(p_passenger_id uuid,p_departure_id uuid,p_number_of_people integer)
returns public.reservation_checkouts language plpgsql security definer set search_path='' as $$
declare d public.publication_departures%rowtype; p public.publications%rowtype; c public.reservation_checkouts%rowtype; used integer;
begin
  if p_number_of_people is null or p_number_of_people<1 then raise exception 'Indica un número entero de personas mayor que cero.' using errcode='22023'; end if;
  select * into d from public.publication_departures where id=p_departure_id for update;
  if not found then raise exception 'La salida no existe.' using errcode='P0002'; end if;
  select * into p from public.publications where id=d.publication_id;
  if d.status<>'ACTIVE' or d.start_at<=now() or p.status<>'APPROVED' or p.price_per_person is null or p.price_per_person<=0
    or not exists(select 1 from public.agencies where id=p.agency_id and status='APPROVED') then
    raise exception 'Esta salida ya no está disponible.' using errcode='22023'; end if;
  update public.reservation_checkouts set status='EXPIRED' where departure_id=d.id and status='ACTIVE' and expires_at<=now();
  if exists(select 1 from public.reservations where passenger_id=p_passenger_id and departure_id=d.id and status in ('CONFIRMED','PAST')) then
    raise exception 'Ya tienes una reserva confirmada para esta salida.' using errcode='23505'; end if;
  select * into c from public.reservation_checkouts where passenger_id=p_passenger_id and departure_id=d.id and status='ACTIVE';
  if found then
    if c.number_of_people<>p_number_of_people then raise exception 'Retoma el pago en curso o cambia la selección antes de continuar.' using errcode='23505'; end if;
    return c;
  end if;
  select coalesce(sum(number_of_people),0) into used from public.reservations where departure_id=d.id and status<>'CANCELLED';
  used:=used+(select coalesce(sum(number_of_people),0) from public.reservation_checkouts where departure_id=d.id and status='ACTIVE' and expires_at>now());
  if used+p_number_of_people>d.capacity then raise exception 'No hay cupo suficiente.' using errcode='22023'; end if;
  insert into public.reservation_checkouts(passenger_id,departure_id,number_of_people,unit_price,departure_start_at,journey_snapshot,meeting_point_snapshot,expires_at)
  values(p_passenger_id,d.id,p_number_of_people,p.price_per_person,d.start_at,
    case when p.journey->>'confirmedAt' is not null then p.journey else null end,p.meeting_point,least(now()+interval '15 minutes',d.start_at)) returning * into c;
  return c;
end $$;

create or replace function public.claim_checkout_payment(p_checkout_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.reservation_checkouts set payment_starting_at=now() where id=p_checkout_id and status='ACTIVE' and expires_at>now()
    and (payment_starting_at is null or payment_starting_at<now()-interval '60 seconds');
  return found;
end $$;

-- The verified provider amount, payment row and reservation are committed together.
create or replace function public.settle_reservation_checkout(p_checkout_id uuid,p_payment_id uuid,p_amount numeric,p_currency text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.reservation_checkouts%rowtype; d public.publication_departures%rowtype; pay public.reservation_payments%rowtype;
  r public.reservations%rowtype; invalid boolean; used integer;
begin
  if p_amount is null or p_amount<=0 or p_currency is null or p_currency not in ('USD','CRC') then
    raise exception 'El importe y la moneda del pago no son válidos.' using errcode='22023';
  end if;
  select * into c from public.reservation_checkouts where id=p_checkout_id;
  if not found then raise exception 'El intento de pago no existe.' using errcode='P0002'; end if;
  select * into d from public.publication_departures where id=c.departure_id for update;
  select * into c from public.reservation_checkouts where id=p_checkout_id for update;
  select * into pay from public.reservation_payments where id=p_payment_id and checkout_id=c.id for update;
  if not found then raise exception 'El pago no pertenece a este intento.' using errcode='22023'; end if;
  if c.status='COMPLETED' and pay.reservation_id=c.reservation_id and pay.status in ('paid','refunded') then
    return jsonb_build_object('reservationId',c.reservation_id,'refundRequired',false); end if;
  if exists(select 1 from public.reservation_payments other where other.checkout_id=c.id and other.id<>pay.id and other.status='paid') then
    update public.reservation_payments set status='failed',amount=p_amount,currency=p_currency,paid_at=coalesce(paid_at,now()) where id=pay.id;
    return jsonb_build_object('reservationId',null,'refundRequired',true);
  end if;
  invalid:=c.status<>'ACTIVE' or c.expires_at<=now() or d.status<>'ACTIVE' or d.start_at<=now() or d.start_at<>c.departure_start_at
    or p_currency<>'USD' or (p_payment_id is not null and (p_currency<>pay.currency or p_amount<>pay.amount)) or p_amount<>round(c.unit_price*c.number_of_people,2)
    or not exists(select 1 from public.publications p join public.agencies a on a.id=p.agency_id where p.id=d.publication_id and p.status='APPROVED' and a.status='APPROVED');
  select coalesce(sum(number_of_people),0) into used from public.reservations where departure_id=d.id and status<>'CANCELLED';
  if invalid or used+c.number_of_people>d.capacity or exists(select 1 from public.reservations where passenger_id=c.passenger_id and departure_id=d.id and status in ('CONFIRMED','PAST')) then
    update public.reservation_payments set status='paid',amount=p_amount,currency=p_currency,paid_at=coalesce(paid_at,now()) where id=pay.id and status<>'refunded';
    update public.reservation_checkouts set status=case when status='ACTIVE' then 'EXPIRED' else status end where id=c.id;
    return jsonb_build_object('reservationId',null,'refundRequired',true);
  end if;
  insert into public.reservations(passenger_id,departure_id,number_of_people,unit_price,status,departure_start_at_snapshot)
  values(c.passenger_id,c.departure_id,c.number_of_people,c.unit_price,'CONFIRMED',c.departure_start_at) returning * into r;
  update public.reservation_payments set reservation_id=r.id,status='paid',paid_at=coalesce(paid_at,now()) where id=pay.id;
  update public.reservation_checkouts set status='COMPLETED',reservation_id=r.id where id=c.id;
  return jsonb_build_object('reservationId',r.id,'refundRequired',false);
end $$;

-- A completed checkout supplies its own immutable snapshot at INSERT time.
create or replace function public.capture_reservation_journey() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.publications%rowtype; d public.publication_departures%rowtype; c public.reservation_checkouts%rowtype;
begin
  select * into d from public.publication_departures where id=new.departure_id;
  select * into p from public.publications where id=d.publication_id for share;
  select * into c from public.reservation_checkouts where passenger_id=new.passenger_id and departure_id=new.departure_id and status='ACTIVE' order by created_at desc limit 1;
  new.departure_start_at_snapshot:=coalesce(new.departure_start_at_snapshot,d.start_at);
  new.journey_snapshot:=case when c.id is not null then c.journey_snapshot when p.journey->>'confirmedAt' is not null then p.journey else null end;
  new.meeting_point_snapshot:=case when c.id is not null then c.meeting_point_snapshot else p.meeting_point end;
  new.journey_snapshot_captured:=true;return new;
end $$;
create or replace function public.preserve_reservation_journey() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.journey_snapshot:=old.journey_snapshot;new.meeting_point_snapshot:=old.meeting_point_snapshot;new.journey_snapshot_captured:=old.journey_snapshot_captured;
  new.departure_start_at_snapshot:=old.departure_start_at_snapshot;return new;end $$;

create function public.invalidate_departure_checkouts() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status<>'ACTIVE' or new.start_at<>old.start_at then update public.reservation_checkouts set status='CANCELLED' where departure_id=new.id and status='ACTIVE'; end if;
  return new;
end $$;
create trigger invalidate_departure_checkouts after update on public.publication_departures for each row execute function public.invalidate_departure_checkouts();

create function public.guard_departure_checkout_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare used integer;
begin
  if new.status='ACTIVE' and new.start_at=old.start_at and new.capacity<old.capacity then
    select coalesce(sum(number_of_people),0) into used from public.reservations where departure_id=new.id and status<>'CANCELLED';
    used:=used+(select coalesce(sum(number_of_people),0) from public.reservation_checkouts where departure_id=new.id and status='ACTIVE' and expires_at>now());
    if new.capacity<used then raise exception 'La capacidad no puede ser menor que los cupos reservados o en proceso de pago.' using errcode='22023';end if;
  end if;
  return new;
end $$;
create trigger guard_departure_checkout_capacity before update on public.publication_departures for each row execute function public.guard_departure_checkout_capacity();
revoke all on function public.guard_departure_checkout_capacity() from public,anon,authenticated;

-- Retire the old unpaid-reservation write path, including clients from an older deployment.
create or replace function public.create_reservation(p_passenger_id uuid,p_departure_id uuid,p_number_of_people integer)
returns public.reservations language plpgsql security definer set search_path='' as $$
begin raise exception 'Inicia el pago para realizar una reserva.' using errcode='22023';end $$;

revoke all on function public.create_reservation_checkout(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.claim_checkout_payment(uuid) from public,anon,authenticated;
revoke all on function public.settle_reservation_checkout(uuid,uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.invalidate_departure_checkouts() from public,anon,authenticated;
grant execute on function public.create_reservation_checkout(uuid,uuid,integer) to service_role;
grant execute on function public.claim_checkout_payment(uuid) to service_role;
grant execute on function public.settle_reservation_checkout(uuid,uuid,numeric,text) to service_role;
notify pgrst,'reload schema';
commit;
