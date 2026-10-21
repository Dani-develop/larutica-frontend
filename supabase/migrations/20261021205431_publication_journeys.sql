-- LaRutica: trayectos de publicaciones y copia inmutable al reservar.
-- Ejecutar una vez junto con el backend de esta versión.
-- Registrada en el proyecto Supabase de LaRutica como publication_journeys.
begin;

alter table public.publications
  add column if not exists journey jsonb,
  add column if not exists journey_required boolean not null default false;
-- El backend nuevo exige trayecto explícitamente al crear. El backend anterior
-- conserva su comportamiento durante el despliegue gradual.

alter table public.reservations
  add column if not exists journey_snapshot jsonb,
  add column if not exists meeting_point_snapshot text,
  add column if not exists journey_snapshot_captured boolean not null default false;

create or replace function public.capture_reservation_journey()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_journey jsonb;
  v_meeting text;
begin
  -- FOR SHARE serializa la copia con una edición simultánea de la publicación.
  select p.journey, p.meeting_point into v_journey, v_meeting
  from public.publications p
  join public.publication_departures d on d.publication_id = p.id
  where d.id = new.departure_id
  for share of p;
  new.journey_snapshot := case when v_journey->>'confirmedAt' is not null then v_journey else null end;
  new.meeting_point_snapshot := v_meeting;
  new.journey_snapshot_captured := true;
  return new;
end;
$$;

create or replace function public.preserve_reservation_journey()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.journey_snapshot := old.journey_snapshot;
  new.meeting_point_snapshot := old.meeting_point_snapshot;
  new.journey_snapshot_captured := old.journey_snapshot_captured;
  return new;
end;
$$;

revoke all on function public.capture_reservation_journey() from public, anon, authenticated;
revoke all on function public.preserve_reservation_journey() from public, anon, authenticated;

drop trigger if exists reservation_capture_journey on public.reservations;
create trigger reservation_capture_journey before insert on public.reservations
for each row execute function public.capture_reservation_journey();
drop trigger if exists reservation_preserve_journey on public.reservations;
create trigger reservation_preserve_journey before update on public.reservations
for each row execute function public.preserve_reservation_journey();

comment on column public.publications.journey is 'Lugares, puntos intermedios y trazado confirmado por el publicador. GeoJSON y metros/segundos.';
comment on column public.reservations.journey_snapshot is 'Trayecto confirmado vigente al crear la reserva; no se actualiza con ediciones posteriores.';

commit;
