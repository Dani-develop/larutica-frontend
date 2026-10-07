import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { getReservationRecord } from "@/lib/reservations/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";

type RouteContext = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { session, profile } = await requireAppSession(request);
    if (profile.role !== "Viajero" || profile.status !== "Activo") {
      throw new ApiError("Solo los viajeros pueden calificar sus reservas.", 403);
    }

    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) throw new ApiError("La reserva no es válida.", 400);

    const body: unknown = await request.json();
    if (
      typeof body !== "object"
      || body === null
      || !("rating" in body)
      || typeof body.rating !== "number"
      || !Number.isInteger(body.rating)
      || body.rating < 1
      || body.rating > 5
    ) {
      throw new ApiError("La calificación debe ser de 1 a 5 estrellas.", 400);
    }

    const admin = getSupabaseAdminClient();
    const reservation = await getReservationRecord(admin, id);
    if (!reservation || reservation.passengerId !== session.userId) {
      throw new ApiError("La reserva no existe.", 404);
    }
    if (reservation.status !== "PAST") {
      throw new ApiError("Solo puedes calificar viajes que ya pasaron.", 409);
    }

    const { data, error } = await admin.rpc("rate_past_reservation", {
      p_reservation_id: id,
      p_passenger_id: session.userId,
      p_rating: body.rating,
    });
    if (error) {
      if (error.code === "42501") {
        throw new ApiError("Solo puedes calificar tus viajes que ya pasaron.", 403);
      }
      if (error.code === "22023") {
        throw new ApiError(error.message, 400);
      }
      throw error;
    }

    const rating = (data as { rating?: number } | null)?.rating;
    if (rating === undefined) throw new ApiError("No se pudo guardar la calificación.", 500);
    return Response.json(
      { data: { reservationId: id, rating } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
