import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createTransport } from 'nodemailer';
import { callMailRelay, deliverMail, readMailConfig } from '../../lib/mail/send.ts';
import { notifyReservationCreated, notifyDepartureCancellations, notifyPublicationDecision } from '../../lib/mail/notify.ts';
import { createMailRelay } from '../../supabase/functions/mail-relay/handler.mjs';
import { createSmtp } from './smtp.mjs';
const token='relay-test-token-exclusive-to-local-tests';
const tokenHash=createHash('sha256').update(token).digest('hex');
const env={SMTP_HOST:'smtp.gmail.com',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'aguero2609@gmail.com',SMTP_PASS:'test-password',MAIL_FROM:'LaRutica <aguero2609@gmail.com>',
  SUPABASE_URL:'https://test-project.supabase.co',MAIL_RELAY_URL:'https://test-project.supabase.co/functions/v1/mail-relay',MAIL_RELAY_TOKEN:token};
const message={to:'recipient@example.invalid',subject:'Prueba',text:'Prueba en español ₡'};
const bridge=handler=>async(url,options)=>handler(new Request(url,options));
const request=(body,authorization='Bearer '+token)=>new Request(env.MAIL_RELAY_URL,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify(body)});

test('relay autentica antes de abrir SMTP y bloquea credenciales y mensajes inválidos',async()=>{
  let called=0;const handler=createMailRelay({tokenHash,createTransport(){called++;throw new Error('must not connect');}});
  assert.equal((await handler(request({},'Bearer wrong'))).status,401);
  assert.equal((await handler(request({operation:'send',smtp:{user:'other@example.invalid',pass:'password'},message}))).status,400);
  assert.equal((await handler(request({operation:'send',smtp:{user:env.SMTP_USER,pass:'password'},message:{...message,subject:'Header\r\nBcc: attacker'}}))).status,400);
  assert.equal((await handler(request({operation:'verify',smtp:{user:env.SMTP_USER,pass:'x'.repeat(70000)}}))).status,413);
  assert.equal(called,0);
});
test('relay exige HTTPS, proyecto correcto y configuración completa sin intentar SMTP local',async()=>{
  for(const invalid of [{MAIL_RELAY_URL:'http://test-project.supabase.co/functions/v1/mail-relay'},
    {MAIL_RELAY_URL:'https://other.supabase.co/functions/v1/mail-relay'}, {MAIL_RELAY_TOKEN:''},
    {MAIL_RELAY_URL:'https://test-project.supabase.co/functions/v1/mail-relay?x=1'}]){
    let calls=0;const result=await deliverMail(message,{env:{...env,...invalid},fetch:async()=>{calls++;},createTransport(){throw new Error('must not fall back');}});
    assert.equal(result.status,'failed');assert.equal(calls,0);
  }
});
test('relay no presenta respuestas incompletas o destinatarios rechazados como éxito',async()=>{
  for(const body of [{},{result:{status:'sent'}},{result:{status:'failed',code:'SMTP_RECIPIENT_REJECTED'}}]){
    const result=await deliverMail(message,{env,fetch:async()=>Response.json(body)});
    assert.equal(result.status,'failed');
  }
});
test('relay conserva fallos SMTP sin exponer claves y no reintenta un envío ambiguo',async()=>{
  let calls=0;const handler=createMailRelay({tokenHash,createTransport:()=>({sendMail:async()=>{calls++;throw Object.assign(new Error('secret-password raw SMTP response'),{code:'EAUTH',responseCode:535,command:'AUTH PLAIN'});},close(){}})});
  const result=await deliverMail(message,{env,fetch:bridge(handler)});
  assert.equal(result.code,'EAUTH');assert.equal(result.responseCode,535);assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(result),/secret-password|test-password/);
});
test('cinco notificadores cruzan el relay HTTPS y llegan a SMTP TLS real; verify no envía',async()=>{
  const key=await readFile(new URL('./fixtures/localhost-key.pem',import.meta.url));
  const cert=await readFile(new URL('./fixtures/localhost-cert.pem',import.meta.url));
  const smtp=await createSmtp({secure:true,key,cert});
  const handler=createMailRelay({tokenHash,createTransport:options=>{
    assert.equal(options.host,'smtp.gmail.com');assert.equal(options.port,465);assert.equal(options.secure,true);
    assert.equal(options.auth.user,env.SMTP_USER);
    return createTransport({...options,host:'127.0.0.1',port:Number(smtp.env.SMTP_PORT),auth:{user:'test-user',pass:'test-password'},tls:{ca:cert,servername:'localhost'}});
  }});
  const fetcher=bridge(handler);
  try{
    assert.deepEqual(await callMailRelay('verify',readMailConfig(env),env,undefined,fetcher),{verified:true});
    assert.equal(smtp.received.length,0);
    const send=async message=>{const result=await deliverMail(message,{env,fetch:fetcher});assert.equal(result.status,'sent');return result;};
    const facts={id:'00000001-0000-4000-8000-000000000000',publicationTitle:'Prueba relay',departureStartAt:'2099-06-15T15:00:00.000Z',numberOfPeople:2,total:80,passengerName:'Prueba',passengerEmail:message.to,agencyEmail:message.to};
    await notifyReservationCreated(facts,true,send);
    await notifyDepartureCancellations([facts],send);
    for(const status of ['APPROVED','REJECTED'])await notifyPublicationDecision({previousStatus:'PENDING',status,title:facts.publicationTitle,agencyEmail:message.to},send);
    assert.equal(smtp.received.length,5);assert.ok(smtp.received.every(item=>item.to[0]===message.to));
  }finally{await smtp.close();}
});
