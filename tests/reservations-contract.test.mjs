import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertCanCancel,
  assertCanConfirm,
  assertTravelerCanCreate,
  canDeleteReservation,
  filterVisibleReservations,
  parsePatchReservationBody,
  ReservationPolicyError,
} from "../lib/reservations/policy.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const future = "2099-01-01T12:00:00.000Z";
const own = { passengerId: "viajero-1", ownerUserId: "agencia-1" };
const other = { passengerId: "viajero-2", ownerUserId: "agencia-2" };

test("la migración crea reservas con cupo, precio copiado y sin acceso público", async () => {
  const sql = await read("supabase/migrations/202609220002_reservations.sql");
  assert.match(sql, /create table public\.reservations/i);
  assert.match(sql, /id uuid primary key default gen_random_uuid\(\)/i);
  assert.match(sql, /passenger_id uuid not null/i);
  assert.match(sql, /references public\.profiles\(id\)\s+on delete restrict/i);
  assert.match(sql, /departure_id uuid not null/i);
  assert.match(sql, /references public\.publication_departures\(id\)\s+on delete restrict/i);
  assert.match(sql, /number_of_people integer not null/i);
  assert.match(sql, /unit_price numeric\(10, 2\) not null/i);
  assert.match(sql, /status in \('PENDING', 'CONFIRMED', 'PAST', 'CANCELLED'\)/i);
  assert.match(sql, /reservations_set_updated_at/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.reservations from anon, authenticated/i);
  assert.match(sql, /function public\.create_reservation/i);
  assert.match(sql, /function public\.update_reservation_party_size/i);
  assert.match(sql, /v_publication\.price_per_person/i);
  assert.match(sql, /status <> 'CANCELLED'/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /mark_elapsed_reservations_past/i);
  assert.match(sql, /reservation\.status = 'CONFIRMED'/i);
  assert.match(sql, /revoke all on function public\.create_reservation/i);
});

test("los roles actuales pueden reservar y el listado respeta el alcance", () => {
  for (const role of ["Agencia", "Transporte", "Admin"]) {
    assert.doesNotThrow(() => assertTravelerCanCreate(role));
  }
  assert.doesNotThrow(() => assertTravelerCanCreate("Viajero"));

  const rows = [own, other];
  assert.deepEqual(
    filterVisibleReservations("Viajero", "viajero-1", rows).map((row) => row.passengerId),
    ["viajero-1"],
  );
  assert.deepEqual(
    filterVisibleReservations("Agencia", "agencia-1", rows).map((row) => row.ownerUserId),
    ["agencia-1"],
  );
  assert.deepEqual(
    filterVisibleReservations("Transporte", "agencia-2", rows).map((row) => row.passengerId),
    ["viajero-2"],
  );
  assert.equal(filterVisibleReservations("Admin", "admin-1", rows).length, 2);
});

test("cancelar conserva la fila, el viajero no la borra y no se cambia la salida", async () => {
  const confirmed = { ...own, status: "CONFIRMED", departureStartAt: future };
  assert.doesNotThrow(() => assertCanCancel("Viajero", "viajero-1", confirmed));
  assert.throws(
    () => assertCanCancel("Viajero", "viajero-1", { ...confirmed, status: "PAST" }),
    ReservationPolicyError,
  );
  assert.equal(canDeleteReservation("Viajero"), false);
  assert.equal(canDeleteReservation("Agencia"), false);
  assert.equal(canDeleteReservation("Transporte"), false);
  assert.equal(canDeleteReservation("Admin"), true);
  assert.throws(
    () => parsePatchReservationBody({ departureId: "otro-viaje", status: "CANCELLED" }),
    (error) => error instanceof ReservationPolicyError && error.status === 400,
  );

  const collection = await read("app/api/reservations/route.ts");
  const detail = await read("app/api/reservations/[id]/route.ts");
  const repository = await read("lib/reservations/repository.ts");
  assert.match(collection, /assertTravelerCanCreate/);
  assert.match(collection, /requireAppSession/);
  assert.match(collection, /assertSameOrigin/);
  assert.match(collection, /getSupabaseAdminClient/);
  assert.match(repository, /\.eq\("passenger_id", userId\)/);
  assert.match(repository, /publication_departures\.publications\.agencies\.owner_user_id/);
  assert.match(detail, /updateReservationStatus\(admin, id, "CANCELLED", reservation\.status\)/);
  assert.match(detail, /canDeleteReservation/);
  assert.doesNotMatch(
    detail.slice(0, detail.indexOf("export async function DELETE")),
    /\.delete\(/,
  );
});

test("el cliente expone el CRUD y Mis reservas deja los datos fijos", async () => {
  const service = await read("modules/transport/reservations/services/reservation.service.ts");
  const page = await read("components/dashboard/TravelerViews.tsx");
  const routes = await read("modules/landing/lib/travelerRoutes.ts");
  const landing = await read("app/page.tsx");
  for (const name of [
    "export async function listReservations",
    "export async function createReservation",
    "export async function getReservation",
    "export async function updateReservation",
    "export async function deleteReservation",
  ]) {
    assert.match(service, new RegExp(name));
  }
  assert.match(service, /credentials:\s*'include'/);
  assert.match(service, /body\?\.error/);
  const state = await read("modules/booking/reservationState.ts");
  const reservationsPage = page.slice(
    page.indexOf("export function TravelerReservationsPage"),
    page.indexOf("function TravelerTripCard"),
  );
  assert.match(reservationsPage, /listReservations/);
  assert.match(reservationsPage, /isUpcomingReservation/);
  assert.match(reservationsPage, /setInterval\(refresh, 30000\)/);
  assert.match(state, /status === 'PENDING'/);
  assert.match(state, /status === 'PAST'/);
  assert.match(page, /reservation\.status === "PAST"/);
  assert.match(reservationsPage, /No tienes reservas por venir/);
  assert.match(reservationsPage, /role="alert"/);
  assert.match(reservationsPage, /updateReservation\(reservation\.id, \{ status: "CANCELLED" \}\)/);
  assert.match(reservationsPage, /Cancelar viaje/);
  assert.match(reservationsPage, /Swal\.fire/);
  assert.doesNotMatch(reservationsPage, /pub-arenal-01/);
  assert.doesNotMatch(routes.slice(routes.indexOf("export const TRIP_MENU"), routes.indexOf("export type TripMenuId")), /perfil|Mi perfil/);
  assert.match(landing, /TravelerReservationsPage/);
});

test('solo el trabajador propietario o Admin pueden confirmar antes de la salida', () => {
  const pending = {...own, status:'PENDING', departureStartAt:future};
  assert.throws(() => assertCanConfirm('Viajero','viajero-1',pending), e => e.status === 403);
  assert.throws(() => assertCanConfirm('Agencia','agencia-2',pending), e => e.status === 403);
  assert.doesNotThrow(() => assertCanConfirm('Agencia','agencia-1',pending));
  assert.doesNotThrow(() => assertCanConfirm('Admin','admin-1',pending));
  assert.throws(() => assertCanConfirm('Agencia','agencia-1',{...pending,status:'CANCELLED'}));
  assert.throws(() => assertCanConfirm('Agencia','agencia-1',{...pending,departureStartAt:'2020-01-01'}));
});
