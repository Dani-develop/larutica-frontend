import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import {
  createOnvoPaymentIntent,
  createOnvoRefund,
  extractNumber,
  extractString,
  fetchOnvoPaymentIntent,
  fromMinorUnits,
  getOnvoPublishableKey,
  mapOnvoEvent,
  mapOnvoStatus,
  type PaymentStatus,
} from "@/lib/payments/onvo";
import { applyPromotionPaymentStatus, applyPromotionRefundEvent } from "@/lib/payments/promotion";
import { canPayReservation, derivePaymentStatus } from "@/lib/payments/status";
import { settlementTarget } from "@/lib/promotions/window";
import { getReservationRecord, type ReservationRecord } from "@/lib/reservations/repository";
import { notifyReservationCreated } from "@/lib/mail/notify";
import { settleCheckoutPayment } from './checkout';

const CURRENCY = "USD" as const;
const PAYMENT_COLUMNS = "id, reservation_id, checkout_id, provider_payment_id, amount, currency, status, refunded_amount, refund_status, provider_refund_id, notification_sent_at";

type PaymentRow = {
  id: string;
  reservation_id: string | null;
  checkout_id?: string | null;
  provider_payment_id: string;
  amount: number | string;
  currency: string;
  status: PaymentStatus;
  refunded_amount: number | string;
  refund_status?: string | null;
  provider_refund_id?: string | null;
  notification_sent_at?: string | null;
};

