import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { createDatabase, ids } from './mail/database.mjs';
import * as agencyReview from '../app/api/admin/agencies/[id]/status/route.ts';
import * as publicationReview from '../app/api/admin/publications/[id]/status/route.ts';
import * as myAgency from '../app/api/agencies/me/route.ts';
import * as myPublication from '../app/api/publications/[id]/route.ts';
import { getMyAgency } from '../modules/agency/services/agency.service.ts';

let fixture;
const originalFetch = globalThis.fetch;
const originalRemote = process.env.LARUTICA_REMOTE_API_ORIGIN;
const reason = 'Corrige la información.\nAdjunta documentación legible.';
const agencyPayload = {
  agencyName: 'Agencia de prueba', commercialName: 'La prueba', businessType: 'AGENCY',
  description: 'Descripción', email: 'agency@example.invalid', phone: '88888888',
  country: 'Costa Rica', province: 'San José', city: 'San José', exactAddress: 'Centro',
  logoUrl: 'https://example.invalid/logo.png', coverUrl: 'https://example.invalid/cover.png',
  verificationDocumentUrl: 'document.pdf', categoryIds: [1], languageIds: [1], acceptedTerms: true,
};

before(async () => {
  fixture = await createDatabase();
  // Complete the existing minimal fixture only for the owner-edit routes under test.
  for (const column of ['agency_name', 'business_type', 'description', 'website', 'country', 'province', 'city', 'exact_address', 'logo_url', 'cover_url', 'verification_document_url', 'instagram_url', 'facebook_url', 'whatsapp']) {
    await fixture.db.exec(`alter table agencies add column ${column} text`);
  }
  await fixture.db.exec(`alter table agencies add column accepted_terms boolean, add column terms_accepted_at timestamptz;
    alter table publications add column duration_minutes integer, add column included text, add column not_included text,
      add column journey jsonb, add column journey_required boolean default false, add column default_capacity integer;`);
  // Catalog/relation fixtures are unrelated to review persistence; reuse the database adapter for both entities.
  const relationRows = {
    service_categories: [{ id: 1, active: true }], languages: [{ id: 1, name: 'Español', code: 'es', active: true }],
    publication_languages: [{ language_id: 1 }], agency_service_categories: [], agency_languages: [],
  };
  const from = fixture.admin.from;
  fixture.admin.from = (table) => {
    if (!(table in relationRows)) return from(table);
    const query = {
      select() { return this; }, eq() { return this; }, in() { return this; },
      delete() { return this; }, insert() { return this; },
      then(resolve, reject) { return Promise.resolve({ data: relationRows[table], error: null }).then(resolve, reject); },
    };
    return query;
  };
  globalThis.mailTestAdmin = fixture.admin;
  globalThis.mailTestActors = { [ids.owner]: 'Agencia', [ids.outsider]: 'Agencia', [ids.admin]: 'Admin', [ids.traveler]: 'Viajero' };
  delete process.env.LARUTICA_REMOTE_API_ORIGIN;
});
beforeEach(async () => {
  await fixture.reset();
  // Avoid external mail delivery: this feature does not change the existing notification.
  await fixture.db.exec("update agencies set email=null; update publications set status='PENDING', description='Descripción', destination='Arenal', duration_minutes=60, included='Guía', not_included='Almuerzo', meeting_point='Centro', main_image_url='https://example.invalid/image.png', default_capacity=10");
});
after(async () => {
  globalThis.fetch = originalFetch;
  await fixture?.db.close();
  if (originalRemote === undefined) delete process.env.LARUTICA_REMOTE_API_ORIGIN;
  else process.env.LARUTICA_REMOTE_API_ORIGIN = originalRemote;
});

