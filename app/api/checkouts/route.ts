import { apiErrorResponse, assertSameOrigin, ApiError } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { createCheckout, findCheckout } from '@/lib/booking/checkouts';
import { parseCreateReservationBody, assertTravelerCanCreate, ReservationPolicyError } from '@/lib/reservations/policy';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { requireAppSession } from '@/lib/supabase/session';

export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request); if (remote) return remote;
  try {
    assertSameOrigin(request);
    const { session } = await requireAppSession(request);
    const departureId = new URL(request.url).searchParams.get('departureId');
    if (!departureId || !/^[\da-f-]{36}$/i.test(departureId)) throw new ApiError('La salida no es válida.', 400);
    return Response.json({ data: await findCheckout(getSupabaseAdminClient(), departureId, session.userId) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request); if (remote) return remote;
  try {
    assertSameOrigin(request);
    const { session, profile } = await requireAppSession(request);
    assertTravelerCanCreate(profile.role);
    const body = await request.json().catch(() => { throw new ApiError('No pudimos leer los datos de la compra.', 400); });
    const input = parseCreateReservationBody(body, session.userId);
    const checkout = await createCheckout(getSupabaseAdminClient(), session.userId, input.departureId, input.numberOfPeople);
    return Response.json({ data: checkout }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return apiErrorResponse(error instanceof ReservationPolicyError ? new ApiError(error.message, error.status) : error);
  }
}
