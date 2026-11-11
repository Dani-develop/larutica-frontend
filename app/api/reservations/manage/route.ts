import { apiErrorResponse,assertSameOrigin } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { requireAppSession } from '@/lib/supabase/session';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { reservationManagement } from '@/lib/reservations/management';

export async function GET(request:Request) {
  const remote=await proxyRemoteApiRequest(request);if(remote)return remote;
  try {
    assertSameOrigin(request);
    const session=await requireAppSession(request);
    const result=await reservationManagement(getSupabaseAdminClient(),session.profile.role,session.session.userId,new URL(request.url));
    return Response.json(result,{headers:{'cache-control':'no-store'}});
  } catch(error){return apiErrorResponse(error);}
}