export type StartedPayment = {
  paymentIntentId: string;
  publishableKey: string;
  amount: number;
  currency: typeof CURRENCY;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function money(value: number | string): number {
  return Math.round(Number(value) * 100) / 100;
}

async function listPayments(admin: SupabaseClient, reservationId: string): Promise<PaymentRow[]> {
  const { data, error } = await admin.from("reservation_payments").select(PAYMENT_COLUMNS)
    .eq("reservation_id", reservationId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentRow[];
}

/** Crea (o reutiliza) la intención de pago de una reserva del pasajero. */
export async function startReservationPayment(
  admin: SupabaseClient,
  reservation: ReservationRecord,
  userId: string,
): Promise<StartedPayment> {
  if (reservation.passengerId !== userId) {
    throw new ApiError("Solo quien reservó puede pagar esta reserva.", 403);
  }
  if (reservation.paymentStatus === "PAID") {
    throw new ApiError("Esta reserva ya está pagada.", 409);
  }
  if (!canPayReservation(reservation)) {
    throw new ApiError("Esta reserva ya no admite pago.", 400);
  }

  const amount = money(reservation.total);
  const payments = await listPayments(admin, reservation.id);

  // Un intento abierto con el mismo monto se reutiliza; no se acumulan intenciones huérfanas.
  for (const payment of payments.filter((row) => row.status === "pending" && money(row.amount) === amount)) {
    const intent = await fetchOnvoPaymentIntent(payment.provider_payment_id);
    const status = mapOnvoStatus(intent.status);
    if (status === "pending") {
      return { paymentIntentId: intent.id, publishableKey: getOnvoPublishableKey(), amount, currency: CURRENCY };
    }
    if (status === "paid") {
      await applyPaymentStatus(admin, intent.id, "paid", { source: "start", paymentIntent: intent });
      throw new ApiError("Esta reserva ya está pagada.", 409);
    }
    await applyPaymentStatus(admin, intent.id, status, { source: "start", paymentIntent: intent });
  }

  const intent = await createOnvoPaymentIntent({
    amount,
    currency: CURRENCY,
    description: `LaRutica · ${reservation.publicationTitle}`.slice(0, 200),
    metadata: { reservationId: reservation.id, passengerId: userId, people: reservation.numberOfPeople },
  });
  const { error } = await admin.from("reservation_payments").insert({
    reservation_id: reservation.id,
    provider_payment_id: intent.id,
    amount,
    currency: CURRENCY,
    status: mapOnvoStatus(intent.status),
  });
  if (error) throw error;
  return { paymentIntentId: intent.id, publishableKey: getOnvoPublishableKey(), amount, currency: CURRENCY };
}

/**
 * Cambia el estado de un pago. Un pago cobrado no retrocede, y si la reserva se canceló
 * mientras se pagaba, el dinero se devuelve en el mismo momento.
 */
export async function applyPaymentStatus(
  admin: SupabaseClient,
  providerPaymentId: string,
  next: PaymentStatus,
  event: Record<string, unknown>,
): Promise<PaymentRow | null> {
  const { data, error } = await admin.from("reservation_payments").select(PAYMENT_COLUMNS)
    .eq("provider_payment_id", providerPaymentId).maybeSingle();
  if (error) throw error;
  const payment = data as PaymentRow | null;
  if (!payment) return null;
  if (next === 'paid' && payment.checkout_id) {
    const intent = await fetchOnvoPaymentIntent(providerPaymentId);
    await settleCheckoutPayment(admin, intent);
    return payment;
  }
  if (payment.status === "refunded" || (payment.status === next && next !== 'paid')) return payment;
  if (payment.status === 'paid' && next !== 'paid') return payment;
  if(next==='paid') {
    const intent=await fetchOnvoPaymentIntent(providerPaymentId);
    if(mapOnvoStatus(intent.status)!=='paid')return payment;
    if(!Number.isSafeInteger(intent.amount)||Number(intent.amount)<=0||!['USD','CRC'].includes(intent.currency??''))throw new ApiError('No pudimos verificar el importe del pago.',502);
    const record=payment.reservation_id?await getReservationRecord(admin,payment.reservation_id):null;
    if(fromMinorUnits(intent.amount!)!==money(payment.amount)||intent.currency!==payment.currency||!record||record.total!==money(payment.amount)) {
      const invalid=await admin.from('reservation_payments').update({status:'failed',amount:fromMinorUnits(intent.amount!),currency:intent.currency,last_event:event}).eq('id',payment.id);
      if(invalid.error)throw invalid.error;
      await refundPayment(admin,payment.id);return payment;
    }
  }

  const patch: Record<string, unknown> = { status: next, last_event: event };
  if (next === "paid") patch.paid_at = new Date().toISOString();
  const { data: updated, error: updateError } = await admin.from("reservation_payments").update(patch)
    .eq("id", payment.id).eq("status", payment.status).select(PAYMENT_COLUMNS).maybeSingle();
  if (updateError) {
    // 23505: la reserva ya tenía otro cobro; este pago duplicado se devuelve completo.
    if (updateError.code === "23505" && next === "paid") {
      const duplicate=await admin.from('reservation_payments').update({status:'failed',last_event:event}).eq('id',payment.id);
      if(duplicate.error)throw duplicate.error;
      await refundPayment(admin,payment.id);
      return payment;
    }
    throw updateError;
  }
  if (!updated && next !== 'paid') return payment;

  if (next === "paid") {
    const { data: reservation, error: reservationError } = await admin.from("reservations")
      .select("status").eq("id", payment.reservation_id).maybeSingle();
    if (reservationError) throw reservationError;
    const record = payment.reservation_id ? await getReservationRecord(admin, payment.reservation_id) : null;
    if (record && (record.status === 'CANCELLED' || (payment.status !== 'paid' && (record.departureStatus !== 'ACTIVE' || Date.parse(record.departureStartAt) <= Date.now())))) {
      await refundPayment(admin, payment.id).catch((cause) => {
        console.error("No se pudo reembolsar un pago de una reserva cancelada", payment.reservation_id, cause);
      });
    } else if (reservation && payment.reservation_id) {
      const { error: confirmError } = await admin.from("reservations").update({ status: "CONFIRMED" })
        .eq("id", payment.reservation_id).eq("status", "PENDING");
      if (confirmError) throw confirmError;
      const confirmed = await getReservationRecord(admin, payment.reservation_id);
      if (confirmed && confirmed.status !== "CANCELLED") {
        await notifySettledPayment(admin, payment.id, confirmed.id, providerPaymentId);
      }
    }
  }
  return (updated ?? payment) as PaymentRow;
}

/** Confirma desde el navegador: consulta a Onvo, que es la fuente de verdad, nunca el cliente. */
export async function confirmReservationPayment(
  admin: SupabaseClient,
  reservation: ReservationRecord,
  userId: string,
  paymentIntentId: string,
): Promise<{ paymentStatus: ReturnType<typeof derivePaymentStatus> }> {
  if (reservation.passengerId !== userId) {
    throw new ApiError("Solo quien reservó puede confirmar este pago.", 403);
  }
  const payments = await listPayments(admin, reservation.id);
  if (!payments.some((payment) => payment.provider_payment_id === paymentIntentId)) {
    throw new ApiError("Este pago no pertenece a la reserva.", 404);
  }

  let intent = await fetchOnvoPaymentIntent(paymentIntentId);
  // Onvo tarda un instante en marcar el cobro después de que el SDK termina.
  for (let attempt = 0; attempt < 4 && mapOnvoStatus(intent.status) !== "paid"; attempt++) {
    await sleep(750);
    intent = await fetchOnvoPaymentIntent(paymentIntentId);
  }
  const status = mapOnvoStatus(intent.status);
  if (status !== "paid") {
    throw new ApiError("El pago todavía no está confirmado. Si se te cobró, se reflejará en unos minutos.", 409);
  }
  await applyPaymentStatus(admin, paymentIntentId, "paid", { source: "client-confirm", paymentIntent: intent });
  const current = await getReservationRecord(admin, reservation.id);
  if (!current || current.status === 'CANCELLED' || current.paymentStatus !== 'PAID') {
    throw new ApiError('La reserva no se confirmó. Consulta el estado del reembolso.',409);
  }
  return { paymentStatus: current.paymentStatus };
}

/** Devuelve el monto cobrado (completo) de una reserva. No hace nada si no hay cobro pendiente de devolver. */
export async function refundReservationPayment(admin: SupabaseClient, reservationId: string): Promise<boolean> {
  const { data, error } = await admin.from("reservation_payments").select(PAYMENT_COLUMNS)
    .eq("reservation_id", reservationId).eq("status", "paid").maybeSingle();
  if (error) throw error;
  const payment = data as PaymentRow | null;
  if (!payment) return false;

  await refundPayment(admin, payment.id);
  return true;
}

export async function notifySettledPayment(admin: SupabaseClient, paymentId: string, reservationId: string, providerPaymentId: string) {
  const reservation = await getReservationRecord(admin, reservationId);
  if (!reservation || !['CONFIRMED','PAST'].includes(reservation.status)) return;
  const claimed = await admin.from('reservation_payments').update({ notification_sent_at: new Date().toISOString() })
    .eq('id',paymentId).is('notification_sent_at',null).select('id').maybeSingle();
  if (claimed.error) throw claimed.error;
  if (claimed.data) await notifyReservationCreated({ ...reservation, paymentReference:providerPaymentId,paidAt:new Date().toISOString() },true);
}

/** Claim once before requesting an external refund; its final status comes from Onvo. */
export async function refundPayment(admin: SupabaseClient, paymentId: string) {
  const { data, error } = await admin.from('reservation_payments').select(PAYMENT_COLUMNS).eq('id',paymentId).maybeSingle();
  if (error) throw error;
  const payment = data as PaymentRow | null;
  if (!payment || payment.status === 'refunded' || payment.refund_status) return;
  const remaining = money(money(payment.amount)-money(payment.refunded_amount));
  if (remaining<=0) return;
  const claim = await admin.from('reservation_payments').update({refund_status:'pending'}).eq('id',paymentId).is('refund_status',null).select('id').maybeSingle();
  if (claim.error) throw claim.error;
  if (!claim.data) return;
  try {
    const refund = await createOnvoRefund(payment.provider_payment_id,remaining);
    const succeeded = refund.status === 'succeeded';
    const saved = await admin.from('reservation_payments').update({provider_refund_id:refund.id??null,
      ...(succeeded ? {status:'refunded',refund_status:'succeeded',refunded_amount:money(payment.amount),refunded_at:new Date().toISOString()}: {})}).eq('id',paymentId);
    if (saved.error) throw saved.error;
  } catch (error) {
    await admin.from('reservation_payments').update({refund_status:'failed'}).eq('id',paymentId);
    throw error;
  }
}

/** Reembolsa sin interrumpir la cancelación: la reserva ya quedó cancelada y el fallo se registra. */
export async function refundReservationPaymentSafely(admin: SupabaseClient, reservationId: string): Promise<void> {
  try {
    await refundReservationPayment(admin, reservationId);
  } catch (cause) {
    console.error("No se pudo reembolsar el pago de la reserva cancelada", reservationId, cause);
  }
}

export async function handleOnvoWebhook(admin: SupabaseClient, payload: Record<string, unknown>): Promise<void> {
  const eventType = extractString(payload, ["type"]);

  if (eventType === "refund.succeeded" || eventType === "refund.failed") {
    const paymentIntentId = extractString(payload, ["data.paymentIntentId", "data.object.paymentIntentId", "paymentIntentId"]);
    if (!paymentIntentId) return;
    const { data, error } = await admin.from("reservation_payments").select(PAYMENT_COLUMNS)
      .eq("provider_payment_id", paymentIntentId).maybeSingle();
    if (error) throw error;
    const payment = data as PaymentRow | null;
    if (!payment) {
      await applyPromotionRefundEvent(admin, paymentIntentId, payload);
      return;
    }
    if (eventType === 'refund.failed') {
      const failed = await admin.from('reservation_payments').update({refund_status:'failed',last_event:payload}).eq('id',payment.id).neq('status','refunded');
      if (failed.error) throw failed.error;
      return;
    }
    const minor = extractNumber(payload, ["data.amount", "data.object.amount", "amount"]);
    const refunded = Math.max(money(payment.refunded_amount), minor === undefined ? 0 : fromMinorUnits(minor));
    const saved = await admin.from("reservation_payments").update({
      refunded_amount: refunded,
      refunded_at: new Date().toISOString(),
      provider_refund_id: extractString(payload, ["data.id", "data.object.id", "refundId"]) ?? null,
      status: refunded >= money(payment.amount) ? "refunded" : payment.status,
      refund_status: refunded >= money(payment.amount) ? 'succeeded' : 'pending',
      last_event: payload,
    }).eq("id", payment.id);
    if (saved.error) throw saved.error;
    return;
  }

  const paymentIntentId = extractString(payload, [
    "data.id",
    "data.object.id",
    "data.paymentIntentId",
    "data.object.paymentIntentId",
    "paymentIntentId",
    "id",
  ]);
  if (!paymentIntentId) return;
  const status = extractString(payload, ["data.status", "data.object.status", "data.paymentStatus", "status"]);
  const next = mapOnvoEvent(eventType, status);
  if (next === "paid") {
    // Un cobro solo se registra si Onvo lo confirma al consultarlo directamente.
    const intent = await fetchOnvoPaymentIntent(paymentIntentId);
    if (mapOnvoStatus(intent.status) !== "paid") return;
  }
  const reservationPayment = await applyPaymentStatus(admin, paymentIntentId, next, payload);
  if (settlementTarget(reservationPayment) === "promotion") {
    await applyPromotionPaymentStatus(admin, paymentIntentId, next, payload);
  }
}
