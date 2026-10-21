import assert from 'node:assert/strict';
import { test, before, beforeEach, after } from 'node:test';
import { createDatabase, ids } from './database.mjs';
import { getReservationRecord } from '../../lib/reservations/repository.ts';
import { applyPaymentStatus, refundReservationPayment, startReservationPayment } from '../../lib/payments/repository.ts';
import {
  createSettlement, listAgencyBalances, listPaymentRows, listSettlements, parseCommissionBody, parsePaymentFilters,
  parseSettlementBody, setAgencyCommission,
} from '../../lib/payments/admin.ts';
import * as paymentsRoute from '../../app/api/admin/payments/route.ts';
import * as balancesRoute from '../../app/api/admin/payments/balances/route.ts';
import * as settlementsRoute from '../../app/api/admin/settlements/route.ts';
import * as commissionRoute from '../../app/api/admin/agencies/[id]/commission/route.ts';

let fixture;
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let intents;
globalThis.mailTestActors = Object.fromEntries(Object.entries({ traveler: 'Viajero', owner: 'Agencia', admin: 'Admin' }).map(([key, role]) => [ids[key], role]));

function installOnvo() {
  intents = new Map();
  let next = 1;
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname.replace(/^\/v1/, '');
    const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    if (init.method === 'POST' && path === '/payment-intents') {
      const id = `pi_admin_${next++}`;
      intents.set(id, { id, status: 'succeeded' });
      return json(intents.get(id));
    }
    if (init.method === 'GET') return json(intents.get(path.split('/').pop()));
    if (path === '/refunds') return json({ id: `re_admin_${next++}` });
    return new Response('{}', { status: 500 });
  };
}

async function paidReservation(people = 2) {
  const { data } = await fixture.admin.rpc('create_reservation', {
    p_passenger_id: ids.traveler, p_departure_id: ids.departure, p_number_of_people: people,
  });
  const reservation = await getReservationRecord(fixture.admin, data.id);
  const started = await startReservationPayment(fixture.admin, reservation, ids.traveler);
  await applyPaymentStatus(fixture.admin, started.paymentIntentId, 'paid', { source: 'test' });
  return reservation;
}
const balance = async () => (await listAgencyBalances(fixture.admin)).find(row => row.agencyId === ids.agency);
const call = (route, method, { user = ids.admin, body, query = '' } = {}) => route[method](new Request(`http://localhost/api/admin/x${query}`, {
  method, headers: { 'x-test-user': user, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
}), { params: Promise.resolve({ id: ids.agency }) });

before(async () => {
  fixture = await createDatabase();
  globalThis.mailTestAdmin = fixture.admin;
  process.env.ONVO_TEST_API_KEY = 'onvo_test_secret_key_prueba';
  process.env.ONVO_PUBLISHABLE_KEY = 'onvo_test_publishable_key_prueba';
  delete process.env.LARUTICA_REMOTE_API_ORIGIN;
});
beforeEach(async () => { await fixture.reset(); installOnvo(); });
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; });

test('sin cobros no hay saldos; con un cobro sin comisión todo corresponde a la agencia', async () => {
  assert.deepEqual(await listAgencyBalances(fixture.admin), []);
  await paidReservation();
  const row = await balance();
  assert.deepEqual([row.paymentsCount, row.gross, row.refunded, row.net, row.commission, row.owed, row.balance], [1, 80, 0, 80, 0, 80, 80]);
});

test('la comisión se congela al crear el pago: cambiar la tasa no reescribe cobros anteriores', async () => {
  await setAgencyCommission(fixture.admin, ids.agency, 10);
  await paidReservation();
  await setAgencyCommission(fixture.admin, ids.agency, 50);
  const row = await balance();
  assert.deepEqual([row.commissionRate, row.commission, row.owed, row.balance], [50, 8, 72, 72]);
  const [payment] = await listPaymentRows(fixture.admin, { status: 'paid' });
  assert.equal(payment.commissionRate, 10);
});

test('un reembolso completo deja el saldo en cero', async () => {
  const reservation = await paidReservation();
  await refundReservationPayment(fixture.admin, reservation.id);
  const row = await balance();
  assert.deepEqual([row.gross, row.refunded, row.net, row.owed, row.balance], [80, 80, 0, 0, 0]);
});

