import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import {
  canReadReservation,
  listScope,
  type ReservationStatus,
} from "@/lib/reservations/policy";

const RESERVATION_SELECT = `
  id,
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
    publications (
      id,
      title,
      destination,
      meeting_point,
      agencies (
        owner_user_id, commercial_name, phone, email
      )
    )
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
  meetingPoint?: string | null;
};

type AgencyEmbed = { owner_user_id: string; commercial_name?: string; phone?: string; email?: string };
type PublicationEmbed = {
  id: string;
  title: string | null;
  destination: string | null;
  meeting_point?: string;
  agencies: AgencyEmbed | AgencyEmbed[] | null;
};
type DepartureEmbed = {
  start_at: string;
  publications: PublicationEmbed | PublicationEmbed[] | null;
};
type ReservationRow = {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    departureStartAt: departure?.start_at ?? "",
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
    meetingPoint: publication?.meeting_point,
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
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    departureStartAt: record.departureStartAt,
    publicationId: record.publicationId,
    publicationTitle: record.publicationTitle,
    destination: record.destination,
    passengerName: record.passengerName,
    passengerEmail: record.passengerEmail,
    passengerPhone: record.passengerPhone,
    agencyName: record.agencyName,
    agencyPhone: record.agencyPhone,
    agencyEmail: record.agencyEmail,
    meetingPoint: record.meetingPoint,
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
): Promise<ReservationRecord[]> {
  await markElapsed(admin);
  const scope = listScope(role);
  let query = admin.from("reservations").select(RESERVATION_SELECT).order("created_at", { ascending: false });

  if (scope === "own") {
    query = query.eq("passenger_id", userId);
  } else if (scope === "owned-agency") {
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (agencyError) throw agencyError;
    if (!agency) return [];

    const { data: publications, error: publicationsError } = await admin
      .from("publications")
      .select("id")
      .eq("agency_id", agency.id);
    if (publicationsError) throw publicationsError;
    const publicationIds = (publications ?? []).map((publication) => publication.id);
    if (publicationIds.length === 0) return [];

    const { data: departures, error: departuresError } = await admin
      .from("publication_departures")
      .select("id")
      .in("publication_id", publicationIds);
    if (departuresError) throw departuresError;
    const departureIds = (departures ?? []).map((departure) => departure.id);
    if (departureIds.length === 0) return [];
    query = query.in("departure_id", departureIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as ReservationRow[] | null ?? [])
    .map(toReservationRecord)
    .filter((reservation) => canReadReservation(role, userId, reservation));
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
): Promise<ReservationRecord> {
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
  return record;
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
