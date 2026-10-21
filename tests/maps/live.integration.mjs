// Opt-in: real Geoapify calls, no publications, accounts, reservations or emails.
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {GET as search} from '../../app/api/maps/places/route.ts';
import {GET as reverse} from '../../app/api/maps/reverse/route.ts';
import {POST} from '../../app/api/maps/route/route.ts';
import {parseJourney} from '../../lib/maps/validation.ts';
import {verifyJourney} from '../../lib/maps/provider.ts';
globalThis.mapTestRole='Agencia';
let a,b,c,d;
async function find(q,name){
  const r=await search(new Request('http://localhost/api/maps/places?q='+encodeURIComponent(q)));
  const body=await r.json();assert.equal(r.status,200,body.error);
  const p=body.data.find(p=>p.type==='city' && p.name===name);assert.ok(p,'No se encontró la localidad concreta '+q);return p;
}
async function calculate(points,mode='drive'){
  const r=await POST(new Request('http://localhost/api/maps/route',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify({points,mode})}));
  const body=await r.json();assert.equal(r.status,200,body.error);const j=body.data;
  assert.ok(j.geometry.coordinates.flat().length>10,'Debe incluir el trazado real, no únicamente los extremos');
  assert.ok(j.distance>0);assert.ok(j.duration>0);await verifyJourney(j);
  parseJourney({...j,confirmedAt:new Date().toISOString()},true);
  console.log(`${points.map(p=>p.name).join(' → ')}: ${(j.distance/1000).toFixed(1)} km, ${j.geometry.coordinates.length} tramos, confirmado y firma válida`);
  return j;
}
before(async()=>{
  assert.ok(process.env.GEOAPIFY_API_KEY,'Configura GEOAPIFY_API_KEY en .env.local');
  a=await find('Heredia','Heredia');b=await find('Las Pailas','Las Pailas');c=await find('San Ramón','San Ramón');d=await find('Santa Cruz','Santa Cruz');
});
test('real: búsqueda concreta, línea vial, confirmación y firma',{timeout:60000},async()=>{await calculate([a,b]);});
test('real: añadir parada, añadir segunda, reordenar y quitar',{timeout:120000},async()=>{
  await calculate([a,c,b]);await calculate([a,c,d,b]);await calculate([a,d,c,b]);await calculate([a,b]);
});
test('real: mover un punto manual conserva coordenadas y recalcula',{timeout:60000},async()=>{
  const lat=a.lat+0.0001,lon=a.lon;
  const r=await reverse(new Request(`http://localhost/api/maps/reverse?lat=${lat}&lon=${lon}`));assert.equal(r.status,200);const {data}=await r.json();assert.ok(data);assert.equal(data.lat,lat);assert.equal(data.lon,lon);
  await calculate([data,b]);
});
