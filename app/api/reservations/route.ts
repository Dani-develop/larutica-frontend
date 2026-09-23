import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import {
  assertTravelerCanCreate,
  listScope,
  parseCreateReservationBody,
  ReservationPolicyError,
} from "@/lib/reservations/policy";
import { createReservationRecord, listReservationRecords, toPublicReservation } from "@/lib/reservations/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

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

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    const role = appSession.profile.role;
    const userId = appSession.session.userId;
    guardPolicy(() => listScope(role));
    const admin = getSupabaseAdminClient();
    const reservations = await listReservationRecords(admin, role, userId);
    return Response.json(
      { data: reservations.map(toPublicReservation) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    guardPolicy(() => assertTravelerCanCreate(appSession.profile.role));
    const body = await request.json();
    const input = guardPolicy(() => parseCreateReservationBody(body, appSession.session.userId));
    const admin = getSupabaseAdminClient();
    const reservation = await createReservationRecord(
      admin,
      appSession.session.userId,
      input.departureId,
      input.numberOfPeople,
    );
    return Response.json(
      { data: toPublicReservation(reservation) },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
