-- LaRutica: seguimiento de lo cobrado por agencia y liquidaciones del administrador.
-- Requiere 202610210001_reservation_payments.sql. No modifica pagos ni reservas existentes.

-- Porcentaje que LaRutica retiene de cada cobro de la agencia (0 = sin comision).
alter table public.agencies
  add column if not exists commission_rate numeric(5, 2) not null default 0
    check (commission_rate >= 0 and commission_rate <= 100);

-- La comision se congela al crear cada pago: cambiar la tasa solo afecta cobros futuros.
alter table public.reservation_payments
  add column if not exists commission_rate numeric(5, 2) not null default 0
    check (commission_rate >= 0 and commission_rate <= 100);

create or replace function public.set_payment_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select agency.commission_rate
  into new.commission_rate
  from public.reservations as reservation
  join public.publication_departures as departure on departure.id = reservation.departure_id
  join public.publications as publication on publication.id = departure.publication_id
  join public.agencies as agency on agency.id = publication.agency_id
  where reservation.id = new.reservation_id;

  new.commission_rate := coalesce(new.commission_rate, 0);
  return new;
end;
$$;

drop trigger if exists reservation_payments_set_commission on public.reservation_payments;

create trigger reservation_payments_set_commission
before insert on public.reservation_payments
for each row
execute procedure public.set_payment_commission();

-- Libro de movimientos: solo se agregan filas; una correccion se registra como ajuste.
create table public.agency_settlements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null
    references public.agencies(id)
    on delete restrict,
  kind text not null
    check (kind in ('PAYOUT', 'ADJUSTMENT')),
  -- PAYOUT: dinero entregado a la agencia (siempre positivo).
  -- ADJUSTMENT: corrige lo que se le debe; positivo suma al saldo, negativo lo resta.
  amount numeric(10, 2) not null
    check (amount <> 0),
  currency text not null default 'USD'
    check (currency = 'USD'),
  occurred_on date not null
    default ((now() at time zone 'America/Costa_Rica')::date),
  method text,
  reference text,
  notes text,
  created_by uuid
    references public.profiles(id)
    on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'ADJUSTMENT' or amount > 0),
  check (kind <> 'ADJUSTMENT' or length(btrim(coalesce(notes, ''))) > 0)
);

create index agency_settlements_agency_id_idx
  on public.agency_settlements (agency_id, occurred_on desc);

alter table public.agency_settlements enable row level security;

revoke all on table public.agency_settlements from anon, authenticated;

-- Detalle de cobros con viajero, experiencia y agencia. Mas recientes primero.
create or replace function public.admin_payment_rows(
  p_agency_id uuid default null,
  p_status text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 500,
  p_offset integer default 0
)
returns table (
  payment_id uuid,
  reservation_id uuid,
  status text,
  amount numeric,
  refunded_amount numeric,
  commission_rate numeric,
  created_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  passenger_name text,
  passenger_email text,
  publication_title text,
  departure_start_at timestamptz,
  number_of_people integer,
  agency_id uuid,
  agency_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    payment.id,
    payment.reservation_id,
    payment.status,
    payment.amount,
    payment.refunded_amount,
    payment.commission_rate,
    payment.created_at,
    payment.paid_at,
    payment.refunded_at,
    passenger.full_name,
    passenger.email,
    publication.title,
    departure.start_at,
    reservation.number_of_people,
    agency.id,
    agency.commercial_name
  from public.reservation_payments as payment
  join public.reservations as reservation on reservation.id = payment.reservation_id
  join public.profiles as passenger on passenger.id = reservation.passenger_id
  join public.publication_departures as departure on departure.id = reservation.departure_id
  join public.publications as publication on publication.id = departure.publication_id
  join public.agencies as agency on agency.id = publication.agency_id
  where (p_agency_id is null or agency.id = p_agency_id)
    and (p_status is null or payment.status = p_status)
    and (p_from is null or coalesce(payment.paid_at, payment.created_at) >= p_from)
    and (p_to is null or coalesce(payment.paid_at, payment.created_at) < p_to)
  order by coalesce(payment.paid_at, payment.created_at) desc, payment.id
  limit greatest(least(coalesce(p_limit, 500), 1000), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Saldo por agencia:
--   corresponde = suma de (cobrado - reembolsado) x (1 - comision congelada)
--   saldo       = corresponde + ajustes - pagos entregados
-- Solo cuentan los cobros paid o refunded; los intentos pendientes o fallidos no mueven dinero.
create or replace function public.admin_agency_balances()
returns table (
  agency_id uuid,
  agency_name text,
  commission_rate numeric,
  payments_count bigint,
  gross numeric,
  refunded numeric,
  net numeric,
  commission numeric,
  owed numeric,
  payouts numeric,
  adjustments numeric,
  balance numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with collected as (
    select
      agency.id as agency_id,
      count(*) as payments_count,
      sum(payment.amount) as gross,
      sum(payment.refunded_amount) as refunded,
      sum(round((payment.amount - payment.refunded_amount) * (1 - payment.commission_rate / 100), 2)) as owed
    from public.reservation_payments as payment
    join public.reservations as reservation on reservation.id = payment.reservation_id
    join public.publication_departures as departure on departure.id = reservation.departure_id
    join public.publications as publication on publication.id = departure.publication_id
    join public.agencies as agency on agency.id = publication.agency_id
    where payment.status in ('paid', 'refunded')
    group by agency.id
  ),
  settled as (
    select
      settlement.agency_id,
      coalesce(sum(settlement.amount) filter (where settlement.kind = 'PAYOUT'), 0) as payouts,
      coalesce(sum(settlement.amount) filter (where settlement.kind = 'ADJUSTMENT'), 0) as adjustments
    from public.agency_settlements as settlement
    group by settlement.agency_id
  ),
  totals as (
    select
      agency.id as agency_id,
      agency.commercial_name as agency_name,
      agency.commission_rate,
      coalesce(collected.payments_count, 0) as payments_count,
      coalesce(collected.gross, 0) as gross,
      coalesce(collected.refunded, 0) as refunded,
      coalesce(collected.owed, 0) as owed,
      coalesce(settled.payouts, 0) as payouts,
      coalesce(settled.adjustments, 0) as adjustments
    from public.agencies as agency
    left join collected on collected.agency_id = agency.id
    left join settled on settled.agency_id = agency.id
    where collected.agency_id is not null or settled.agency_id is not null
  )
  select
    totals.agency_id,
    totals.agency_name,
    totals.commission_rate,
    totals.payments_count,
    totals.gross,
    totals.refunded,
    totals.gross - totals.refunded,
    (totals.gross - totals.refunded) - totals.owed,
    totals.owed,
    totals.payouts,
    totals.adjustments,
    totals.owed + totals.adjustments - totals.payouts
  from totals
  order by (totals.owed + totals.adjustments - totals.payouts) desc, totals.agency_name;
$$;

revoke all on function public.set_payment_commission() from public, anon, authenticated;
revoke all on function public.admin_payment_rows(uuid, text, timestamptz, timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_agency_balances() from public, anon, authenticated;

grant execute on function public.admin_payment_rows(uuid, text, timestamptz, timestamptz, integer, integer) to service_role;
grant execute on function public.admin_agency_balances() to service_role;
