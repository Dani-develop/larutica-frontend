import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestGeoapify} from '../../lib/maps/geoapify-request.ts';

test('fallo de conexión usa el otro endpoint oficial y recuerda el que responde',async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push(new URL(url));assert.ok(options.signal);assert.equal(url.searchParams.get('apiKey'),'test-only');
  if(calls.length===1)throw new TypeError('private request test-only');
  return Response.json({results:[{name:'Nicoya'}]});
 };
 assert.deepEqual(await requestGeoapify('/v1/geocode/autocomplete',{text:'Nicoya'},'test-only',fetcher),{results:[{name:'Nicoya'}]});
 assert.equal(calls.length,2);assert.notEqual(calls[0].origin,calls[1].origin);
 assert.ok(calls.every(url=>['api.geoapify.com','api-eu.geoapify.com'].includes(url.hostname)));
 const winner=calls[1].origin;
 await requestGeoapify('/v1/geocode/autocomplete',{text:'Heredia'},'test-only',async url=>{
  assert.equal(url.origin,winner);return Response.json({results:[]});
 });
});

test('no repite credenciales rechazadas, cuotas ni errores de ubicaciones',async()=>{
 for(const [status,expected] of [[400,422],[401,503],[403,503],[429,429]]){
  let calls=0;
  await assert.rejects(requestGeoapify('/v1/routing',{mode:'drive'},'test-only',async()=>{
   calls++;return Response.json({message:status===400?'No path':'rejected'},{status});
  }),error=>error.status===expected);
  assert.equal(calls,1);
 }
});

test('respuesta 5xx o cuerpo roto permite recuperación en el segundo endpoint',async()=>{
 for(const broken of [()=>Response.json({},{status:503}),()=>new Response('{')]){
  let calls=0;
  const data=await requestGeoapify('/v1/routing',{mode:'drive'},'test-only',async()=>++calls===1?broken():Response.json({features:[]}));
  assert.equal(calls,2);assert.deepEqual(data,{features:[]});
 }
});

test('ambos endpoints agotados tienen límite de dos intentos y no filtran secretos',async()=>{
 let calls=0;const logs=[],warn=console.warn;console.warn=(...values)=>logs.push(values);
 try{
  await assert.rejects(requestGeoapify('/v1/routing',{mode:'drive'},'test-secret',async()=>{
   calls++;throw new DOMException('https://private/?apiKey=test-secret','TimeoutError');
  }),error=>error.status===504&&!error.message.includes('test-secret'));
  assert.equal(calls,2);assert.doesNotMatch(JSON.stringify(logs),/private|test-secret|waypoints/);
 }finally{console.warn=warn;}
});
