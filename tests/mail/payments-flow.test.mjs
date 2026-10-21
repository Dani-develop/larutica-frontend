import assert from 'node:assert/strict';
import { test, before, beforeEach, after } from 'node:test';
import { createDatabase, ids } from './database.mjs';
import { getReservationRecord } from '../../lib/reservations/repository.ts';
import {
  applyPaymentStatus, confirmReservationPayment, handleOnvoWebhook, refundReservationPaymentSafely, startReservationPayment,
} from '../../lib/payments/repository.ts';

let fixture;
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let onvo;

function installOnvo() {
  onvo = { intents: new Map(), calls: [], next: 1 };
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname.replace(/^\/v1/, '');
    const body = init.body ? JSON.parse(init.body) : null;
    onvo.calls.push({ method: init.method, path, body, auth: init.headers?.Authorization });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    if (init.method === 'POST' && path === '/payment-intents') {
      const id = `pi_test_${onvo.next++}`;
      onvo.intents.set(id, { id, status: 'requires_payment_method', amount: body.amount });
      return json(onvo.intents.get(id));
    }
    if (init.method === 'GET' && path.startsWith('/payment-intents/')) {
      const intent = onvo.intents.get(path.split('/').pop());
      return intent ? json(intent) : json({ message: 'not found' }, 404);
    }
    if (init.method === 'POST' && path === '/refunds') return json({ id: `re_test_${onvo.next++}`, status: 'succeeded' });
    return json({ message: 'unexpected' }, 500);
  };
}

async function createReservation(passengerId = ids.traveler, people = 2) {
  const { data, error } = await fixture.admin.rpc('create_reservation', {
    p_passenger_id: passengerId, p_departure_id: ids.departure, p_number_of_people: people,
  });
  assert.equal(error, null);
  return getReservationRecord(fixture.admin, data.id);
}
const paymentRows = async () => (await fixture.db.query('select * from reservation_payments order by created_at')).rows;

before(async () => {
  fixture = await createDatabase();
  process.env.ONVO_TEST_API_KEY = 'onvo_test_secret_key_prueba';
  process.env.ONVO_PUBLISHABLE_KEY = 'onvo_test_publishable_key_prueba';
});
beforeEach(async () => { await fixture.reset(); installOnvo(); });
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; });

test('el monto del cobro sale de la reserva y un intento abierto se reutiliza', async () => {
  const reservation = await createReservation();
  assert.equal(reservation.paymentStatus, 'UNPAID');
  const first = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  assert.equal(first.amount, 80);
  assert.equal(first.publishableKey, 'onvo_test_publishable_key_prueba');
  const created = onvo.calls.find(call => call.path === '/payment-intents' && call.method === 'POST');
  assert.equal(created.body.amount, 8000);
  assert.equal(created.body.currency, 'USD');
  assert.equal(created.auth, 'Bearer onvo_test_secret_key_prueba');
  const second = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  assert.equal(second.paymentIntentId, first.paymentIntentId);
  assert.equal(onvo.calls.filter(call => call.path === '/payment-intents' && call.method === 'POST').length, 1);
  assert.equal((await paymentRows()).length, 1);
});

test('otro usuario no puede iniciar ni confirmar el pago de una reserva ajena', async () => {
  const reservation = await createReservation();
  await assert.rejects(startReservationPayment(fixture.admin, reservation, ids.second), { status: 403 });
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  await assert.rejects(confirmReservationPayment(fixture.admin, reservation, ids.second, started.paymentIntentId), { status: 403 });
});

