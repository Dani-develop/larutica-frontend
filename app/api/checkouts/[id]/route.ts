import { apiErrorResponse, assertSameOrigin } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { cancelCheckout, getCheckout } from '@/lib/booking/checkouts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { requireAppSession } from '@/lib/supabase/session';
import {reconcileCheckoutPayment} from '@/lib/payments/checkout';
type Context = { params: Promise<{ id: string }> };
async function handle(request: Request, context: Context, cancel: boolean) {
  const remote = await proxyRemoteApiRequest(request); if (remote) return remote;
  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const { id } = await context.params;
    const data = await (cancel ? cancelCheckout : getCheckout)(getSupabaseAdminClient(), id, session.userId);
    return Response.json({ data }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
export const GET = (request: Request, context: Context) => handle(request, context, false);
export const DELETE = (request: Request, context: Context) => handle(request, context, true);
export async function POST(request:Request,context:Context) {
  const remote=await proxyRemoteApiRequest(request);if(remote)return remote;
  try {
    assertSameOrigin(request);
    const {session}=await requireAppSession(request),admin=getSupabaseAdminClient();
    const checkout=await getCheckout(admin,(await context.params).id,session.userId);
    return Response.json({data:await reconcileCheckoutPayment(admin,checkout)},{headers:{'cache-control':'no-store'}});
  }catch(error){return apiErrorResponse(error);}
}
