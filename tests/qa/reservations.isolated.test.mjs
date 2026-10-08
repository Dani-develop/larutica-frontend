import assert from 'node:assert/strict';
import {test,before,after,beforeEach} from 'node:test';
import {readFile} from 'node:fs/promises';
import {PGlite} from 'file:///C:/Users/josed/Documents/Codex/2026-09-22/pue/tmp/booking-qa/node_modules/@electric-sql/pglite/dist/index.js';
import * as collection from '../../app/api/reservations/route.ts';
import * as detail from '../../app/api/reservations/[id]/route.ts';
import { publicationDepartures } from '../../lib/traveler/availability.ts';
import * as catalog from '../../app/api/catalog/route.ts';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',owner:'33333333-3333-4333-8333-333333333333',outside:'44444444-4444-4444-8444-444444444444',admin:'55555555-5555-4555-8555-555555555555',agency:'66666666-6666-4666-8666-666666666666',pub:'77777777-7777-4777-8777-777777777777',dep:'88888888-8888-4888-8888-888888888888'};
const db=new PGlite();
globalThis.fetch=()=>{throw Error('Network forbidden in isolated QA');};
globalThis.qaActors=Object.fromEntries(['a','b','owner','outside','admin'].map(key=>[ids[key],{role:({owner:'Agencia',outside:'Transporte',admin:'Admin'})[key]??'Viajero',active:true}]));
class Query{
 constructor(table){this.table=table;this.filters=[];this.embedded=[];this.orders=[];this.offset=0;this.end=Infinity;this.action='read';}
 select(value){this.selection=value;return this;} eq(k,v){if(this.table==='publications'&&k.startsWith('publication_departures.'))this.embedded.push(d=>path(d,k.slice(23))===v);else this.filters.push(r=>path(r,k)===v);return this;}
 in(k,v){this.filters.push(r=>v.includes(path(r,k)));return this;} neq(k,v){this.filters.push(r=>path(r,k)!==v);return this;}
 gt(k,v){if(this.table==='publications'&&k.startsWith('publication_departures.'))this.embedded.push(d=>path(d,k.slice(23))>v);else this.filters.push(r=>path(r,k) instanceof Date ? path(r,k).getTime()>Date.parse(v) : path(r,k)>v);return this;} order(k,{ascending=true}={}){this.orders.push([k,ascending]);return this;}
 range(a,b){this.offset=a;this.end=b+1;return this;} limit(n){this.end=n;return this;}
 update(values){this.action='update';this.values=values;return this;} delete(){this.action='delete';return this;}
 maybeSingle(){this.singleRow=true;return this;} single(){this.singleRow=true;return this;}
 then(resolve,reject){return this.run().then(resolve,reject);}
 async run(){try{
  let rows=(await db.query(`select * from public.${this.table}`)).rows;
  if(['reservations','publications','publication_departures'].includes(this.table)){
   const tables={};for(const name of ['profiles','agencies','publications','publication_departures'])tables[name]=(await db.query(`select * from public.${name}`)).rows;
   const pub=p=>p?{...p,agencies:tables.agencies.find(a=>a.id===p.agency_id),publication_departures:tables.publication_departures.filter(d=>d.publication_id===p.id).filter(d=>this.embedded.every(f=>f(d)))}:null;
   rows=rows.map(r=>this.table==='reservations'?{...r,profiles:tables.profiles.find(p=>p.id===r.passenger_id),publication_departures:(()=>{const d=tables.publication_departures.find(d=>d.id===r.departure_id);return d?{...d,publications:pub(tables.publications.find(p=>p.id===d.publication_id))}:null;})()}:this.table==='publication_departures'?{...r,publications:pub(tables.publications.find(p=>p.id===r.publication_id))}:pub(r));
  }
  // Embedded filters apply to children in a left embed, to the root with !inner.
  rows=rows.filter(r=>this.filters.every(f=>f(r)));
  rows.sort((a,b)=>{for(const[k,asc]of this.orders){const x=path(a,k),y=path(b,k);if(x!==y)return (x<y?-1:1)*(asc?1:-1);}return 0;});
  rows=rows.slice(this.offset,this.end);
  if(this.action!=='read')for(const r of rows){if(this.action==='delete')await db.query(`delete from public.${this.table} where id=$1`,[r.id]);else{const keys=Object.keys(this.values);await db.query(`update public.${this.table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1}`,[...Object.values(this.values),r.id]);}}
  return {data:this.singleRow?(rows[0]??null):rows,error:null};
 }catch(e){return {data:null,error:e};}}
}
function path(row,key){let x=row;for(const k of key.split('.')){if(Array.isArray(x))return x.some(v=>path(v,key.split('.').slice(key.split('.').indexOf(k)).join('.')));x=x?.[k];}return x;}
globalThis.qaAdmin={from:t=>new Query(t),rpc:async(name,args={})=>{try{let result;if(name==='mark_elapsed_reservations_past'){await db.query('select public.mark_elapsed_reservations_past()');result=null;}else if(name==='create_reservation')result=(await db.query('select * from public.create_reservation($1,$2,$3)',[args.p_passenger_id,args.p_departure_id,args.p_number_of_people])).rows[0];else if(name==='update_reservation_party_size')result=(await db.query('select * from public.update_reservation_party_size($1,$2)',[args.p_reservation_id,args.p_number_of_people])).rows[0];else throw Error(`Unexpected RPC ${name}`);return{data:result,error:null};}catch(error){return{data:null,error};}}};
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,full_name text default 'QA',email text default 'qa@example.invalid',phone text);
 create table agencies(id uuid primary key,owner_user_id uuid,commercial_name text default 'QA',phone text,email text,status text default 'APPROVED');
 create table publications(id uuid primary key,agency_id uuid,title text default 'QA',description text,destination text,meeting_point text,service_type text default 'EXCURSION',price_per_person numeric default 100,status text default 'APPROVED',created_at timestamptz default now());
 create table publication_departures(id uuid primary key,publication_id uuid,start_at timestamptz,capacity integer,status text default 'ACTIVE');
 create function public.set_updated_at() returns trigger language plpgsql as $$begin NEW.updated_at=now();return NEW;end;$$;`);
 await db.exec(await readFile(new URL('../../supabase/migrations/202609220002_reservations.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/202610050001_reservation_retries.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../docs/sql/reservations-auto-confirm.sql',import.meta.url),'utf8'));
});
after(()=>db.close());
beforeEach(async()=>{
 await db.exec('truncate reservations,profiles,agencies,publications,publication_departures cascade');
 for(const actor of Object.values(ids).slice(0,5))await db.query('insert into profiles(id) values($1)',[actor]);
 await db.query('insert into agencies(id,owner_user_id) values($1,$2)',[ids.agency,ids.owner]);
 await db.query('insert into publications(id,agency_id) values($1,$2)',[ids.pub,ids.agency]);
 await db.query("insert into publication_departures(id,publication_id,start_at,capacity) values($1,$2,now()+interval '7 days',3)",[ids.dep,ids.pub]);
});
async function request(path,method='GET',body,user='a',headers={}){
 const url=new URL(path,'http://qa.invalid');const req=new Request(url,{method,headers:{origin:url.origin,...(user?{'x-test-user':ids[user]}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const handler=path.startsWith('/api/catalog')?catalog: /^\/api\/reservations\//.test(path)?detail:collection;
 const response=await handler[method](req,{params:Promise.resolve({id:url.pathname.split('/')[3]})});
 return{status:response.status,body:await response.json()};
}
const reserve=(user='a',people=1)=>request('/api/reservations','POST',{departureId:ids.dep,numberOfPeople:people},user);
for(const role of ['a','b','owner','outside','admin'])test(`rol ${role}: reserva confirmada y precio del servidor`,async()=>{const r=await reserve(role);assert.equal(r.status,201);assert.equal(r.body.data.passengerId,ids[role]);assert.equal(r.body.data.total,100);assert.equal(r.body.data.status,'CONFIRMED');});
test('flujo completo: solicitar, prioridad, confirmar, cancelar, liberar y volver a reservar',async()=>{const a=await reserve('a',2);assert.equal((await reserve('b',2)).status,400);let panel=await request('/api/reservations','GET',undefined,'owner');assert.equal(panel.body.data.length,1);assert.equal(a.body.data.status,'CONFIRMED');assert.equal((await request('/api/reservations?scope=mine','GET')).body.data[0].status,'CONFIRMED');assert.equal((await request(`/api/reservations/${a.body.data.id}`,'PATCH',{status:'CANCELLED'})).status,200);assert.equal((await reserve('b',3)).status,201);assert.equal((await reserve('a')).status,400);});
test('otro usuario no queda bloqueado por una reserva ajena',async()=>{await reserve('a');const b=await reserve('b');assert.equal(b.status,201);assert.equal((await request('/api/reservations?scope=mine','GET',undefined,'b')).body.data.length,1);});
test('reintento del mismo usuario devuelve la misma reserva sin restar cupos dos veces',async()=>{const a=await reserve('a',2),retry=await reserve('a',2);assert.equal(a.body.data.id,retry.body.data.id);assert.equal((await db.query('select sum(number_of_people)::int as n from reservations')).rows[0].n,2);});
test('dos envios simultaneos del mismo usuario ejecutan SQL sin duplicar',async()=>{const r=await Promise.all([reserve(),reserve()]);assert.equal(r[0].body.data.id,r[1].body.data.id);assert.equal((await db.query('select count(*)::int n from reservations')).rows[0].n,1);});
test('ultimo cupo: dos pasajeros simultaneos no sobrepasan capacidad',async()=>{await db.query('update publication_departures set capacity=1');const r=await Promise.all([reserve('a'),reserve('b')]);assert.deepEqual(r.map(x=>x.status).sort(),[201,400]);});
test('cancelar permite reservar nuevamente la misma salida',async()=>{const r=await reserve();await request(`/api/reservations/${r.body.data.id}`,'PATCH',{status:'CANCELLED'});assert.equal((await reserve()).status,201);assert.equal((await db.query('select count(*)::int n from reservations')).rows[0].n,2);});
for(const people of [0,-1,1.5,'2',null,2147483648,Number.MAX_SAFE_INTEGER+1])test(`personas invalidas: ${people}`,async()=>{assert.equal((await reserve('a',people)).status,400);});
test('sin sesion no puede crear ni listar',async()=>{assert.equal((await reserve(null)).status,401);assert.equal((await request('/api/reservations','GET',undefined,null)).status,401);});
test('origen ajeno bloqueado',async()=>{assert.equal((await request('/api/reservations','POST',{departureId:ids.dep,numberOfPeople:1},'a',{origin:'https://evil.invalid'})).status,403);});
for(const extra of [{passengerId:ids.b},{unitPrice:1},{status:'CONFIRMED'},{publicationId:ids.pub}])test(`manipulacion ${Object.keys(extra)}`,async()=>{assert.equal((await request('/api/reservations','POST',{departureId:ids.dep,numberOfPeople:1,...extra})).status,400);});
test('JSON incorrecto tiene error de usuario, no error interno',async()=>{assert.equal((await request('/api/reservations','POST','{bad')).status,400);});
for(const change of ["start_at=now()-interval '1 second'","start_at=now()","status='CANCELLED'","status='COMPLETED'"])test(`salida no reservable: ${change}`,async()=>{await db.exec(`update publication_departures set ${change}`);assert.equal((await reserve()).status,400);});
for(const table of ['publications','agencies'])test(`${table} sin aprobacion bloquea alta`,async()=>{await db.exec(`update ${table} set status='PENDING'`);assert.ok([400,409].includes((await reserve()).status));});
test('nadie ajeno lee ni cancela ni confirma; proveedor pasajero no se autoconfirma',async()=>{const r=await reserve('outside');const url=`/api/reservations/${r.body.data.id}`;assert.equal((await request(url,'GET',undefined,'b')).status,404);assert.equal((await request(url,'PATCH',{status:'CONFIRMED'},'outside')).status,403);assert.equal((await request(url,'PATCH',{status:'CANCELLED'},'b')).status,404);assert.equal((await request(url,'PATCH',{status:'CONFIRMED'},'owner')).status,400);});
test('confirmar dos veces y cancelar dos veces rechazados',async()=>{const r=await reserve(),url=`/api/reservations/${r.body.data.id}`;assert.equal((await request(url,'PATCH',{status:'CONFIRMED'},'owner')).status,400);assert.equal((await request(url,'PATCH',{status:'CONFIRMED'},'owner')).status,400);assert.equal((await request(url,'PATCH',{status:'CANCELLED'})).status,200);assert.equal((await request(url,'PATCH',{status:'CANCELLED'})).status,400);});
test('solicitud pasada queda historica; no puede confirmarse ni cancelarse',async()=>{const r=await reserve(),url=`/api/reservations/${r.body.data.id}`;await db.exec("update publication_departures set start_at=now()-interval '1 day'");assert.equal((await request(url,'PATCH',{status:'CONFIRMED'},'owner')).status,400);assert.equal((await request(url,'PATCH',{status:'CANCELLED'})).status,400);});
test('el administrador recibe las mas antiguas primero',async()=>{const a=await reserve('a'),b=await reserve('b');await db.query("update reservations set created_at=now()-interval '1 day' where id=$1",[a.body.data.id]);assert.deepEqual((await request('/api/reservations','GET',undefined,'admin')).body.data.map(r=>r.id),[a.body.data.id,b.body.data.id]);});
test('cantidad se actualiza con cupo y rechaza exceso sin alterar la reserva',async()=>{const a=await reserve('a');await reserve('b');const url=`/api/reservations/${a.body.data.id}`;assert.equal((await request(url,'PATCH',{numberOfPeople:2})).status,200);assert.equal((await request(url,'PATCH',{numberOfPeople:3})).status,400);assert.equal((await request(url)).body.data.numberOfPeople,2);});

test('cancelacion de la salida impide confirmar una solicitud existente',async()=>{const r=await reserve();await db.exec("update publication_departures set status='CANCELLED'");assert.equal((await request(`/api/reservations/${r.body.data.id}`,'PATCH',{status:'CONFIRMED'},'owner')).status,400);});
test('cambio combinado se rechaza sin mutacion parcial',async()=>{const r=await reserve();assert.equal((await request(`/api/reservations/${r.body.data.id}`,'PATCH',{numberOfPeople:2,status:'CANCELLED'})).status,400);assert.equal((await request(`/api/reservations/${r.body.data.id}`)).body.data.numberOfPeople,1);});
test('catalogo conserva servicios sin fechas y deja salidas pasadas fuera',async()=>{await db.exec("update publication_departures set start_at=now()-interval '1 day'");assert.equal((await request('/api/catalog')).body.data[0].departures.length,0);const p=await request(`/api/catalog?id=${ids.pub}`);assert.equal(p.body.data.length,1);assert.equal(p.body.data[0].departures.length,0);});
test('consultas personales de Admin no incluyen viajeros ajenos',async()=>{await reserve('a');await reserve('admin');const r=await request('/api/reservations?scope=mine','GET',undefined,'admin');assert.equal(r.body.data.length,1);assert.equal(r.body.data[0].passengerId,ids.admin);});
test('SQL comprueba agencia aprobada al momento de crear',async()=>{await db.exec("update agencies set status='PENDING'");await assert.rejects(db.query('select * from public.create_reservation($1,$2,1)',[ids.a,ids.dep]));});

test('fechas del listado descuentan solicitudes pendientes y liberan cancelaciones',async()=>{await reserve('a');let dates=await publicationDepartures(globalThis.qaAdmin,[ids.pub]);assert.equal(dates.length,1);assert.equal(dates[0].available,2);const r=await request('/api/reservations?scope=mine');await request(`/api/reservations/${r.body.data[0].id}`,'PATCH',{status:'CANCELLED'});dates=await publicationDepartures(globalThis.qaAdmin,[ids.pub]);assert.equal(dates[0].available,3);});
test('fechas del listado excluyen salidas vencidas y canceladas',async()=>{await db.exec("update publication_departures set start_at=now()-interval '1 day'");assert.deepEqual(await publicationDepartures(globalThis.qaAdmin,[ids.pub]),[]);});

test("legacy upcoming pending converts to persisted confirmed; history stays unchanged",async()=>{const r=await reserve();await db.query("update reservations set status='PENDING' where id=$1",[r.body.data.id]);const listed=await request("/api/reservations?scope=mine");assert.equal(listed.body.data[0].status,"CONFIRMED");assert.equal((await db.query("select status from reservations where id=$1",[r.body.data.id])).rows[0].status,"CONFIRMED");});

test("old database RPC also persists immediate confirmation",async()=>{await db.exec(await readFile(new URL("../../supabase/migrations/202610050001_reservation_retries.sql",import.meta.url),"utf8"));try{const r=await reserve();assert.equal(r.body.data.status,"CONFIRMED");assert.equal((await db.query("select status from reservations where id=$1",[r.body.data.id])).rows[0].status,"CONFIRMED");}finally{await db.exec(await readFile(new URL("../../docs/sql/reservations-auto-confirm.sql",import.meta.url),"utf8"));}});
