import { ApiError, apiErrorResponse, assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { confirmPromotionPayment, getOwnedPublication } from "@/lib/payments/promotion";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { requireAppSession } from "@/lib/supabase/session";

type RouteContext = { params: Promise<{ id: string }> };

const PUBLICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    const { id } = await context.params;
    if (!PUBLICATION_ID.test(id)) throw new ApiError("La publicación no existe.", 404);
    const body = await request.json().catch(() => null) as { paymentIntentId?: unknown } | null;
    const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    if (!paymentIntentId || paymentIntentId.length > 100) throw new ApiError("El pago no es válido.", 400);
    const admin = getSupabaseAdminClient();
    const publication = await getOwnedPublication(admin, id, appSession.session.userId);
    if (!publication) throw new ApiError("La publicación no existe.", 404);
    const result = await confirmPromotionPayment(admin, publication, paymentIntentId);
    return Response.json({ data: result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
