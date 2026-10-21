-- LaRutica: pagos de reservas con OnvoPAY.
-- El monto sale de la reserva (precio copiado × personas). El cliente no escribe esta tabla.

create table public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null
    references public.reservations(id)
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

create index reservation_payments_reservation_id_idx
  on public.reservation_payments (reservation_id);

-- Una reserva solo puede tener un pago cobrado a la vez.
create unique index reservation_payments_one_paid_idx
  on public.reservation_payments (reservation_id)
  where status = 'paid';

drop trigger if exists reservation_payments_set_updated_at on public.reservation_payments;

create trigger reservation_payments_set_updated_at
before update on public.reservation_payments
for each row
execute procedure public.set_updated_at();

alter table public.reservation_payments enable row level security;

revoke all on table public.reservation_payments from anon, authenticated;
