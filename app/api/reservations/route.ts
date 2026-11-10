import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import {
  listScope,
  ReservationPolicyError,
} from "@/lib/reservations/policy";
import { listReservationRecords, toPublicReservation } from "@/lib/reservations/repository";
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
    const params = new URL(request.url).searchParams;
    const mine = params.get("scope") === "mine";
    const departureId = params.get("departureId") ?? undefined;
    if (departureId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(departureId)) {
      throw new ApiError("La salida no es válida.", 400);
    }
    const admin = getSupabaseAdminClient();
    const reservations = await listReservationRecords(admin, mine ? "Viajero" : role, userId, departureId);
    return Response.json(
      { data: reservations.map(toPublicReservation) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Compatibility: an older client also creates a checkout, never an unpaid reservation.
export { POST } from '../checkouts/route';