async function call(route, path, method, body, actor = 'admin') {
  const response = await route[method](new Request(`http://localhost${path}`, {
    method, headers: { origin: 'http://localhost', 'content-type': 'application/json', ...(actor ? { 'x-test-user': ids[actor] } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), { params: Promise.resolve({ id: ids.publication }) });
  return { status: response.status, body: await response.json() };
}
const publicationPath = `/api/publications/${ids.publication}`;

for (const [table, route, id] of [['agencies', agencyReview, ids.agency], ['publications', publicationReview, ids.publication]]) {
  const path = `/api/admin/${table}/${id}/status`;
  test(`${table}: rechazo guarda texto recortado y aprobación limpia motivo sin exigirlo`, async () => {
    await fixture.db.exec(`update ${table} set status='PENDING'`);
    const rejected = await call(route, path, 'PATCH', { status: 'REJECTED', rejectionReason: `  ${reason}  ` });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    assert.equal(rejected.body.data.rejection_reason, reason);
    assert.deepEqual((await fixture.db.query(`select status, rejection_reason from ${table}`)).rows[0], { status: 'REJECTED', rejection_reason: reason });
    assert.equal((await call(route, path, 'PATCH', { status: 'REJECTED', rejectionReason: reason })).status, 409);
    await fixture.db.exec(`update ${table} set status='PENDING'`);
    const approved = await call(route, path, 'PATCH', { status: 'APPROVED' });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.rejection_reason, null);
  });
  test(`${table}: rechazos sin motivo válido fallan sin cambiar el registro`, async () => {
    await fixture.db.exec(`update ${table} set status='PENDING'`);
    for (const rejectionReason of [undefined, null, '', ' \n\t ', 123, {}, []]) {
      const response = await call(route, path, 'PATCH', { status: 'REJECTED', rejectionReason });
      assert.equal(response.status, 400);
      assert.match(response.body.error, /motivo/);
    }
    assert.deepEqual((await fixture.db.query(`select status, rejection_reason from ${table}`)).rows[0], { status: 'PENDING', rejection_reason: null });
    assert.equal((await call(route, path, 'PATCH', { status: 'REJECTED', rejectionReason: reason }, 'owner')).status, 403);
    assert.equal((await call(route, path, 'PATCH', { status: 'REJECTED', rejectionReason: reason }, null)).status, 401);
  });
}

test('agencia: propietario lee motivo normalizado, corrige conservándolo y reenvía limpiándolo', async () => {
  await fixture.db.query("update agencies set status='REJECTED', rejection_reason=$1", [reason]);
  const own = await call(myAgency, '/api/agencies/me', 'GET', undefined, 'owner');
  assert.equal(own.status, 200);
  assert.equal(own.body.data.agency.rejection_reason, reason);
  globalThis.fetch = async () => Response.json(own.body);
  try { assert.equal((await getMyAgency()).rejectionReason, reason); }
  finally { globalThis.fetch = originalFetch; }
  const other = await call(myAgency, '/api/agencies/me', 'GET', undefined, 'outsider');
  assert.equal(other.body.data, null);
  for (const [action, expectedStatus, expectedReason] of [['DRAFT', 'DRAFT', reason], ['SUBMIT', 'PENDING', null]]) {
    const response = await call(myAgency, '/api/agencies/me', 'PATCH', { ...agencyPayload, action, rejectionReason: 'No puede sobrescribirlo' }, 'owner');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual((await fixture.db.query('select status, rejection_reason from agencies')).rows[0], { status: expectedStatus, rejection_reason: expectedReason });
  }
});

test('publicación: detalle del propietario recibe motivo, edición conserva y reenvío limpia', async () => {
  await fixture.db.query("update publications set status='REJECTED', rejection_reason=$1", [reason]);
  const own = await call(myPublication, publicationPath, 'GET', undefined, 'owner');
  assert.equal(own.status, 200, JSON.stringify(own.body));
  assert.equal(own.body.data.rejectionReason, reason);
  assert.equal((await call(myPublication, publicationPath, 'GET', undefined, 'outsider')).status, 404);
  assert.equal((await call(myPublication, publicationPath, 'GET', undefined, 'traveler')).status, 403);
  for (const [action, expectedStatus, expectedReason] of [['DRAFT', 'DRAFT', reason], ['SUBMIT', 'PENDING', null]]) {
    const response = await call(myPublication, publicationPath, 'PATCH', { action, rejectionReason: 'No puede sobrescribirlo' }, 'owner');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.rejectionReason, expectedReason);
    assert.deepEqual((await fixture.db.query('select status, rejection_reason from publications')).rows[0], { status: expectedStatus, rejection_reason: expectedReason });
  }
});

test('rechazos anteriores sin motivo siguen siendo legibles', async () => {
  await fixture.db.exec("update agencies set status='REJECTED'; update publications set status='REJECTED'");
  assert.equal((await call(myAgency, '/api/agencies/me', 'GET', undefined, 'owner')).body.data.agency.rejection_reason, null);
  assert.equal((await call(myPublication, publicationPath, 'GET', undefined, 'owner')).body.data.rejectionReason, null);
});