test('confirmar consulta a Onvo: sin cobro no marca pagado y con cobro sí', async () => {
  const reservation = await createReservation();
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  await assert.rejects(confirmReservationPayment(fixture.admin, reservation, ids.traveler, 'pi_inventado'), { status: 404 });
  assert.equal((await getReservationRecord(fixture.admin, reservation.id)).paymentStatus, 'UNPAID');

  onvo.intents.get(started.paymentIntentId).status = 'succeeded';
  await confirmReservationPayment(fixture.admin, reservation, ids.traveler, started.paymentIntentId);
  const paid = await getReservationRecord(fixture.admin, reservation.id);
  assert.equal(paid.paymentStatus, 'PAID');
  assert.equal((await paymentRows())[0].paid_at !== null, true);
  await assert.rejects(startReservationPayment(fixture.admin, paid, ids.traveler), { status: 409 });
});

test('cancelar una reserva pagada la reembolsa completa una sola vez', async () => {
  const reservation = await createReservation();
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  onvo.intents.get(started.paymentIntentId).status = 'succeeded';
  await confirmReservationPayment(fixture.admin, reservation, ids.traveler, started.paymentIntentId);

  await refundReservationPaymentSafely(fixture.admin, reservation.id);
  await refundReservationPaymentSafely(fixture.admin, reservation.id);
  const refunds = onvo.calls.filter(call => call.path === '/refunds');
  assert.equal(refunds.length, 1);
  assert.deepEqual(refunds[0].body, { paymentIntentId: started.paymentIntentId, amount: 8000 });
  const [row] = await paymentRows();
  assert.equal(row.status, 'refunded');
  assert.equal(Number(row.refunded_amount), 80);
  assert.equal((await getReservationRecord(fixture.admin, reservation.id)).paymentStatus, 'REFUNDED');
});

test('si Onvo falla el reembolso la cancelación no se rompe y el cobro sigue pagado', async () => {
  const reservation = await createReservation();
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  onvo.intents.get(started.paymentIntentId).status = 'succeeded';
  await confirmReservationPayment(fixture.admin, reservation, ids.traveler, started.paymentIntentId);
  const fetchOk = globalThis.fetch;
  globalThis.fetch = async (url, init) => new URL(url).pathname.endsWith('/refunds')
    ? new Response('{"message":"boom"}', { status: 500 }) : fetchOk(url, init);
  const log = console.error; console.error = () => {};
  try { await refundReservationPaymentSafely(fixture.admin, reservation.id); } finally { console.error = log; globalThis.fetch = fetchOk; }
  assert.equal((await paymentRows())[0].status, 'paid');
});

test('el webhook verifica el cobro en Onvo antes de registrarlo', async () => {
  const reservation = await createReservation();
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  const event = { type: 'payment-intent.succeeded', data: { id: started.paymentIntentId, status: 'succeeded' } };

  await handleOnvoWebhook(fixture.admin, event); // Onvo todavía dice requires_payment_method
  assert.equal((await paymentRows())[0].status, 'pending');

  onvo.intents.get(started.paymentIntentId).status = 'succeeded';
  await handleOnvoWebhook(fixture.admin, event);
  await handleOnvoWebhook(fixture.admin, event); // idempotente
  assert.equal((await paymentRows())[0].status, 'paid');
  assert.equal(onvo.calls.filter(call => call.path === '/refunds').length, 0);
});

test('un cobro que llega después de cancelar la reserva se devuelve de inmediato', async () => {
  const reservation = await createReservation();
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  await fixture.db.query("update reservations set status = 'CANCELLED' where id = $1", [reservation.id]);
  onvo.intents.get(started.paymentIntentId).status = 'succeeded';
  await applyPaymentStatus(fixture.admin, started.paymentIntentId, 'paid', { source: 'test' });
  assert.equal(onvo.calls.filter(call => call.path === '/refunds').length, 1);
  assert.equal((await paymentRows())[0].status, 'refunded');
});

test('una reserva cancelada ya no admite pago', async () => {
  const reservation = await createReservation();
  await fixture.db.query("update reservations set status = 'CANCELLED' where id = $1", [reservation.id]);
  const cancelled = await getReservationRecord(fixture.admin, reservation.id);
  await assert.rejects(startReservationPayment(fixture.admin, cancelled, ids.traveler), { status: 400 });
  assert.equal(onvo.calls.length, 0);
});
