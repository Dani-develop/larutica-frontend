import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import * as admin from '../../app/api/admin/payments/route.ts';
import * as agencies from '../../app/api/agencies/me/route.ts';
import * as checkout from '../../app/api/checkouts/route.ts';
import * as checkoutDetail from '../../app/api/checkouts/[id]/route.ts';
import * as payment from '../../app/api/checkouts/[id]/payment/route.ts';
import * as confirmation from '../../app/api/checkouts/[id]/payment/confirm/route.ts';
import * as webhook from '../../app/api/payments/onvopay/webhook/route.ts';
import * as profile from '../../app/api/profile/route.ts';
import * as reservation from '../../app/api/reservations/[id]/route.ts';
import * as traveler from '../../app/api/traveler/saved/route.ts';
import { createOpaqueToken, hashOpaqueToken } from '../../lib/supabase/session.ts';
import { createDatabase, ids } from '../mail/database.mjs';

const webhookKey = 'local-only-webhook-fixture';
const tokens = new Map();
const authUpdates = [];
const noExternalFetch = globalThis.fetch;
let db;
let reservationId;
let providerRequests = 0;

before(async () => {
  process.env.LARUTICA_REMOTE_API_ORIGIN = '';
  process.env.ONVO_WEBHOOK_SECRET = webhookKey;
  process.env.ONVO_PUBLISHABLE_KEY = 'pk_local_fixture';
  process.env.ONVO_TEST_API_KEY = 'sk_local_fixture';
  globalThis.fetch = async () => {
    providerRequests++;
    throw new Error('No se permite red en las pruebas de autorización');
  };
  const fixture = await createDatabase();
  db = fixture.db;
  await fixture.reset();
  await db.exec("alter table profiles add column role text, add column status text default 'Activo', add column business_name text; create schema auth; create table auth.users (id uuid primary key); insert into auth.users select id from profiles");
  for (const file of [
    '202608270002_server_sessions.sql',
    '202609240002_password_reset_sessions.sql',
    '202610060001_traveler_saved_ratings.sql',
  ]) await db.exec(await readFile(new URL('../../supabase/migrations/' + file, import.meta.url), 'utf8'));

  for (const [actor, role] of Object.entries({ traveler: 'Viajero', second: 'Viajero', owner: 'Agencia', outsider: 'Agencia', admin: 'Admin' })) {
    await db.query('update profiles set role=$1 where id=$2', [role, ids[actor]]);
    const token = createOpaqueToken();
    tokens.set(actor, token);
    await db.query("insert into app_sessions(session_hash,user_id,expires_at,idle_expires_at) values($1,$2,now()+interval '8 hours',now()+interval '30 minutes')",
      [await hashOpaqueToken(token), ids[actor]]);
  }
  const expired = createOpaqueToken();
  tokens.set('expired', expired);
  await db.query("insert into app_sessions(session_hash,user_id,created_at,last_seen_at,expires_at,idle_expires_at) values($1,$2,now()-interval '1 hour',now()-interval '1 hour',now()+interval '7 hours',now()-interval '30 minutes')",
    [await hashOpaqueToken(expired), ids.admin]);

  fixture.admin.auth = { admin: { async updateUserById(id, payload) { authUpdates.push({ id, payload }); return { error: null }; } } };
  globalThis.mailTestAdmin = fixture.admin;

  const seed = await db.query("insert into reservations(passenger_id,departure_id,number_of_people,unit_price,status) values($1,$2,1,40,'CONFIRMED') returning id", [ids.traveler, ids.departure]);
  reservationId = seed.rows[0].id;
  await db.query("insert into reservation_payments(reservation_id,provider_payment_id,amount,status) values($1,'pi_local_paid',40,'paid')", [reservationId]);
  await db.query('insert into saved_publications(user_id,publication_id) values($1,$2)', [ids.traveler, ids.publication]);
});

after(async () => {
  globalThis.fetch = noExternalFetch;
  if (db) await db.close();
});

