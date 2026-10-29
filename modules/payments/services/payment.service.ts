import { apiFetch } from "@/lib/api/browser-fetch";

export type StartedPayment = {
  paymentIntentId: string;
  publishableKey: string;
  amount: number;
  currency: 'USD';
};

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { data?: T; message?: string; error?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? body?.error ?? 'No pudimos procesar el pago.');
  return body?.data as T;
}

export async function startReservationPayment(reservationId: string): Promise<StartedPayment> {
  const response = await apiFetch(`/api/reservations/${encodeURIComponent(reservationId)}/payment`, {
    method: 'POST',
    credentials: 'include',
  });
  return parse<StartedPayment>(response);
}

export async function confirmReservationPayment(reservationId: string, paymentIntentId: string): Promise<void> {
  const response = await apiFetch(`/api/reservations/${encodeURIComponent(reservationId)}/payment/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ paymentIntentId }),
  });
  await parse<unknown>(response);
}

export async function startPromotionPayment(publicationId: string): Promise<StartedPayment> {
  const response = await apiFetch(`/api/publications/${encodeURIComponent(publicationId)}/promotion/payment`, {
    method: 'POST',
    credentials: 'include',
  });
  return parse<StartedPayment>(response);
}

export async function confirmPromotionPayment(publicationId: string, paymentIntentId: string): Promise<void> {
  const response = await apiFetch(`/api/publications/${encodeURIComponent(publicationId)}/promotion/payment/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ paymentIntentId }),
  });
  await parse<unknown>(response);
}
