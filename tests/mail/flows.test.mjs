import assert from 'node:assert/strict';
import { test, before, beforeEach, after } from 'node:test';
import { createServer } from 'node:http';
import { createDatabase, ids } from './database.mjs';
import { createSmtp } from './smtp.mjs';
import * as reservations from '../../app/api/reservations/route.ts';
import * as departures from '../../app/api/publications/[id]/departures/[departureId]/route.ts';
import * as reviews from '../../app/api/admin/publications/[id]/status/route.ts';

let fixture, smtp, http, origin;
const originalEnv = { ...process.env };
globalThis.mailTestActors = Object.fromEntries(Object.entries({ traveler: 'Viajero', second: 'Viajero', owner: 'Agencia', outsider: 'Agencia', admin: 'Admin' }).map(([key, role]) => [ids[key], role]));

before(async () => {
  fixture = await createDatabase();
  globalThis.mailTestAdmin = fixture.admin;
  smtp = await createSmtp();
  Object.assign(process.env, smtp.env);
  delete process.env.LARUTICA_REMOTE_API_ORIGIN;
  http = createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const request = new Request(origin + incoming.url, { method: incoming.method,
        headers: incoming.headers, body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks) });
      const isReview = incoming.url.startsWith('/api/admin/');
      const route = isReview ? reviews : incoming.url.includes('/departures/') ? departures : reservations;
      const response = await route[incoming.method](request, { params: Promise.resolve({ id: ids.publication, departureId: ids.departure }) });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${http.address().port}`;
});
beforeEach(async () => { await fixture.reset(); smtp.clear(); Object.assign(process.env, smtp.env); });
after(async () => {
  http?.closeAllConnections();
  if (http) await new Promise(resolve => http.close(resolve));
  if (smtp) await smtp.close();
  await fixture?.db.close();
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
async function request(path, method = 'POST', body, actor = 'traveler', headers = {}) {
  const response = await fetch(origin + path, { method, headers: { origin,
    'content-type': 'application/json', ...(actor ? { 'x-test-user': ids[actor] } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const book = async (actor = 'traveler', people = 2, pay = true) => {
  const response = await request('/api/reservations', 'POST', { departureId: ids.departure, numberOfPeople: people }, actor);
  if (response.status === 201 && pay) {
    const { applyPaymentStatus } = await import('../../lib/payments/repository.ts');
    const id = response.body.data.id;
    const current = await fixture.db.query('select status from reservation_payments where reservation_id=$1', [id]);
    if (!current.rows.length) {
      await fixture.db.query("insert into reservation_payments(reservation_id,provider_payment_id,amount,currency,status) values($1,$2,$3,'USD','pending')",[id,'pi_'+id,response.body.data.total]);
      await applyPaymentStatus(fixture.admin, 'pi_'+id, 'paid', {source:'verified-test'});
    }
    response.body.data.status = 'CONFIRMED';
  }
  return response;
};
const departurePath = `/api/publications/${ids.publication}/departures/${ids.departure}`;
const reviewPath = `/api/admin/publications/${ids.publication}/status`;

test('crear una reserva sin pago no la confirma ni envía correos', async () => {
  const response = await book('traveler', 2, false);
  assert.equal(response.status, 201);
  assert.equal(response.body.data.status, 'PENDING');
  assert.equal(smtp.received.length, 0);
});

test('HTTP → reserva persistida → SMTP autenticado → correos al viajero y agencia', async () => {
  const response = await book();
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.data.status, 'CONFIRMED');
  assert.equal((await fixture.db.query('select count(*)::int n from reservations')).rows[0].n, 1);
  assert.deepEqual(smtp.received.map(x => x.to[0]), ['traveler@example.invalid', 'agency@example.invalid']);
  for (const message of smtp.received) {
    assert.equal(message.from, 'test@example.invalid');
    assert.equal(message.subject, 'Reserva realizada');
    assert.match(message.text, /Volcán Arenal/);
    assert.match(message.text, /Personas: 2/);
    assert.match(message.text, /Tu pago fue recibido/);
    assert.match(message.text, /Referencia del pago/);
    assert.match(message.text, new RegExp(response.body.data.id.slice(0, 8).toUpperCase()));
  }
});
test('reintentar una reserva no duplica correos ni cupos', async () => {
  const first = await book(), second = await book();
  assert.equal(first.body.data.id, second.body.data.id);
  assert.equal(smtp.received.length, 2);
});
test('sin correo de viajero todavía se notifica a la agencia', async () => {
  await fixture.db.query('update profiles set email=null where id=$1', [ids.traveler]);
  assert.equal((await book()).status, 201);
  assert.deepEqual(smtp.received.map(x => x.to[0]), ['agency@example.invalid']);
});
test('sin correo de agencia todavía se notifica al viajero', async () => {
  await fixture.db.exec('update agencies set email=null');
  assert.equal((await book()).status, 201);
  assert.deepEqual(smtp.received.map(x => x.to[0]), ['traveler@example.invalid']);
});
test('rechazo SMTP del viajero no impide enviar a la agencia ni guardar la reserva', async () => {
  smtp.state.rejectRecipients.add('traveler@example.invalid');
  assert.equal((await book()).status, 201);
  assert.deepEqual(smtp.received.map(x => x.to[0]), ['agency@example.invalid']);
});
test('credenciales SMTP rechazadas no deshacen la reserva', async () => {
  smtp.state.failAuth = true;
  assert.equal((await book()).status, 201);
  assert.equal(smtp.received.length, 0);
  assert.equal((await fixture.db.query('select count(*)::int n from reservations')).rows[0].n, 1);
});
test('sin configuración SMTP la reserva persiste, sin afirmar entrega', async () => {
  delete process.env.SMTP_PASS;
  assert.equal((await book()).status, 201);
  assert.equal(smtp.received.length, 0);
});
test('sin cupo no se genera ninguna notificación', async () => {
  await fixture.db.exec('update publication_departures set capacity=1');
  assert.equal((await book()).status, 400);
  assert.equal(smtp.received.length, 0);
});
for (const method of ['PATCH', 'DELETE']) {
  test(`${method} cancelar salida → reservas canceladas → correo a cada viajero`, async () => {
    await book(); await book('second'); smtp.clear();
    const response = await request(departurePath, method, method === 'PATCH' ? { status: 'CANCELLED' } : undefined, 'owner');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.status, 'CANCELLED');
    assert.ok((await fixture.db.query('select status from reservations')).rows.every(x => x.status === 'CANCELLED'));
    assert.deepEqual(smtp.received.map(x => x.to[0]).sort(), ['second@example.invalid', 'traveler@example.invalid']);
    assert.ok(smtp.received.every(x => x.subject === 'Salida cancelada' && /Tu reserva quedó cancelada/.test(x.text)));
  });
}
test('repetir DELETE de una salida no vuelve a enviar correos', async () => {
  await book(); smtp.clear();
  assert.equal((await request(departurePath, 'DELETE', undefined, 'owner')).status, 200);
  assert.equal((await request(departurePath, 'DELETE', undefined, 'owner')).status, 200);
  assert.equal(smtp.received.length, 1);
});
test('fallo SMTP de una cancelación permite avisar al siguiente viajero', async () => {
  await book(); await book('second'); smtp.clear(); smtp.state.rejectRecipients.add('traveler@example.invalid');
  assert.equal((await request(departurePath, 'DELETE', undefined, 'owner')).status, 200);
  assert.deepEqual(smtp.received.map(x => x.to[0]), ['second@example.invalid']);
});
test('editar capacidad sin cancelar no envía correo de cancelación', async () => {
  assert.equal((await request(departurePath, 'PATCH', { capacity: 20 }, 'owner')).status, 200);
  assert.equal(smtp.received.length, 0);
});
for (const status of ['APPROVED', 'REJECTED']) {
  test(`revisión ${status} → publicación persistida → SMTP a la agencia`, async () => {
    await fixture.db.exec("update publications set status='PENDING'");
    const response = await request(reviewPath, 'PATCH', { status }, 'admin');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal((await fixture.db.query('select status from publications')).rows[0].status, status);
    assert.equal(smtp.received.length, 1);
    assert.equal(smtp.received[0].to[0], 'agency@example.invalid');
    assert.equal(smtp.received[0].subject, status === 'APPROVED' ? 'Publicación aceptada' : 'Publicación negada');
    assert.match(smtp.received[0].text, /Volcán Arenal/);
  });
}
test('publicación ya revisada responde 409 y no vuelve a notificar', async () => {
  assert.equal((await request(reviewPath, 'PATCH', { status: 'APPROVED' }, 'admin')).status, 409);
  assert.equal(smtp.received.length, 0);
});
test('agencia sin aprobación bloquea aprobación y no envía correos', async () => {
  await fixture.db.exec("update publications set status='PENDING'; update agencies set status='PENDING'");
  assert.equal((await request(reviewPath, 'PATCH', { status: 'APPROVED' }, 'admin')).status, 409);
  assert.equal(smtp.received.length, 0);
});
test('error SMTP al revisar no deshace la decisión persistida', async () => {
  await fixture.db.exec("update publications set status='PENDING'"); smtp.state.failData = true;
  assert.equal((await request(reviewPath, 'PATCH', { status: 'REJECTED' }, 'admin')).status, 200);
  assert.equal((await fixture.db.query('select status from publications')).rows[0].status, 'REJECTED');
  assert.equal(smtp.received.length, 0);
});
test('sin correo de contacto no se intenta SMTP al revisar', async () => {
  await fixture.db.exec("update publications set status='PENDING'; update agencies set email=null");
  assert.equal((await request(reviewPath, 'PATCH', { status: 'REJECTED' }, 'admin')).status, 200);
  assert.equal(smtp.attempts.length, 0);
});
test('fallo de escritura de una revisión no envía correo', async () => {
  await fixture.db.exec("update publications set status='PENDING'"); fixture.admin.failUpdate = 'publications';
  assert.equal((await request(reviewPath, 'PATCH', { status: 'REJECTED' }, 'admin')).status, 500);
  assert.equal((await fixture.db.query('select status from publications')).rows[0].status, 'PENDING');
  assert.equal(smtp.received.length, 0);
});
test('sin sesión, sin permisos, origen ajeno y datos inválidos no envían correos', async () => {
  assert.equal((await request('/api/reservations', 'POST', { departureId: ids.departure, numberOfPeople: 1 }, null)).status, 401);
  assert.equal((await request('/api/reservations', 'POST', { departureId: ids.departure, numberOfPeople: 1 }, 'traveler', { origin: 'https://other.invalid' })).status, 403);
  assert.equal((await book('traveler', 0)).status, 400);
  assert.equal((await request(departurePath, 'DELETE', undefined, 'traveler')).status, 403);
  assert.equal((await request(departurePath, 'DELETE', undefined, 'outsider')).status, 404);
  assert.equal((await request(reviewPath, 'PATCH', { status: 'REJECTED' }, 'owner')).status, 403);
  assert.equal(smtp.received.length, 0);
});
