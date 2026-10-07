import test from 'node:test';
import assert from 'node:assert/strict';
import {currencyFormatter,dateFormatter,validRates} from '../../lib/preferences/format.ts';
import {GET} from '../../app/api/exchange-rates/route.ts';
const rates={date:new Date().toISOString().slice(0,10),fetchedAt:Date.now(),rates:{USD:1,CRC:500,EUR:0.9}};
test('conversion only affects display; missing rates remain clearly USD',()=>{
 assert.match(currencyFormatter('en','CRC',rates)(20),/≈ CRC\s*10,000\.00/);
 assert.match(currencyFormatter('en','EUR',rates)(20),/≈ EUR\s*18\.00/);
 assert.match(currencyFormatter('en','CRC',null)(20),/^USD\s*20\.00$/);
 assert.equal(rates.rates.USD,1);
});
test('invalid rates are rejected and dates use Costa Rica time',()=>{
 assert.equal(validRates(rates),true);
 assert.equal(validRates({...rates,rates:{...rates.rates,CRC:0}}),false);
 assert.equal(validRates({...rates,fetchedAt:Date.now()+3600000}),false);
 assert.match(dateFormatter('en')('2030-01-12T14:00:00Z'),/8:00/);
});
test('rate API rejects failures, deduplicates simultaneous requests and caches success',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async()=>{throw new Error('Offline');};
  const failed=await GET(new Request('http://localhost/api/exchange-rates'));
  assert.equal(failed.status,503);assert.equal(failed.headers.get('cache-control'),'no-store');
  let calls=0;
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return Response.json([{date:new Date().toISOString().slice(0,10),base:'USD',quote:'CRC',rate:500},{date:new Date().toISOString().slice(0,10),base:'USD',quote:'EUR',rate:0.9}]);};
  const responses=await Promise.all([GET(new Request('http://localhost/api/exchange-rates')),GET(new Request('http://localhost/api/exchange-rates'))]);
  assert.ok(responses.every(response=>response.status===200));assert.equal(calls,1);
  const cached=await GET(new Request('http://localhost/api/exchange-rates'));assert.equal(calls,1);
  assert.match(cached.headers.get('cache-control'),/public/);
  assert.equal((await cached.json()).data.rates.USD,1);
 }finally{globalThis.fetch=original;}
});