test('los pagos a la agencia bajan el saldo y no pueden superarlo; los ajustes corrigen', async () => {
  await setAgencyCommission(fixture.admin, ids.agency, 10);
  await paidReservation(); // corresponde 72
  await createSettlement(fixture.admin, ids.admin, { agencyId: ids.agency, kind: 'PAYOUT', amount: 50, method: 'SINPE', reference: 'T-1' });
  assert.equal((await balance()).balance, 22);
  await assert.rejects(createSettlement(fixture.admin, ids.admin, { agencyId: ids.agency, kind: 'PAYOUT', amount: 30 }), { status: 409 });
  await createSettlement(fixture.admin, ids.admin, { agencyId: ids.agency, kind: 'ADJUSTMENT', amount: -2, notes: 'Cargo por error' });
  const row = await balance();
  assert.deepEqual([row.payouts, row.adjustments, row.balance], [50, -2, 20]);
  const settlements = await listSettlements(fixture.admin, ids.agency);
  assert.equal(settlements.length, 2);
  assert.deepEqual(settlements.map(item => item.kind).sort(), ['ADJUSTMENT', 'PAYOUT']);
  await assert.rejects(createSettlement(fixture.admin, ids.admin, { agencyId: '99999999-9999-4999-8999-999999999999', kind: 'ADJUSTMENT', amount: 1, notes: 'x' }), { status: 404 });
});

test('el detalle filtra por estado y agencia e incluye viajero y experiencia', async () => {
  await paidReservation();
  const rows = await listPaymentRows(fixture.admin, { agencyId: ids.agency, status: 'paid' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].publicationTitle, 'Volcán Arenal');
  assert.equal(rows[0].passengerEmail, 'traveler@example.invalid');
  assert.equal(rows[0].amount, 80);
  assert.equal((await listPaymentRows(fixture.admin, { status: 'refunded' })).length, 0);
});

test('las entradas de liquidaciones se validan', () => {
  const ok = { agencyId: ids.agency, kind: 'PAYOUT', amount: 10 };
  assert.equal(parseSettlementBody(ok).amount, 10);
  assert.throws(() => parseSettlementBody({ ...ok, amount: -5 }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, amount: 0 }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, amount: '10' }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, agencyId: 'x' }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, kind: 'OTRO' }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, occurredOn: '2026-02-30' }), { status: 400 });
  assert.throws(() => parseSettlementBody({ ...ok, kind: 'ADJUSTMENT', amount: -3 }), { status: 400 });
  assert.equal(parseSettlementBody({ ...ok, kind: 'ADJUSTMENT', amount: -3, notes: 'Motivo' }).amount, -3);
  assert.equal(parseCommissionBody({ commissionRate: 12.5 }), 12.5);
  assert.throws(() => parseCommissionBody({ commissionRate: 101 }), { status: 400 });
  assert.throws(() => parseCommissionBody({ commissionRate: '5' }), { status: 400 });
  assert.throws(() => parsePaymentFilters(new URLSearchParams('status=hack')), { status: 400 });
  assert.throws(() => parsePaymentFilters(new URLSearchParams('agencyId=1')), { status: 400 });
});

test('solo un administrador accede a pagos, saldos, liquidaciones y comisión', async () => {
  const requests = [
    () => call(paymentsRoute, 'GET', { user: ids.owner }),
    () => call(balancesRoute, 'GET', { user: ids.owner }),
    () => call(settlementsRoute, 'GET', { user: ids.owner }),
    () => call(settlementsRoute, 'POST', { user: ids.owner, body: { agencyId: ids.agency, kind: 'ADJUSTMENT', amount: 1, notes: 'x' } }),
    () => call(commissionRoute, 'PATCH', { user: ids.owner, body: { commissionRate: 5 } }),
  ];
  for (const request of requests) assert.equal((await request()).status, 403);
  assert.equal((await call(paymentsRoute, 'GET', { user: ids.traveler })).status, 403);
  assert.equal((await call(paymentsRoute, 'GET', { user: 'desconocido' })).status, 401);
  assert.equal((await call(balancesRoute, 'GET')).status, 200);
  assert.equal((await call(paymentsRoute, 'GET', { query: '?status=paid' })).status, 200);
  assert.equal((await call(paymentsRoute, 'GET', { query: '?status=otro' })).status, 400);
  const created = await call(settlementsRoute, 'POST', { body: { agencyId: ids.agency, kind: 'ADJUSTMENT', amount: 5, notes: 'Bonificación' } });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).data.amount, 5);
  assert.equal((await call(commissionRoute, 'PATCH', { body: { commissionRate: 7.5 } })).status, 200);
  assert.equal((await call(commissionRoute, 'PATCH', { body: { commissionRate: 200 } })).status, 400);
  assert.equal((await fixture.db.query('select commission_rate from agencies')).rows[0].commission_rate, '7.50');
});
