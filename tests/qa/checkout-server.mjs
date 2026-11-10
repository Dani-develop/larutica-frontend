// Loopback-only development harness. Actual API/services/SQL, simulated session and Onvo.
import {createServer} from 'node:http';
import {createDatabase,ids} from '../mail/database.mjs';
import * as checkouts from '../../app/api/checkouts/route.ts';
import * as checkoutDetail from '../../app/api/checkouts/[id]/route.ts';
import * as payment from '../../app/api/checkouts/[id]/payment/route.ts';
import * as confirm from '../../app/api/checkouts/[id]/payment/confirm/route.ts';
import * as reservations from '../../app/api/reservations/route.ts';
import * as reservationDetail from '../../app/api/reservations/[id]/route.ts';
import {publicationDepartures} from '../../lib/traveler/availability.ts';
import {createCheckout} from '../../lib/booking/checkouts.ts';
import {startCheckoutPayment,confirmCheckoutPayment} from '../../lib/payments/checkout.ts';
const fixture=await createDatabase();await fixture.reset();
globalThis.mailTestAdmin=fixture.admin;globalThis.mailTestActors={[ids.traveler]:'Viajero',[ids.second]:'Viajero',[ids.owner]:'Agencia',[ids.admin]:'Admin'};
process.env.LARUTICA_REMOTE_API_ORIGIN='';process.env.ONVO_TEST_API_KEY='onvo_test_secret_key_qa';process.env.ONVO_PUBLISHABLE_KEY='onvo_test_publishable_key_qa';
for(const key of Object.keys(process.env))if(/^(SMTP_|MAIL_)/.test(key))delete process.env[key];
let intents=new Map(),next=0;
globalThis.fetch=async(url,init={})=>{if(new URL(url).hostname!=='api.onvopay.com')throw Error('External network forbidden');const path=new URL(url).pathname,body=init.body?JSON.parse(init.body):{};
if(path==='/v1/payment-intents'&&init.method==='POST'){const intent={id:'pi_qa_'+ ++next,status:'requires_payment_method',...body};intents.set(intent.id,intent);return Response.json(intent);}
if(path.startsWith('/v1/payment-intents/'))return Response.json(intents.get(path.split('/').pop()));
if(path==='/v1/refunds')return Response.json({id:'re_qa_'+ ++next,status:'pending'});throw Error('Unexpected simulated provider operation');};
const server=createServer(async(req,res)=>{try{let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://127.0.0.1:4188'),actor=req.headers['x-qa-actor']??'traveler';let response;
if(url.pathname==='/__qa/reset'){await fixture.reset();intents=new Map();next=0;response=Response.json({ok:true});}
else if(url.pathname==='/__qa/succeed'){intents.get(body.id).status='succeeded';response=Response.json({ok:true});}
else if(url.pathname==='/__qa/expire'){await fixture.db.exec("update reservation_checkouts set expires_at=now()-interval '1 minute'");response=Response.json({ok:true});}
else if(url.pathname==='/__qa/state')response=Response.json({reservations:(await fixture.db.query('select id,status,number_of_people from reservations')).rows,checkouts:(await fixture.db.query('select id,status,number_of_people from reservation_checkouts')).rows,intents:[...intents.values()]});
else if(url.pathname==='/__qa/seed-paid'){const c=await createCheckout(fixture.admin,ids.traveler,ids.departure,2),p=await startCheckoutPayment(fixture.admin,c);intents.get(p.paymentIntentId).status='succeeded';response=Response.json(await confirmCheckoutPayment(fixture.admin,c,p.paymentIntentId));}
else if(url.pathname==='/api/auth/session')response=actor==='anonymous'?Response.json({error:'No session'},{status:401}):Response.json({data:{session:{userId:ids[actor],expiresAt:'2099-01-01T00:00:00Z',idleExpiresAt:'2099-01-01T00:00:00Z'},user:{id:ids[actor],role:globalThis.mailTestActors[ids[actor]],name:'Usuario QA',email:'qa@example.invalid',status:'Activo'}}});
else if(url.pathname==='/api/catalog')response=Response.json({data:[{id:ids.publication,title:'Excursión QA Arenal',description:'Prueba aislada',destination:'La Fortuna',serviceType:'EXCURSION',price:40,duration:180,image:'/playa.jpg',included:'Transporte',notIncluded:'Comidas',meetingPoint:'Parque central',agency:'Agencia QA',promoted:false,departures:await publicationDepartures(fixture.admin,[ids.publication])}]});
else if(url.pathname.startsWith('/api/checkouts')||url.pathname.startsWith('/api/reservations')){const parts=url.pathname.split('/'),handler=parts[2]==='checkouts'?(parts[5]==='confirm'?confirm:parts[4]==='payment'?payment:parts[3]?checkoutDetail:checkouts):parts[3]?reservationDetail:reservations;const request=new Request(url,{method:req.method,headers:{origin:url.origin,'content-type':'application/json','x-test-user':ids[actor]??''},body:['GET','HEAD'].includes(req.method)?undefined:raw||undefined});response=await handler[req.method](request,{params:Promise.resolve({id:parts[3]})});}
else response=Response.json({data:[]});
res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){console.error(error);res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}});
server.listen(4188,'127.0.0.1',()=>console.log('Isolated checkout API listening on 4188'));
process.on('SIGTERM',()=>server.close(()=>fixture.db.close()));
