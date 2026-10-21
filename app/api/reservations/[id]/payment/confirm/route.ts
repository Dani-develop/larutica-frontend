import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { confirmReservationPayment } from "@/lib/payments/repository";
import { getReservationRecord } from "@/lib/reservations/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { paymentIntentId?: unknown } | null;
    const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    if (!paymentIntentId || paymentIntentId.length > 100) {
      throw new ApiError("El pago no es válido.", 400);
    }
    const admin = getSupabaseAdminClient();
    const reservation = await getReservationRecord(admin, id);
    if (!reservation || reservation.passengerId !== appSession.session.userId) {
      throw new ApiError("La reserva no existe.", 404);
    }
    const result = await confirmReservationPayment(admin, reservation, appSession.session.userId, paymentIntentId);
    return Response.json({ data: result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
