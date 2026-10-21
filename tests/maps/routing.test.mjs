import {test,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../../app/api/maps/route/route.ts';
import {GET as search} from '../../app/api/maps/places/route.ts';
import {GET as reverse} from '../../app/api/maps/reverse/route.ts';
import {emptyJourney,journeyReady,placeContext} from '../../modules/journeys/types.ts';
import {routeInputIssue,isSpecificPlace} from '../../modules/journeys/route-input.ts';
import {changeJourney,resolveJourneyPoint} from '../../modules/journeys/edit-journey.ts';
import {mapProviderFailure} from '../../lib/maps/provider-errors.ts';
import {parseJourney} from '../../lib/maps/validation.ts';
import {verifyJourney,signJourney} from '../../lib/maps/provider.ts';
import {places,calculated} from './fixtures.ts';
const originalFetch=globalThis.fetch,originalKey=process.env.GEOAPIFY_API_KEY;
process.env.GEOAPIFY_API_KEY='maps-test-only-not-a-provider-key';
let calls=0;
beforeEach(()=>{calls=0;globalThis.mapTestRole='Agencia';globalThis.fetch=async()=>{calls++;return Response.json({features:[{geometry:calculated(places.slice(0,2)).geometry,properties:{distance:24000,time:1200}}]});};});
after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEOAPIFY_API_KEY;else process.env.GEOAPIFY_API_KEY=originalKey;delete globalThis.mapTestRole;});
function request(points=places.slice(0,2),mode='drive',extra={}){return new Request('http://localhost/api/maps/route',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost',...extra},body:JSON.stringify({points,mode})});}
const confirmed=()=>({...emptyJourney(),...calculated(places.slice(0,2)),confirmedAt:new Date().toISOString()});
test('los centroides administrativos se excluyen y se conserva cantón y provincia aunque coincidan',()=>{
  for(const type of ['state','county','postcode','country'])assert.equal(isSpecificPlace(type),false);
  assert.equal(isSpecificPlace('city'),true);assert.match(placeContext(places[0]),/Cantón: Heredia.*Provincia: Heredia/);
  assert.match(routeInputIssue([{...places[0],type:'state'},places[1]],'drive'),/provincia/);
});
test('límites, coordenadas, selección incompleta y duplicados se validan antes de consultar',()=>{
  const a=places[0],b=places[1];
  for(const points of [[a],[a,null],[a,{...b,lat:NaN}],[a,{...b,lat:-84,lon:10}],Array(13).fill(a)])assert.ok(routeInputIssue(points,'drive'));
  assert.ok(routeInputIssue([a,a],'drive'));assert.ok(routeInputIssue([a,b,b],'drive'));
  assert.equal(routeInputIssue([a,b,a],'drive'),null);assert.equal(routeInputIssue([a,a],'locations'),null);
  assert.equal(routeInputIssue([a,b,...Array.from({length:10},(_,i)=>places[i%2])],'drive'),null);
});
test('mover, añadir, quitar, reordenar o cambiar modo invalida trazado y confirmación',()=>{
  const j=confirmed();assert.equal(journeyReady(j),true);
  for(const update of [{points:[places[0],places[2],places[1]]},{points:[places[1],places[0]]},{points:[null,places[1]]},{mode:'walk'}]){
    const next=changeJourney(j,update);assert.equal(next.geometry,null);assert.equal(next.integrity,null);assert.equal(next.distance,null);assert.equal(next.confirmedAt,null);assert.equal(journeyReady(next),false);
  }
});
test('encuentro vinculado sigue la salida; el encuentro independiente conserva su ubicación',()=>{
  const j={...confirmed(),meetingLocation:places[0],meetingAtOrigin:true};
  assert.deepEqual(changeJourney(j,{points:[places[2],places[1]]}).meetingLocation,places[2]);
  assert.deepEqual(changeJourney({...j,meetingAtOrigin:false},{points:[places[2],places[1]]}).meetingLocation,places[0]);
});
test('geocodificación tardía no cambia puntos movidos/eliminados ni el orden ni el trazado vigente',()=>{
  const manual={...places[2],adjusted:true};const j={...confirmed(),points:[places[0],manual,places[1]]};
  const resolved={...manual,name:'Dirección precisa',lat:1,lon:1};
  const reordered={...j,points:[manual,places[0],places[1]]};const next=resolveJourneyPoint(reordered,manual,resolved);
  assert.equal(next.points[0].name,'Dirección precisa');assert.equal(next.points[0].lat,manual.lat);assert.equal(next.geometry,j.geometry);assert.equal(next.integrity,j.integrity);
  assert.equal(resolveJourneyPoint({...j,points:[places[0],{...manual,lat:10.2},places[1]]},manual,resolved).points[1].lat,10.2);
  const removed={...j,points:[places[0],places[1]]};assert.equal(resolveJourneyPoint(removed,manual,resolved),removed);
});
test('cálculo firmado: se puede confirmar y guardar; mover/reordenar/alterar métricas o geometría se rechaza',async()=>{
  const response=await POST(request());assert.equal(response.status,200);const {data:j}=await response.json();
  assert.match(j.integrity,/^[a-f0-9]{64}$/);assert.equal(journeyReady(j),false);j.confirmedAt=new Date().toISOString();assert.equal(journeyReady(parseJourney(j,true)),true);await verifyJourney(j);
  for(const altered of [{...j,points:[j.points[1],j.points[0]]},{...j,distance:1},{...j,geometry:{...j.geometry,coordinates:[[[0,0],[1,1]]]}}])await assert.rejects(verifyJourney(altered),/cambió/);
  await verifyJourney({...j,meetingLocation:places[2]});
  assert.throws(()=>parseJourney({...j,confirmedAt:null},true),/confirma/);
});
test('se acepta una firma guardada tras rotar la clave, únicamente para el mismo trazado',async()=>{
  const j=confirmed();j.integrity=await signJourney(j);const old=process.env.GEOAPIFY_API_KEY;process.env.GEOAPIFY_API_KEY='rotated-test-key';
  try{await verifyJourney(j,j);await assert.rejects(verifyJourney({...j,duration:1},j),/cambió/);}finally{process.env.GEOAPIFY_API_KEY=old;}
});
test('API rechaza JSON roto, duplicados, coordenadas invertidas y modo sin cálculo',async()=>{
  assert.equal((await POST(new Request('http://localhost/api/maps/route',{method:'POST',body:'{'}))).status,400);
  assert.equal((await POST(request([places[0],places[0]]))).status,422);
  assert.equal((await POST(request([{...places[0],lat:-84,lon:10},places[1]]))).status,400);
  assert.equal((await POST(request(undefined,'locations'))).status,400);assert.equal(calls,0);
});
test('solo publicadores autenticados y solicitudes del mismo origen calculan rutas',async()=>{
  globalThis.mapTestRole=null;assert.equal((await POST(request())).status,401);
  globalThis.mapTestRole='Viajero';assert.equal((await POST(request())).status,403);
  globalThis.mapTestRole='Agencia';assert.equal((await POST(request(undefined,undefined,{origin:'https://other.example'}))).status,403);
  assert.equal(calls,0);
});
test('errores de acceso, rutas inconexas, cuota, credenciales y servidor tienen mensajes accionables',()=>{
  assert.equal(mapProviderFailure(400,'No suitable edges near location',true).status,422);
  assert.match(mapProviderFailure(400,'No suitable edges',true,'walk').message,/sendero/);
  for(const [status,detail,expected] of [[429,'',429],[403,'credits exhausted',429],[401,'',503],[403,'',503],[400,'No path',422],[500,'Internal error',502]])assert.equal(mapProviderFailure(status,detail,true).status,expected);
});
test('errores de proveedor no se almacenan y el reintento vuelve a consultar',async()=>{
  const points=[places[2],places[3]];let failing=true;
  globalThis.fetch=async()=>{calls++;return failing?Response.json({message:'No suitable edges near location'},{status:400}):Response.json({features:[{geometry:calculated(points).geometry,properties:{distance:10000,time:1000}}]});};
  assert.equal((await POST(request(points))).status,422);failing=false;assert.equal((await POST(request(points))).status,200);assert.equal(calls,2);
});
test('respuesta de ruta incompleta no se firma ni se ofrece para confirmar',async()=>{
  globalThis.fetch=async()=>Response.json({features:[{geometry:{type:'MultiLineString',coordinates:[]},properties:{distance:100,time:1}}]});
  assert.equal((await POST(request([places[0],places[3]],'hike'))).status,502);
});
test('búsqueda devuelve ciudad concreta, excluye provincia/código postal y mantiene contexto',async()=>{
  const p={place_id:'city',name:'Heredia',formatted:places[0].label,lat:places[0].lat,lon:places[0].lon,result_type:'city',state:'Heredia',county:'Heredia',country:'Costa Rica',country_code:'cr'};
  globalThis.fetch=async()=>Response.json({results:[{...p,place_id:'state',result_type:'state'},{...p,place_id:'postal',result_type:'postcode'},p,{...p,place_id:'foreign',country_code:'us'}]});
  const response=await search(new Request('http://localhost/api/maps/places?q=Heredia-test'));assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.length,1);assert.equal(data[0].type,'city');assert.match(placeContext(data[0]),/Cantón: Heredia.*Provincia: Heredia/);
});
test('la dirección de un punto manual enriquece su etiqueta sin desplazar sus coordenadas',async()=>{
  globalThis.fetch=async()=>Response.json({results:[{place_id:'reverse',name:'Calle',formatted:'Calle, Heredia',lat:10.2,lon:-84.5,country_code:'cr'}]});
  const response=await reverse(new Request('http://localhost/api/maps/reverse?lat=10.001&lon=-84.125'));const {data}=await response.json();assert.equal(response.status,200);assert.equal(data.lat,10.001);assert.equal(data.lon,-84.125);assert.equal(data.adjusted,true);
});
test('el modo solo ubicaciones no acepta una geometría fabricada',()=>{
  const j={...confirmed(),mode:'locations',geometry:null,distance:null,duration:null,integrity:null};assert.equal(journeyReady(parseJourney(j,true)),true);
  assert.throws(()=>parseJourney({...j,geometry:calculated(places.slice(0,2)).geometry},true),/solo puede contener ubicaciones/);
});
test('respuestas incompletas de búsqueda y dirección producen un error controlado',async()=>{
  globalThis.fetch=async()=>Response.json(null);
  assert.equal((await search(new Request('http://localhost/api/maps/places?q=incomplete-test'))).status,502);
  assert.equal((await reverse(new Request('http://localhost/api/maps/reverse?lat=10.12345&lon=-84.23456'))).status,502);
});
test('fallo de red al calcular conserva un error recuperable, sin filtrar detalles internos',async()=>{
  globalThis.fetch=async()=>{throw new TypeError('Network failure at private-provider-url');};
  const response=await POST(request([places[3],places[0]],'walk'));assert.equal(response.status,502);
  const body=await response.json();assert.match(body.error,/Intenta nuevamente/);assert.doesNotMatch(body.error,/private-provider/);
});
