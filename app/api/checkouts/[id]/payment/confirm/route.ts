import { ApiError, apiErrorResponse, assertSameOrigin } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { getCheckout } from '@/lib/booking/checkouts';
import { confirmCheckoutPayment } from '@/lib/payments/checkout';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { requireAppSession } from '@/lib/supabase/session';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const remote = await proxyRemoteApiRequest(request); if (remote) return remote;
  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const admin = getSupabaseAdminClient();
    const checkout = await getCheckout(admin, (await context.params).id, session.userId);
    const body = await request.json().catch(() => null) as {paymentIntentId?:unknown}|null;
    if (typeof body?.paymentIntentId !== 'string' || !body.paymentIntentId || body.paymentIntentId.length > 100) throw new ApiError('El pago no es válido.', 400);
    return Response.json({ data: await confirmCheckoutPayment(admin, checkout, body.paymentIntentId) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
