import { ApiError, apiErrorResponse, assertSameOrigin } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { requireAppSession } from '@/lib/supabase/session';

// One owner-scoped request replaces one authenticated request per publication.
export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;
  try {
    assertSameOrigin(request);
    const session = await requireAppSession(request);
    if (!['Agencia', 'Transporte'].includes(session.profile.role)) throw new ApiError('No tienes permisos para consultar salidas.', 403);
    const admin = getSupabaseAdminClient();
    const departures = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from('publication_departures')
        .select('id,publication_id,start_at,end_at,capacity,status,created_at,updated_at,publications!inner(agencies!inner(owner_user_id))')
        .eq('publications.agencies.owner_user_id', session.session.userId)
        .order('id').range(offset, offset + 999);
      if (error) throw error;
      for (const row of data ?? []) departures.push({id:row.id,publicationId:row.publication_id,
        startAt:row.start_at,endAt:row.end_at,capacity:row.capacity,status:row.status,
        createdAt:row.created_at,updatedAt:row.updated_at});
      if (!data || data.length < 1000) break;
    }
    return Response.json({ data: departures }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
