import type { Journey } from "@/modules/journeys/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { derivePaymentStatus, type ReservationPaymentStatus } from "@/lib/payments/status";
import { refundReservationPaymentSafely } from "@/lib/payments/repository";
import { reservationWasInserted } from "@/lib/reservations/departure-cancel";
import {
  canReadReservation,
  listScope,
  type ReservationStatus,
} from "@/lib/reservations/policy";

const RESERVATION_SELECT = `
  id,
  journey_snapshot,
  meeting_point_snapshot,
  journey_snapshot_captured,
  passenger_id,
  departure_id,
  number_of_people,
  unit_price,
  status,
  created_at,
  updated_at,
  profiles ( full_name, email, phone ),
  publication_departures (
    start_at,
    status,
    publications (
      id,
      title,
      destination,
      meeting_point,
      main_image_url,
      agencies (
        owner_user_id, commercial_name, phone, email
      )
    )
  ),
  reservation_ratings (
    rating
  ),
  reservation_payments (
    status
  )
`;

export type ReservationRecord = {
  id: string;
  passengerId: string;
  departureId: string;
  numberOfPeople: number;
  unitPrice: number;
  total: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  departureStartAt: string;
  departureStatus: string;
  rating: number | null;
  paymentStatus: ReservationPaymentStatus;
  publicationId: string;
  publicationTitle: string;
  destination: string | null;
  ownerUserId: string | null;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string | null;
  agencyName?: string;
  agencyPhone?: string | null;
  agencyEmail?: string | null;
  journey?: Journey | null;
  meetingPoint?: string | null;
  publicationImageUrl?: string | null;
};

