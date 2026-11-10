import { apiErrorResponse, assertSameOrigin } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { getCheckout } from '@/lib/booking/checkouts';
import { startCheckoutPayment } from '@/lib/payments/checkout';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { requireAppSession } from '@/lib/supabase/session';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const remote = await proxyRemoteApiRequest(request); if (remote) return remote;
  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const admin = getSupabaseAdminClient();
    const checkout = await getCheckout(admin, (await context.params).id, session.userId);
    return Response.json({ data: await startCheckoutPayment(admin, checkout) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
