import { apiErrorResponse, ApiError } from '@/lib/api/errors';
import { proxyRemoteApiRequest } from '@/lib/api/remote-proxy';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

// Explicit public projection: never expose provider documents or passenger records.
export async function GET(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;
  try {
    const admin = getSupabaseAdminClient();
    const id = new URL(request.url).searchParams.get('id');
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError('La experiencia no existe.', 404);
    let query = admin.from('publications').select('id,title,description,destination,service_type,price_per_person,duration_minutes,main_image_url,included,not_included,meeting_point,agencies!inner(commercial_name,status),publication_departures(id,start_at,capacity,status)')
      .eq('status', 'APPROVED').eq('agencies.status', 'APPROVED')
      .eq('publication_departures.status', 'ACTIVE')
      .gt('publication_departures.start_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (id) query = query.eq('id', id);
    const { data, error } = await query;
    if (error) throw error;
    const now = Date.now();
    const rows = (data ?? []).filter(p => p.price_per_person !== null)
      .filter(p => id || p.publication_departures.some(d => d.status === 'ACTIVE' && Date.parse(d.start_at) > now));
    const departures = rows.flatMap(p => p.publication_departures).filter(d => d.status === 'ACTIVE' && Date.parse(d.start_at) > now);
    const used = new Map<string, number>();
    const departureIds = departures.map(d => d.id);
    // Page the aggregate input so Supabase's row cap cannot overstate availability.
    if (departures.length) {
      for (let from = 0; ; from += 1000) {
        const { data: reservations, error: reservationError } = await admin.from('reservations')
          .select('departure_id,number_of_people').in('departure_id', departureIds)
          .neq('status', 'CANCELLED').order('id').range(from, from + 999);
        if (reservationError) throw reservationError;
        for (const r of reservations ?? []) used.set(r.departure_id, (used.get(r.departure_id) ?? 0) + r.number_of_people);
        if (!reservations || reservations.length < 1000) break;
      }
    }
    return Response.json({ data: rows.map(p => ({
      id: p.id, title: p.title, description: p.description, destination: p.destination,
      serviceType: p.service_type, price: Number(p.price_per_person), duration: p.duration_minutes,
      image: p.main_image_url, included: p.included, notIncluded: p.not_included, meetingPoint: p.meeting_point,
      agency: (Array.isArray(p.agencies) ? p.agencies[0] : p.agencies)?.commercial_name ?? 'Proveedor local',
      departures: p.publication_departures.filter(d => d.status === 'ACTIVE' && Date.parse(d.start_at) > now)
        .map(d => ({ id: d.id, startAt: d.start_at, available: Math.max(0, d.capacity - (used.get(d.id) ?? 0)) }))
        .sort((a,b) => a.startAt.localeCompare(b.startAt)),
    })) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