type AgencyEmbed = { owner_user_id: string; commercial_name?: string; phone?: string; email?: string };
type PublicationEmbed = {
  id: string;
  title: string | null;
  destination: string | null;
  meeting_point?: string;
  main_image_url?: string | null;
  agencies: AgencyEmbed | AgencyEmbed[] | null;
};
type DepartureEmbed = {
  start_at: string;
  status: string;
  publications: PublicationEmbed | PublicationEmbed[] | null;
};
type ReservationRow = {
  journey_snapshot?: Journey | null;
  meeting_point_snapshot?: string | null;
  journey_snapshot_captured?: boolean;
  id: string;
  passenger_id: string;
  departure_id: string;
  number_of_people: number;
  unit_price: number | string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string; phone: string | null } | { full_name: string; email: string; phone: string | null }[] | null;
  publication_departures: DepartureEmbed | DepartureEmbed[] | null;
  reservation_ratings: { rating: number } | { rating: number }[] | null;
  reservation_payments?: { status: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function throwDatabaseError(error: { message: string; code?: string }): never {
  if (error.code === "P0002" || error.message.includes("no existe")) {
    throw new ApiError(error.message, 404);
  }
  if (
    error.code === "22023"
    || error.message.includes("cupo")
    || error.message.includes("no está disponible")
    || error.message.includes("número de personas")
    || error.message.includes("ya comenzó")
    || error.message.includes("ya no admite")
  ) {
    throw new ApiError(error.message, 400);
  }
  throw error;
}

export function toReservationRecord(row: ReservationRow): ReservationRecord {
  const departure = one(row.publication_departures);
  const publication = one(departure?.publications ?? null);
  const agency = one(publication?.agencies ?? null);
  const passenger = one(row.profiles);
  const unitPrice = Number(row.unit_price);
  const numberOfPeople = row.number_of_people;
  return {
    id: row.id,
    passengerId: row.passenger_id,
    departureId: row.departure_id,
    numberOfPeople,
    unitPrice,
    total: Math.round(unitPrice * numberOfPeople * 100) / 100,
    status: row.status,
    rating: one(row.reservation_ratings)?.rating ?? null,
    paymentStatus: derivePaymentStatus(row.reservation_payments),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    departureStartAt: departure?.start_at ?? "",
    departureStatus: departure?.status ?? "",
    publicationId: publication?.id ?? "",
    publicationTitle: publication?.title ?? "Reserva",
    destination: publication?.destination ?? null,
    ownerUserId: agency?.owner_user_id ?? null,
    passengerName: passenger?.full_name,
    passengerEmail: passenger?.email,
    passengerPhone: passenger?.phone,
    agencyName: agency?.commercial_name,
    agencyPhone: agency?.phone,
    agencyEmail: agency?.email,
    journey: row.journey_snapshot ?? null,
    meetingPoint: row.journey_snapshot_captured ? row.meeting_point_snapshot : publication?.meeting_point,
    publicationImageUrl: publication?.main_image_url ?? null,
  };
}

export function toPublicReservation(record: ReservationRecord) {
  return {
    id: record.id,
    passengerId: record.passengerId,
    departureId: record.departureId,
    numberOfPeople: record.numberOfPeople,
    unitPrice: record.unitPrice,
    total: record.total,
    status: record.status,
    rating: record.rating,
    paymentStatus: record.paymentStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    departureStartAt: record.departureStartAt,
    departureStatus: record.departureStatus,
    publicationId: record.publicationId,
    publicationTitle: record.publicationTitle,
    destination: record.destination,
    passengerName: record.passengerName,
    passengerEmail: record.passengerEmail,
    passengerPhone: record.passengerPhone,
    agencyName: record.agencyName,
    agencyPhone: record.agencyPhone,
    agencyEmail: record.agencyEmail,
    journey: record.journey ?? null,
    meetingPoint: record.meetingPoint,
    publicationImageUrl: record.publicationImageUrl ?? null,
  };
}

async function markElapsed(admin: SupabaseClient) {
  const { error } = await admin.rpc("mark_elapsed_reservations_past");
  if (error) throwDatabaseError(error);
}

export async function listReservationRecords(
  admin: SupabaseClient,
  role: string,
  userId: string,
  departureId?: string,
): Promise<ReservationRecord[]> {
  await markElapsed(admin);
  const scope = listScope(role);
  // Inner joins make ownership filtering apply to reservations themselves.
  const selection = scope === "owned-agency"
    ? RESERVATION_SELECT.replace("publication_departures (", "publication_departures!inner (")
      .replace("publications (", "publications!inner (")
      .replace("agencies (", "agencies!inner (")
    : RESERVATION_SELECT;
  let query = admin.from("reservations").select(selection)
    .order("created_at", { ascending: scope !== "own" }).order("id", { ascending: true });
  if (departureId) query = query.eq("departure_id", departureId);

  if (scope === "own") {
    query = query.eq("passenger_id", userId);
  } else if (scope === "owned-agency") {
    query = query.eq("publication_departures.publications.agencies.owner_user_id", userId);
  }

  const rows: ReservationRow[] = [];
  // Supabase caps each response; fetch every page so older requests are not lost.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw error;
    const page = data as unknown as ReservationRow[] | null ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const records = rows
    .map(toReservationRecord)
    .filter((reservation) => canReadReservation(role, userId, reservation));
  // Transition only upcoming, active legacy reservations. Past and cancelled
  // bookings retain their history; persisted states match the traveler badge.
  const legacyIds = records.filter(r => r.status === "PENDING" && r.departureStatus === "ACTIVE" && Date.parse(r.departureStartAt) > Date.now()).map(r => r.id);
  for (let start = 0; start < legacyIds.length; start += 100) {
    const { data, error } = await admin.from("reservations").update({ status: "CONFIRMED" })
      .in("id", legacyIds.slice(start, start + 100)).eq("status", "PENDING").select("id");
    if (error) throw error;
    const confirmed = new Set((data ?? []).map((r: { id: string }) => r.id));
    for (const record of records) if (confirmed.has(record.id)) record.status = "CONFIRMED";
  }
  return records;
}

export async function getReservationRecord(admin: SupabaseClient, id: string): Promise<ReservationRecord | null> {
  await markElapsed(admin);
  const { data, error } = await admin
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toReservationRecord(data as ReservationRow);
}

export async function createReservationRecord(
  admin: SupabaseClient,
  passengerId: string,
  departureId: string,
  numberOfPeople: number,
): Promise<{ record: ReservationRecord; inserted: boolean }> {
  // A retry belongs to this passenger, never to another user's reservation.
  const { data: existing, error: existingError } = await admin.from("reservations")
    .select(RESERVATION_SELECT).eq("passenger_id", passengerId).eq("departure_id", departureId)
    .in("status", ["PENDING", "CONFIRMED"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    // Retry a legacy pending booking without reserving capacity a second time.
    if (existing.status === "PENDING") {
      await updateReservationStatus(admin, existing.id, "CONFIRMED", "PENDING");
      const confirmed = await getReservationRecord(admin, existing.id);
      if (!confirmed) throw new ApiError("No se pudo consultar la reserva.", 500);
      return { record: confirmed, inserted: reservationWasInserted(existing.status) };
    }
    return { record: toReservationRecord(existing as ReservationRow), inserted: reservationWasInserted(existing.status) };
  }
  const { data: departure, error: availabilityError } = await admin.from("publication_departures")
    .select("publications!inner(agencies!inner(status))").eq("id", departureId)
    .eq("publications.agencies.status", "APPROVED").maybeSingle();
  if (availabilityError) throw availabilityError;
  if (!departure) throw new ApiError("El proveedor ya no está disponible para recibir reservas.", 409);
  const { data, error } = await admin.rpc("create_reservation", {
    p_passenger_id: passengerId,
    p_departure_id: departureId,
    p_number_of_people: numberOfPeople,
  });
  if (error) throwDatabaseError(error);
  const created = data as { id?: string } | null;
  if (!created?.id) throw new ApiError("No se pudo crear la reserva.", 500);
  const record = await getReservationRecord(admin, created.id);
  if (!record) throw new ApiError("No se pudo crear la reserva.", 500);
  // Compatibility with databases still running the earlier RPC. Capacity is
  // already secured by its departure lock; never confirm a cancelled booking.
  if (record.status === "PENDING") {
    await updateReservationStatus(admin, record.id, "CONFIRMED", "PENDING");
    const confirmed = await getReservationRecord(admin, record.id);
    if (!confirmed) throw new ApiError("No se pudo consultar la reserva.", 500);
    return { record: confirmed, inserted: reservationWasInserted(null) };
  }
  return { record, inserted: reservationWasInserted(null) };
}

export type CancelledDepartureReservation = {
  id: string;
  passengerEmail: string | null;
  passengerName: string | null;
  publicationTitle: string;
  departureStartAt: string;
  numberOfPeople: number;
  total: number;
};

export async function cancelDepartureReservations(
  admin: SupabaseClient,
  departureId: string,
): Promise<CancelledDepartureReservation[]> {
  const { data, error } = await admin.rpc("cancel_departure_reservations", {
    p_departure_id: departureId,
  });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    passenger_email: string | null;
    passenger_name: string | null;
    publication_title: string | null;
    departure_start_at: string;
    number_of_people: number;
    total: number | string;
  }[];
  // La salida cancelada libera a los viajeros: lo cobrado se devuelve completo.
  await Promise.all(rows.map((row) => refundReservationPaymentSafely(admin, row.id)));
  return rows.map((row) => ({
    id: row.id,
    passengerEmail: row.passenger_email,
    passengerName: row.passenger_name,
    publicationTitle: row.publication_title ?? "Reserva",
    departureStartAt: row.departure_start_at,
    numberOfPeople: row.number_of_people,
    total: Number(row.total),
  }));
}

export async function updateReservationPartySize(
  admin: SupabaseClient,
  reservationId: string,
  numberOfPeople: number,
) {
  const { error } = await admin.rpc("update_reservation_party_size", {
    p_reservation_id: reservationId,
    p_number_of_people: numberOfPeople,
  });
  if (error) throwDatabaseError(error);
}

export async function updateReservationStatus(
  admin: SupabaseClient,
  reservationId: string,
  status: "CONFIRMED" | "CANCELLED",
  expectedStatus: ReservationStatus,
) {
  const { data, error } = await admin
    .from("reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ApiError("La reserva cambió antes de guardar. Vuelve a intentarlo.", 409);
  }
}
