export const RESERVATION_STATUSES = ["PENDING", "CONFIRMED", "PAST", "CANCELLED"] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export class ReservationPolicyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReservationPolicyError";
    this.status = status;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReservationVisibility = {
  passengerId: string;
  ownerUserId: string | null;
};

export type ReservationMutation = ReservationVisibility & {
  status: ReservationStatus;
  departureStartAt: string;
  departureStatus?: string;
};

export type CreateReservationInput = {
  departureId: string;
  numberOfPeople: number;
};

export type PatchReservationInput = {
  numberOfPeople?: number;
  status?: "CONFIRMED" | "CANCELLED";
};

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ReservationPolicyError("El cuerpo de la solicitud no es válido.", 400);
  }
  return body as Record<string, unknown>;
}

function assertAllowedKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>, message: string) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new ReservationPolicyError(message, 400);
    }
  }
}

function assertPositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
    throw new ReservationPolicyError("Indica un número válido de personas, mayor que cero.", 400);
  }
  return value;
}

export function assertTravelerCanCreate(role: string) {
  if (!["Viajero", "Agencia", "Transporte", "Admin"].includes(role)) {
    throw new ReservationPolicyError("Tu cuenta no puede crear una reserva.", 403);
  }
}

export function parseCreateReservationBody(body: unknown, sessionUserId: string): CreateReservationInput {
  const record = asRecord(body);
  assertAllowedKeys(
    record,
    new Set(["departureId", "numberOfPeople", "passengerId"]),
    "La reserva solo acepta la salida y el número de personas.",
  );
  if (record.passengerId !== undefined && record.passengerId !== sessionUserId) {
    throw new ReservationPolicyError("Solo puedes reservar a tu nombre.", 400);
  }
  if (typeof record.departureId !== "string" || !UUID_PATTERN.test(record.departureId)) {
    throw new ReservationPolicyError("La salida no es válida.", 400);
  }
  return {
    departureId: record.departureId,
    numberOfPeople: assertPositiveInteger(record.numberOfPeople),
  };
}

export function parsePatchReservationBody(body: unknown): PatchReservationInput {
  const record = asRecord(body);
  if (
    "departureId" in record
    || "passengerId" in record
    || "unitPrice" in record
    || "publicationId" in record
    || "date" in record
  ) {
    throw new ReservationPolicyError("No se puede cambiar la salida ni el pasajero de una reserva.", 400);
  }
  assertAllowedKeys(
    record,
    new Set(["numberOfPeople", "status"]),
    "Solo se puede cambiar el número de personas o el estado.",
  );
  if (record.numberOfPeople === undefined && record.status === undefined) {
    throw new ReservationPolicyError("No hay cambios para aplicar.", 400);
  }
  if (record.numberOfPeople !== undefined && record.status !== undefined) {
    throw new ReservationPolicyError("Cambia primero las personas o el estado de la reserva, una cosa a la vez.", 400);
  }

  const patch: PatchReservationInput = {};
  if (record.numberOfPeople !== undefined) {
    patch.numberOfPeople = assertPositiveInteger(record.numberOfPeople);
  }
  if (record.status !== undefined) {
    if (record.status !== "CONFIRMED" && record.status !== "CANCELLED") {
      throw new ReservationPolicyError("El estado solo puede pasar a confirmada o cancelada.", 400);
    }
    patch.status = record.status;
  }
  return patch;
}

export function canReadReservation(role: string, userId: string, reservation: ReservationVisibility) {
  if (role === "Admin") return true;
  if (["Viajero", "Agencia", "Transporte"].includes(role) && reservation.passengerId === userId) return true;
  if (role === "Viajero") return reservation.passengerId === userId;
  if (role === "Agencia" || role === "Transporte") return reservation.ownerUserId === userId;
  return false;
}

export function filterVisibleReservations<T extends ReservationVisibility>(
  role: string,
  userId: string,
  reservations: T[],
) {
  return reservations.filter((reservation) => canReadReservation(role, userId, reservation));
}

export function canDeleteReservation(role: string) {
  return role === "Admin";
}

function assertKnownActor(role: string, userId: string, reservation: ReservationVisibility) {
  const isPassenger = ["Viajero", "Agencia", "Transporte", "Admin"].includes(role) && reservation.passengerId === userId;
  const isOwner = (role === "Agencia" || role === "Transporte") && reservation.ownerUserId === userId;
  const isAdmin = role === "Admin";
  if (!isPassenger && !isOwner && !isAdmin) {
    throw new ReservationPolicyError("No puedes modificar esta reserva.", 403);
  }
}

export function departureHasStarted(departureStartAt: string, now = Date.now()) {
  const start = Date.parse(departureStartAt);
  return Number.isNaN(start) || start <= now;
}

export function assertCanConfirm(role: string, userId: string, reservation: ReservationMutation, now = Date.now()) {
  if (role !== "Agencia" && role !== "Transporte" && role !== "Admin") {
    throw new ReservationPolicyError("Solo el proveedor puede confirmar tu reserva.", 403);
  }
  if (role !== "Admin" && reservation.ownerUserId !== userId) {
    throw new ReservationPolicyError("Solo quien organiza esta experiencia puede confirmar la reserva.", 403);
  }
  assertKnownActor(role, userId, reservation);
  if (reservation.departureStatus && reservation.departureStatus !== "ACTIVE") {
    throw new ReservationPolicyError("Esta salida ya no está disponible. No se puede confirmar la reserva.", 400);
  }
  if (reservation.status !== "PENDING") {
    throw new ReservationPolicyError("Solo una reserva pendiente se puede confirmar.", 400);
  }
  if (departureHasStarted(reservation.departureStartAt, now)) {
    throw new ReservationPolicyError("La salida ya comenzó.", 400);
  }
}

export function assertCanCancel(role: string, userId: string, reservation: ReservationMutation) {
  assertKnownActor(role, userId, reservation);
  if (departureHasStarted(reservation.departureStartAt)) {
    throw new ReservationPolicyError("La salida ya comenzó. No se puede cancelar.", 400);
  }
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    throw new ReservationPolicyError("Esta reserva ya no se puede cancelar.", 400);
  }
}

export function assertCanChangePartySize(role: string, userId: string, reservation: ReservationMutation, now = Date.now()) {
  const isPassenger = ["Viajero", "Agencia", "Transporte", "Admin"].includes(role) && reservation.passengerId === userId;
  const isAdmin = role === "Admin";
  if (!isPassenger && !isAdmin) {
    throw new ReservationPolicyError("No puedes cambiar el número de personas de esta reserva.", 403);
  }
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    throw new ReservationPolicyError("Esta reserva ya no admite cambios de personas.", 400);
  }
  if (departureHasStarted(reservation.departureStartAt, now)) {
    throw new ReservationPolicyError("La salida ya comenzó.", 400);
  }
}

export function listScope(role: string): "own" | "owned-agency" | "all" {
  if (role === "Viajero") return "own";
  if (role === "Agencia" || role === "Transporte") return "owned-agency";
  if (role === "Admin") return "all";
  throw new ReservationPolicyError("Tu cuenta no puede consultar reservas.", 403);
}
