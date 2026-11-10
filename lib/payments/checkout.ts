import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/errors';
import { checkoutError, getCheckout, type Checkout } from '@/lib/booking/checkouts';
import { createOnvoPaymentIntent, fetchOnvoPaymentIntent, getOnvoPublishableKey, mapOnvoStatus, fromMinorUnits, type OnvoPaymentIntent } from './onvo';
import { refundPayment, notifySettledPayment } from './repository';

export async function startCheckoutPayment(admin: SupabaseClient, checkout: Checkout) {
  if (checkout.status !== 'ACTIVE' || checkout.total <= 0) throw new ApiError('Este intento ya no admite pago. Revisa su estado o inicia una compra nueva.', 409);
  const publishableKey = getOnvoPublishableKey();
  const claim = await admin.rpc('claim_checkout_payment', { p_checkout_id: checkout.id });
  if (claim.error) checkoutError(claim.error);
  if (!claim.data) throw new ApiError('Estamos preparando tu pago. Vuelve a intentar en unos instantes.', 409);
  try {
    const { data, error } = await admin.from('reservation_payments').select('provider_payment_id,status').eq('checkout_id', checkout.id)
      .in('status', ['pending', 'failed']).order('created_at', { ascending: false });
    if (error) throw error;
    for (const row of data ?? []) {
      const intent = await fetchOnvoPaymentIntent(row.provider_payment_id);
      const status = mapOnvoStatus(intent.status);
      if (status === 'paid') {
        await settleCheckoutPayment(admin, intent);
        throw new ApiError('El pago ya fue recibido. Consulta el estado de tu compra.', 409);
      }
      if (status === 'pending') return { paymentIntentId: intent.id, publishableKey, amount: checkout.total, currency: 'USD' as const };
      const updated = await admin.from('reservation_payments').update({ status }).eq('provider_payment_id', intent.id);
      if (updated.error) throw updated.error;
    }
    const intent = await createOnvoPaymentIntent({ amount: checkout.total, currency: 'USD', description: `LaRutica · ${checkout.publicationTitle}`.slice(0,200),
      metadata: { checkoutId: checkout.id, passengerId: checkout.passengerId, people: checkout.numberOfPeople } });
    const inserted = await admin.from('reservation_payments').insert({ checkout_id: checkout.id, reservation_id: null,
      provider_payment_id: intent.id, amount: checkout.total, currency: 'USD', status: 'pending' });
    if (inserted.error) throw inserted.error;
    return { paymentIntentId: intent.id, publishableKey, amount: checkout.total, currency: 'USD' as const };
  } finally {
    const released = await admin.from('reservation_checkouts').update({ payment_starting_at: null }).eq('id', checkout.id);
    if (released.error) console.error('No se pudo liberar la preparación de pago', checkout.id, released.error);
  }
}

/** Receives a fresh provider response; SQL commits payment and reservation atomically. */
export async function settleCheckoutPayment(admin: SupabaseClient, intent: OnvoPaymentIntent) {
  const { data: payment, error } = await admin.from('reservation_payments').select('id,checkout_id,status,provider_payment_id')
    .eq('provider_payment_id', intent.id).maybeSingle();
  if (error) throw error;
  if (!payment?.checkout_id) return false;
  if (mapOnvoStatus(intent.status) !== 'paid') return true;
  if (!Number.isSafeInteger(intent.amount) || Number(intent.amount) <= 0 || !['USD','CRC'].includes(intent.currency ?? '')) {
    throw new ApiError('No pudimos verificar el importe y la moneda del pago.', 502);
  }
  if (payment.status === 'refunded') return true;
  const result = await admin.rpc('settle_reservation_checkout', { p_checkout_id: payment.checkout_id, p_payment_id: payment.id,
    p_amount: fromMinorUnits(intent.amount!), p_currency: intent.currency });
  if (result.error) checkoutError(result.error);
  if (result.data.refundRequired) await refundPayment(admin, payment.id);
  else if (result.data.reservationId) await notifySettledPayment(admin, payment.id, result.data.reservationId, intent.id);
  return true;
}

export async function confirmCheckoutPayment(admin: SupabaseClient, checkout: Checkout, paymentIntentId: string) {
  const { data, error } = await admin.from('reservation_payments').select('id').eq('checkout_id', checkout.id).eq('provider_payment_id', paymentIntentId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError('Este pago no pertenece a la compra.', 404);
  let intent = await fetchOnvoPaymentIntent(paymentIntentId);
  for (let n=0; n<4 && mapOnvoStatus(intent.status)!=='paid'; n++) {
    await new Promise(resolve => setTimeout(resolve,750)); intent = await fetchOnvoPaymentIntent(paymentIntentId);
  }
  if (mapOnvoStatus(intent.status)!=='paid') throw new ApiError('El pago todavía no está confirmado. Consulta el estado antes de volver a pagar.',409);
  await settleCheckoutPayment(admin,intent);
  return getCheckout(admin,checkout.id,checkout.passengerId);
}

export async function reconcileCheckoutPayment(admin:SupabaseClient,checkout:Checkout) {
  const {data,error}=await admin.from('reservation_payments').select('provider_payment_id,status')
    .eq('checkout_id',checkout.id).in('status',['pending','failed','paid']).order('created_at',{ascending:false});
  if(error)throw error;
  for(const payment of data??[]) {
    const intent=await fetchOnvoPaymentIntent(payment.provider_payment_id);
    if(mapOnvoStatus(intent.status)==='paid')await settleCheckoutPayment(admin,intent);
  }
  return getCheckout(admin,checkout.id,checkout.passengerId);
}