function call(handler, method, path, { actor, body, id, headers } = {}) {
  const url = new URL(path, 'http://localhost');
  const request = new Request(url, {
    method,
    headers: {
      origin: url.origin,
      ...(actor ? { cookie: 'larutica_session=' + tokens.get(actor) } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handler(request, { params: Promise.resolve({ id }) });
}

async function denied(response, status) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ['error']);
  assert.equal(typeof body.error, 'string');
  assert.doesNotMatch(body.error, /example\.invalid|pi_local_paid/);
}

async function allowed(response, status = 200) {
  assert.equal(response.status, status);
  return (await response.json()).data;
}

test('F01-A3: sin cookie o con sesión vencida, la API no devuelve datos', async () => {
  for (const [handler, method, path, options] of [
    [admin.GET, 'GET', '/api/admin/payments'],
    [agencies.GET, 'GET', '/api/agencies/me'],
    [reservation.GET, 'GET', '/api/reservations/' + reservationId, { id: reservationId }],
    [traveler.GET, 'GET', '/api/traveler/saved?ids=1'],
    [profile.PATCH, 'PATCH', '/api/profile', { body: { name: 'Sin permiso' } }],
  ]) await denied(await call(handler, method, path, options), 401);

  await denied(await call(admin.GET, 'GET', '/api/admin/payments', { actor: 'expired' }), 401);
  const expired = await db.query('select session_hash from app_sessions where session_hash=$1', [await hashOpaqueToken(tokens.get('expired'))]);
  assert.equal(expired.rows.length, 0);
  assert.equal(authUpdates.length, 0);
});

test('F01: roles Admin/Viajero y propiedad en agencias y guardados', async () => {
  const payments = '/api/admin/payments';
  for (const actor of ['owner', 'traveler']) await denied(await call(admin.GET, 'GET', payments, { actor }), 403);
  const rows = await allowed(await call(admin.GET, 'GET', payments, { actor: 'admin' }));
  assert.equal(rows.length, 1);

  const agency = '/api/agencies/me';
  await denied(await call(agencies.PATCH, 'PATCH', agency, { actor: 'traveler', body: { agencyName: 'Otra agencia' } }), 403);
  assert.equal((await allowed(await call(agencies.GET, 'GET', agency, { actor: 'owner' }))).agency.id, ids.agency);
  assert.equal(await allowed(await call(agencies.GET, 'GET', agency, { actor: 'outsider' })), null);

  const saved = '/api/traveler/saved?ids=1';
  await denied(await call(traveler.GET, 'GET', saved, { actor: 'owner' }), 403);
  await denied(await call(traveler.POST, 'POST', '/api/traveler/saved', { actor: 'owner', body: { publicationId: ids.publication } }), 403);
  assert.deepEqual(await allowed(await call(traveler.GET, 'GET', saved, { actor: 'traveler' })), [ids.publication]);
  assert.deepEqual(await allowed(await call(traveler.GET, 'GET', saved, { actor: 'second' })), []);
  assert.deepEqual((await db.query('select user_id from saved_publications')).rows, [{ user_id: ids.traveler }]);
  assert.equal((await db.query('select status from agencies')).rows[0].status, 'APPROVED');
});

test('F03-A1/A2/A3: una reserva ajena no se revela ni se puede cancelar', async () => {
  const path = '/api/reservations/' + reservationId;
  for (const [actor, status] of [[undefined, 401], ['second', 404], ['outsider', 404]]) {
    await denied(await call(reservation.GET, 'GET', path, { actor, id: reservationId }), status);
    await denied(await call(reservation.PATCH, 'PATCH', path, { actor, id: reservationId, body: { status: 'CANCELLED' } }), status);
  }
  for (const actor of ['traveler', 'owner', 'admin']) {
    const visible = await allowed(await call(reservation.GET, 'GET', path, { actor, id: reservationId }));
    assert.equal(visible.id, reservationId);
  }
  assert.deepEqual((await db.query('select status, number_of_people from reservations')).rows, [{ status: 'CONFIRMED', number_of_people: 1 }]);
  assert.deepEqual((await db.query('select status, refund_status from reservation_payments')).rows, [{ status: 'paid', refund_status: null }]);
  assert.equal(providerRequests, 0);
});

test('F02-A1/A3: el checkout pertenece al pasajero y sus pagos no se pueden iniciar ni confirmar por terceros', async () => {
  const path = '/api/checkouts';
  const body = { departureId: ids.departure, numberOfPeople: 2 };
  await denied(await call(checkout.POST, 'POST', path, { body }), 401);
  await denied(await call(checkout.POST, 'POST', path, { actor: 'traveler', body: { ...body, passengerId: ids.second } }), 400);
  await denied(await call(checkout.POST, 'POST', path, { actor: 'traveler', body: { ...body, unitPrice: 1 } }), 400);
  assert.equal((await db.query('select id from reservation_checkouts')).rows.length, 0);
  const { id, total } = await allowed(await call(checkout.POST, 'POST', path, { actor: 'second', body }), 201);
  assert.equal(total, 80);
  const ownPath = path + '/' + id;

  for (const [actor, status] of [[undefined, 401], ['traveler', 404], ['owner', 404]]) {
    for (const [handler, method, suffix] of [
      [checkoutDetail.GET, 'GET', ''],
      [checkoutDetail.DELETE, 'DELETE', ''],
      [payment.POST, 'POST', '/payment'],
      [confirmation.POST, 'POST', '/payment/confirm'],
    ]) await denied(await call(handler, method, ownPath + suffix, { actor, id, body: suffix === '/payment/confirm' ? { paymentIntentId: 'pi_forged' } : undefined }), status);
  }
  assert.equal((await allowed(await call(checkoutDetail.GET, 'GET', ownPath, { actor: 'second', id }))).status, 'ACTIVE');
  assert.deepEqual((await db.query('select passenger_id, status from reservation_checkouts')).rows, [{ passenger_id: ids.second, status: 'ACTIVE' }]);
  assert.equal((await db.query('select id from reservation_payments where checkout_id=$1', [id])).rows.length, 0);
  assert.equal(providerRequests, 0);
});

test('F02: el webhook exige su secreto, incluso si se presenta una sesión Admin', async () => {
  const path = '/api/payments/onvopay/webhook';
  const body = { type: 'refund.succeeded', data: { paymentIntentId: 'pi_local_paid', amount: 4000 } };
  await denied(await call(webhook.POST, 'POST', path, { body }), 401);
  await denied(await call(webhook.POST, 'POST', path, { actor: 'admin', body, headers: { 'x-webhook-secret': 'incorrecto' } }), 401);
  assert.equal((await db.query('select status from reservation_payments')).rows[0].status, 'paid');
  const valid = await call(webhook.POST, 'POST', path, { body, headers: { 'x-webhook-secret': webhookKey } });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { received: true });
  assert.equal((await db.query('select status from reservation_payments')).rows[0].status, 'refunded');
});

test('F01: el perfil se escribe por sesión; enviar otro id o rol no modifica esa cuenta', async () => {
  const path = '/api/profile';
  const body = { name: 'Nombre propio', id: ids.second, userId: ids.second, role: 'Admin' };
  const before = (await db.query('select * from profiles where id=$1', [ids.second])).rows[0];
  await denied(await call(profile.PATCH, 'PATCH', path, { body }), 401);
  const updated = await allowed(await call(profile.PATCH, 'PATCH', path, { actor: 'traveler', body }));
  assert.equal(updated.id, ids.traveler);
  assert.equal(updated.role, 'Viajero');
  assert.equal(updated.name, 'Nombre propio');
  assert.deepEqual(authUpdates.map(update => update.id), [ids.traveler]);
  assert.deepEqual((await db.query('select * from profiles where id=$1', [ids.second])).rows[0], before);
});
