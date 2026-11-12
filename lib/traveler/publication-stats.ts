import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicationStats = {
  bookingCount: number;
  ratingCount: number;
  ratingAverage: number | null;
};

type ReservationStatsRow = {
  publication_departures: { publication_id: string } | { publication_id: string }[] | null;
  reservation_ratings: { rating: number } | { rating: number }[] | null;
};

const one = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

/**
 * Reservas y calificaciones agregadas por publicación. Solo expone conteos y
 * promedios: nunca pasajeros ni reservas individuales.
 * "Reservado" cuenta reservas confirmadas o ya finalizadas (no pendientes ni canceladas).
 */
export async function publicationStats(
  admin: SupabaseClient,
  publicationIds: string[],
): Promise<Map<string, PublicationStats>> {
  const stats = new Map<string, PublicationStats>();
  if (publicationIds.length === 0) return stats;

  const { data, error } = await admin
    .from("reservations")
    .select("publication_departures!inner(publication_id), reservation_ratings(rating)")
    .in("publication_departures.publication_id", publicationIds)
    .in("status", ["CONFIRMED", "PAST"]);
  if (error) throw error;

  const totals = new Map<string, { bookings: number; ratings: number; sum: number }>();
  for (const row of (data ?? []) as unknown as ReservationStatsRow[]) {
    const publicationId = one(row.publication_departures)?.publication_id;
    if (!publicationId) continue;
    const entry = totals.get(publicationId) ?? { bookings: 0, ratings: 0, sum: 0 };
    entry.bookings += 1;
    const rating = one(row.reservation_ratings)?.rating;
    if (typeof rating === "number") {
      entry.ratings += 1;
      entry.sum += rating;
    }
    totals.set(publicationId, entry);
  }

  for (const [publicationId, entry] of totals) {
    stats.set(publicationId, {
      bookingCount: entry.bookings,
      ratingCount: entry.ratings,
      ratingAverage: entry.ratings ? Math.round((entry.sum / entry.ratings) * 10) / 10 : null,
    });
  }
  return stats;
}
