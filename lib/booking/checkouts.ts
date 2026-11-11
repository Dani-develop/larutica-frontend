import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/errors';
import { getReservationRecord, toPublicReservation } from '@/lib/reservations/repository';
import {derivePaymentStatus} from '@/lib/payments/status';

const SELECT = 'id,passenger_id,departure_id,number_of_people,unit_price,departure_start_at,status,expires_at,reservation_id,created_at,publication_departures(publications(id,title,destination)),reservation_payments(status,refund_status)';
type CheckoutRow = {
  id: string; passenger_id: string; departure_id: string; number_of_people: number; unit_price: number | string;
  departure_start_at: string; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'; expires_at: string;
  reservation_id: string | null; created_at: string;
  reservation_payments?:{status:string;refund_status?:'pending'|'succeeded'|'failed'|null}[];
  publication_departures: { publications: { id: string; title: string; destination: string | null } };
};

export function checkoutError(error: { message: string; code?: string }): never {
  if (error.code === 'P0002') throw new ApiError(error.message, 404);
  if (error.code === '23505') throw new ApiError(error.message, 409);
  if (error.code === '22023') throw new ApiError(error.message, 400);
  throw error;
}

export async function getCheckout(admin: SupabaseClient, id: string, userId: string) {
  if(!/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id))throw new ApiError('El intento de pago no existe.',404);
  const { data, error } = await admin.from('reservation_checkouts').select(SELECT).eq('id', id).eq('passenger_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError('El intento de pago no existe.', 404);
  return checkoutView(admin, data as unknown as CheckoutRow);
}

async function checkoutView(admin: SupabaseClient, row: CheckoutRow) {
  const publication = row.publication_departures?.publications;
  const reservation = row.reservation_id ? await getReservationRecord(admin, row.reservation_id) : null;
  return {
    id: row.id, passengerId: row.passenger_id, departureId: row.departure_id, numberOfPeople: row.number_of_people,
    unitPrice: Number(row.unit_price), total: Math.round(Number(row.unit_price) * row.number_of_people * 100) / 100,
    departureStartAt: row.departure_start_at, expiresAt: row.expires_at,
    status: row.status === 'ACTIVE' && Date.parse(row.expires_at) <= Date.now() ? 'EXPIRED' as const : row.status,
    publicationId: publication?.id ?? '', publicationTitle: publication?.title ?? 'Experiencia', destination: publication?.destination ?? null,
    reservation: reservation ? toPublicReservation(reservation) : null,
    paymentStatus:derivePaymentStatus(row.reservation_payments),refundStatus:row.reservation_payments?.find(p=>p.refund_status)?.refund_status??null,
  };
}
export type Checkout = Awaited<ReturnType<typeof checkoutView>>;

export async function findCheckout(admin: SupabaseClient, departureId: string, userId: string) {
  const { data, error } = await admin.from('reservation_checkouts').select(SELECT).eq('passenger_id', userId)
    .eq('departure_id', departureId).eq('status', 'ACTIVE').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data ? checkoutView(admin, data as unknown as CheckoutRow) : null;
}

export async function createCheckout(admin: SupabaseClient, userId: string, departureId: string, numberOfPeople: number) {
  const { data, error } = await admin.rpc('create_reservation_checkout', {
    p_passenger_id: userId, p_departure_id: departureId, p_number_of_people: numberOfPeople,
  });
  if (error) checkoutError(error);
  const checkout = await getCheckout(admin, data.id, userId);
  return checkout;
}

export async function cancelCheckout(admin: SupabaseClient, id: string, userId: string) {
  await getCheckout(admin, id, userId);
  const { error } = await admin.from('reservation_checkouts').update({ status: 'CANCELLED' })
    .eq('id', id).eq('passenger_id', userId).eq('status', 'ACTIVE');
  if (error) throw error;
  return getCheckout(admin, id, userId);
}
