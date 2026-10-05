import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import {
  assertCanCancel,
  assertCanChangePartySize,
  assertCanConfirm,
  canDeleteReservation,
  canReadReservation,
  parsePatchReservationBody,
  ReservationPolicyError,
} from "@/lib/reservations/policy";
import {
  getReservationRecord,
  toPublicReservation,
  updateReservationPartySize,
  updateReservationStatus,
} from "@/lib/reservations/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = { params: Promise<{ id: string }> };

function guardPolicy<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ReservationPolicyError) {
      throw new ApiError(error.message, error.status);
    }
    throw error;
  }
}

async function loadVisibleReservation(request: Request, id: string) {
  const appSession = await requireAppSession(request);
  const admin = getSupabaseAdminClient();
  const reservation = await getReservationRecord(admin, id);
  if (!reservation || !canReadReservation(appSession.profile.role, appSession.session.userId, reservation)) {
    throw new ApiError("La reserva no existe.", 404);
  }
  return { admin, appSession, reservation };
}

export async function GET(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const { reservation } = await loadVisibleReservation(request, id);
    return Response.json(
      { data: toPublicReservation(reservation) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    const body = await request.json();
    const patch = guardPolicy(() => parsePatchReservationBody(body));
    const { admin, appSession, reservation } = await loadVisibleReservation(request, id);
    const role = appSession.profile.role;
    const userId = appSession.session.userId;

    if (patch.numberOfPeople !== undefined) {
      guardPolicy(() => assertCanChangePartySize(role, userId, reservation));
    }

    // Validate the whole request before making any change.
    if (patch.status === "CONFIRMED") guardPolicy(() => assertCanConfirm(role, userId, reservation));
    if (patch.status === "CANCELLED") guardPolicy(() => assertCanCancel(role, userId, reservation));
    if (patch.numberOfPeople !== undefined) await updateReservationPartySize(admin, id, patch.numberOfPeople);

    if (patch.status === "CONFIRMED") {
      guardPolicy(() => assertCanConfirm(role, userId, reservation));
      await updateReservationStatus(admin, id, "CONFIRMED", reservation.status);
    }

    if (patch.status === "CANCELLED") {
      guardPolicy(() => assertCanCancel(role, userId, reservation));
      await updateReservationStatus(admin, id, "CANCELLED", reservation.status);
    }

    const updated = await getReservationRecord(admin, id);
    if (!updated) throw new ApiError("La reserva no existe.", 404);
    return Response.json(
      { data: toPublicReservation(updated) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    if (!canDeleteReservation(appSession.profile.role)) {
      throw new ApiError("Solo un administrador puede borrar una reserva.", 403);
    }
    const { id } = await context.params;
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("reservations").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ data: null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
