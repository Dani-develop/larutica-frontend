import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

// Opt-in integration: creates isolated fixtures and removes them in finally.
test('viajero solicita, trabajador confirma, viajero cancela y recupera cupo', {skip:process.env.LARUTICA_TEST_WRITE !== '1'}, async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
  const worker = (await import('../dist/server/index.js')).default;
  const request = async (path,method='GET',body,cookie) => {
    const response = await worker.fetch(new Request(`http://localhost${path}`,{method,headers:{origin:'http://localhost',...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined}),{}, {waitUntil(){},passThroughOnException(){}});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, ids = [], pubs = [], deps = [];
  let agencyId;
  async function seed(role) {
    const email = `booking-${role.toLowerCase()}-${suffix}@example.com`, password = `Booking-${suffix}!`;
    const {data,error} = await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Prueba reservas ${role}`}});
    assert.ifError(error); ids.push(data.user.id);
    const updated = await admin.from('profiles').update({role}).eq('id',data.user.id); assert.ifError(updated.error);
    const login = await request('/api/auth/login','POST',{email,password}); assert.equal(login.status,200,JSON.stringify(login.body));
    return {id:data.user.id,cookie:login.cookie};
  }
  try {
    const traveler = await seed('Viajero'), provider = await seed('Agencia'), outsider = await seed('Transporte');
    const agency = await admin.from('agencies').insert({owner_user_id:provider.id,agency_name:`Prueba ${suffix}`,commercial_name:'Prueba de integración',business_type:'AGENCY',status:'APPROVED'}).select('id').single();
    assert.ifError(agency.error); agencyId = agency.data.id;
    const publication = await admin.from('publications').insert({agency_id:agencyId,title:`Prueba reserva ${suffix}`,service_type:'EXCURSION',description:'Registro temporal de prueba',destination:'Prueba',price_per_person:12500,status:'APPROVED',meeting_point:'Punto de prueba'}).select('id').single();
    assert.ifError(publication.error); pubs.push(publication.data.id);
    const departure = await admin.from('publication_departures').insert({publication_id:pubs[0],start_at:new Date(Date.now()+7*86400000).toISOString(),capacity:2,status:'ACTIVE'}).select('id').single();
    assert.ifError(departure.error); deps.push(departure.data.id);
    let catalog = await request(`/api/catalog?id=${pubs[0]}`);
    assert.equal(catalog.status,200,JSON.stringify(catalog.body));
    assert.equal(catalog.body.data[0].departures[0].available,2);
    assert.doesNotMatch(JSON.stringify(catalog.body),/passenger|owner_user|verification_document|@example/);
    assert.equal((await request('/api/reservations','POST',{departureId:deps[0],numberOfPeople:1})).status,401);
    const created = await request('/api/reservations','POST',{departureId:deps[0],numberOfPeople:2},traveler.cookie);
    assert.equal(created.status,201,JSON.stringify(created.body)); const id = created.body.data.id;
    assert.equal(created.body.data.status,'PENDING'); assert.equal(created.body.data.total,25000);
    const overflow = await request('/api/reservations','POST',{departureId:deps[0],numberOfPeople:1},traveler.cookie);
    assert.equal(overflow.status,400,JSON.stringify(overflow.body));
    assert.equal((await request(`/api/reservations/${id}`,'PATCH',{status:'CONFIRMED'},traveler.cookie)).status,403);
    assert.equal((await request(`/api/reservations/${id}`,'PATCH',{status:'CONFIRMED'},outsider.cookie)).status,404);
    const providerList = await request('/api/reservations','GET',undefined,provider.cookie);
    assert.equal(providerList.body.data[0].id,id); assert.equal(providerList.body.data[0].passengerName,'Prueba reservas Viajero');
    assert.equal((await request('/api/reservations','GET',undefined,outsider.cookie)).body.data.length,0);
    const confirmed = await request(`/api/reservations/${id}`,'PATCH',{status:'CONFIRMED'},provider.cookie);
    assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    assert.equal((await request(`/api/reservations/${id}`,'GET',undefined,traveler.cookie)).body.data.status,'CONFIRMED');
    assert.equal((await request(`/api/reservations/${id}`,'PATCH',{status:'CANCELLED'},traveler.cookie)).status,200);
    catalog = await request(`/api/catalog?id=${pubs[0]}`); assert.equal(catalog.body.data[0].departures[0].available,2);
    await admin.from('agencies').update({status:'INACTIVE'}).eq('id',agencyId);
    assert.equal((await request(`/api/catalog?id=${pubs[0]}`)).body.data.length,0);
    assert.equal((await request('/api/reservations','POST',{departureId:deps[0],numberOfPeople:1},traveler.cookie)).status,409);
  } finally {
    if (deps.length) {const r=await admin.from('reservations').delete().in('departure_id',deps); assert.ifError(r.error);}
    if (pubs.length) {const r=await admin.from('publications').delete().in('id',pubs); assert.ifError(r.error);}
    if (agencyId) {const r=await admin.from('agencies').delete().eq('id',agencyId); assert.ifError(r.error);}
    for (const id of ids) {const r=await admin.auth.admin.deleteUser(id); assert.ifError(r.error);}
  }
});
