import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {shouldTouchSession} from '../lib/supabase/session-activity.ts';
import {usedDepartureSeats} from '../lib/traveler/availability.ts';
import {fetchMapTile} from '../lib/maps/tile.ts';
import {GET as departures} from '../app/api/publications/departures/route.ts';
import {createDatabase,ids} from './mail/database.mjs';

test('actividad: no escribe en cada petición y sí después de un minuto',()=>{
  const now=Date.now();
  assert.equal(shouldTouchSession(new Date(now-59999).toISOString(),now),false);
  assert.equal(shouldTouchSession(new Date(now-60000).toISOString(),now),true);
  assert.equal(shouldTouchSession(undefined,now),true);
});

test('cupos: concurrencia limitada, paginación y UUID duplicados sin doble conteo',async()=>{
  let active=0,peak=0,calls=0;const ranges=[];
  const admin={from(){let chunk;const q={select(){return q;},in(_,ids){chunk=ids;return q;},neq(){return q;},order(){return q;},async range(from){
    calls++;ranges.push([chunk[0],from]);active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,2));active--;
    const data=chunk[0]==='id0' ? from===0 ? Array.from({length:1000},()=>({departure_id:'id0',number_of_people:1})) : [{departure_id:'id0',number_of_people:2}] : [{departure_id:chunk[0],number_of_people:1}];
    return {data,error:null};
  }};return q;}};
  const ids=Array.from({length:650},(_,i)=>'id'+i);
  const seats=await usedDepartureSeats(admin,[...ids,'id0']);
  assert.equal(seats.get('id0'),1002);assert.equal(seats.get('id600'),1);
  assert.equal(peak,4);assert.equal(calls,8);
  assert.ok(ranges.some(([id,offset])=>id==='id0'&&offset===1000));
});

test('mapa: reintenta un fallo de red, pero no multiplica peticiones rechazadas',async()=>{
  const url=new URL('https://example.invalid/tile');let calls=0;
  const bytes=await fetchMapTile(url,async()=>{if(++calls===1)throw new Error('network');return new Response(new Uint8Array([1,2,3]));});
  assert.equal(calls,2);assert.equal(bytes.byteLength,3);
  calls=0;
  await assert.rejects(fetchMapTile(url,async()=>{calls++;return new Response('',{status:429});}),{status:502});
  assert.equal(calls,1);
  calls=0;
  await assert.rejects(fetchMapTile(url,async()=>{calls++;throw new Error('timeout');}),{status:502});
  assert.equal(calls,2);
});

test('mapa: captura fallos al leer el cuerpo, antes de devolver un 200 roto',async()=>{
  let calls=0;
  const bytes=await fetchMapTile(new URL('https://example.invalid/tile'),async()=>++calls===1
    ? new Response(new ReadableStream({start(controller){controller.error(new Error('body timeout'));}}))
    : new Response('ok'));
  assert.equal(calls,2);assert.equal(bytes.byteLength,2);
});

let fixture;after(async()=>{await fixture?.db.close();});
test('salidas agrupadas: solo propietario, sin datos de otra agencia ni acceso anónimo',async()=>{
  fixture=await createDatabase();await fixture.reset();
  globalThis.mailTestAdmin=fixture.admin;
  globalThis.mailTestActors={[ids.owner]:'Agencia',[ids.outsider]:'Agencia',[ids.traveler]:'Viajero'};
  const get=(actor)=>departures(new Request('http://localhost/api/publications/departures',{headers:{origin:'http://localhost',...(actor?{'x-test-user':actor}:{})}}));
  assert.equal((await get()).status,401);
  assert.equal((await get(ids.traveler)).status,403);
  assert.deepEqual((await (await get(ids.outsider)).json()).data,[]);
  const response=await get(ids.owner);assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.data.length,1);assert.equal(body.data[0].id,ids.departure);
  assert.equal(body.data[0].publicationId,ids.publication);
  assert.doesNotMatch(JSON.stringify(body),/owner_user_id|agency@example/);
});
