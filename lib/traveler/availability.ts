import type { SupabaseClient } from '@supabase/supabase-js';

// Each UUID adds ~37 chars to the PostgREST URL; large `in` filters exceed the gateway limit (400).
const ID_CHUNK = 100;

/** Count pending and confirmed seats; cancelled reservations release their seats. */
export async function usedDepartureSeats(admin: SupabaseClient, ids: string[]) {
  const used = new Map<string, number>();
  for (let start = 0; start < ids.length; start += ID_CHUNK) {
    const chunk = ids.slice(start, start + ID_CHUNK);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('reservations')
        .select('departure_id,number_of_people').in('departure_id', chunk)
        .neq('status', 'CANCELLED').order('id').range(from, from + 999);
      if (error) throw error;
      for (const row of data ?? []) used.set(row.departure_id, (used.get(row.departure_id) ?? 0) + Number(row.number_of_people));
      if (!data || data.length < 1000) break;
    }
  }
  return used;
}

export async function publicationDepartures(admin: SupabaseClient, ids: string[]) {
  const { data, error } = await admin.from('publication_departures')
    .select('id,publication_id,start_at,capacity').in('publication_id', ids)
    .eq('status', 'ACTIVE').gt('start_at', new Date().toISOString()).order('start_at');
  if (error) throw error;
  const rows = data ?? [];
  const used = await usedDepartureSeats(admin, rows.map(row => row.id));
  return rows.map(row => ({ publicationId: row.publication_id, id: row.id, startAt: row.start_at,
    available: Math.max(0, Number(row.capacity) - (used.get(row.id) ?? 0)) }));
}
