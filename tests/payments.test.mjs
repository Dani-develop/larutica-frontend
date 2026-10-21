import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { isValidWebhookSecret, mapOnvoEvent, mapOnvoStatus, toMinorUnits } from '../lib/payments/onvo.ts';
import { canPayReservation, derivePaymentStatus } from '../lib/payments/status.ts';
import { POST as webhook } from '../app/api/payments/onvopay/webhook/route.ts';

const future = '2099-01-01T12:00:00.000Z';
const reservation = { status: 'CONFIRMED', total: 50, paymentStatus: 'UNPAID', departureStatus: 'ACTIVE', departureStartAt: future };

test('el estado de pago resume los intentos de la reserva', () => {
  assert.equal(derivePaymentStatus(undefined), 'UNPAID');
  assert.equal(derivePaymentStatus([{ status: 'pending' }, { status: 'failed' }]), 'UNPAID');
  assert.equal(derivePaymentStatus([{ status: 'failed' }, { status: 'paid' }]), 'PAID');
  assert.equal(derivePaymentStatus([{ status: 'refunded' }]), 'REFUNDED');
});

test('solo se cobra una reserva viva, sin pagar, con total y salida futura', () => {
  assert.equal(canPayReservation(reservation), true);
  assert.equal(canPayReservation({ ...reservation, status: 'CANCELLED' }), false);
  assert.equal(canPayReservation({ ...reservation, paymentStatus: 'PAID' }), false);
  assert.equal(canPayReservation({ ...reservation, total: 0 }), false);
  assert.equal(canPayReservation({ ...reservation, departureStatus: 'CANCELLED' }), false);
  assert.equal(canPayReservation({ ...reservation, departureStartAt: '2020-01-01T00:00:00.000Z' }), false);
});

test('los estados y eventos de OnvoPAY se traducen al modelo propio', () => {
  assert.equal(mapOnvoStatus('succeeded'), 'paid');
  assert.equal(mapOnvoStatus('requires_payment_method'), 'pending');
  assert.equal(mapOnvoStatus('canceled'), 'canceled');
  assert.equal(mapOnvoEvent('payment-intent.succeeded'), 'paid');
  assert.equal(mapOnvoEvent('payment-intent.failed'), 'failed');
  assert.equal(mapOnvoEvent('payment-intent.deferred'), 'pending');
  assert.equal(toMinorUnits(12.34), 1234);
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
});

test('el webhook exige el secreto compartido', async () => {
  const previous = process.env.ONVO_WEBHOOK_SECRET;
  process.env.ONVO_WEBHOOK_SECRET = 'webhook_secret_de_prueba';
  try {
    assert.equal(isValidWebhookSecret('webhook_secret_de_prueba'), true);
    assert.equal(isValidWebhookSecret('otro'), false);
    assert.equal(isValidWebhookSecret(null), false);
    const call = (headers) => webhook(new Request('http://localhost/api/payments/onvopay/webhook', {
      method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}',
    }));
    assert.equal((await call({})).status, 401);
    assert.equal((await call({ 'x-webhook-secret': 'incorrecto' })).status, 401);
  } finally {
    if (previous === undefined) delete process.env.ONVO_WEBHOOK_SECRET; else process.env.ONVO_WEBHOOK_SECRET = previous;
  }
  delete process.env.ONVO_WEBHOOK_SECRET;
  assert.equal(isValidWebhookSecret(''), false);
});

test('la migración de pagos no tiene acceso público y evita cobrar dos veces', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202610210001_reservation_payments.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table public\.reservation_payments/i);
  assert.match(sql, /references public\.reservations\(id\)\s+on delete restrict/i);
  assert.match(sql, /provider_payment_id text not null unique/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.reservation_payments from anon, authenticated/i);
  assert.match(sql, /create unique index reservation_payments_one_paid_idx[\s\S]*where status = 'paid'/i);
});

test('las claves de OnvoPAY nunca se exponen con NEXT_PUBLIC ni en rutas del cliente', async () => {
  for (const file of ['../lib/payments/onvo.ts', '../lib/payments/repository.ts', '../modules/payments/components/ReservationPayment.tsx']) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /NEXT_PUBLIC_ONVO_(API|SECRET|WEBHOOK)/);
    assert.doesNotMatch(source, /onvo_(test|live)_secret/);
  }
  const client = await readFile(new URL('../modules/payments/components/ReservationPayment.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(client, /ONVO_TEST_API_KEY|ONVO_WEBHOOK_SECRET/);
});
