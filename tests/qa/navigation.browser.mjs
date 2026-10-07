import {chromium} from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let passed=0;const failures=[];
for(const role of ['Admin','Viajero','Agencia','Transporte']){
 const context=await browser.newContext();const page=await context.newPage();const errors=[];const requests={};let documents=0;let logged=true;const timings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents++;});
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();if(u.pathname.startsWith('/api/')){requests[u.pathname]=(requests[u.pathname]??0)+1;await new Promise(r=>setTimeout(r,100));if(u.pathname==='/api/auth/logout'){logged=false;return route.fulfill({json:{data:null}});}if(u.pathname==='/api/auth/session'&&!logged)return route.fulfill({status:401,json:{error:'Sin sesión'}});if(u.pathname==='/api/auth/session')return route.fulfill({json:{data:{user:{id:'11111111-1111-4111-8111-111111111111',role,status:'Activo',name:'Persona QA',email:'qa@example.invalid',phone:'88888888'},session:{userId:'11111111-1111-4111-8111-111111111111',expiresAt:new Date(Date.now()+86400000).toISOString(),idleExpiresAt:new Date(Date.now()+3600000).toISOString()}}}});return route.fulfill({json:{data:[],total:0}});}return route.continue();});
 async function clickAndWait(locator,path){const start=performance.now();await locator.click();await page.waitForURL(url=>url.pathname+url.search===path);await page.waitForTimeout(250);timings.push({path,milliseconds:Math.round(performance.now()-start)});}
 try{
  await page.goto('http://localhost:3000/');await page.getByRole('link',{name:'Mi cuenta',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Ingresar',exact:true}).count(),0);
  if(role==='Viajero'){
   for(const label of ['Guardados','Mis reservas','Guardados']){await page.getByRole('button',{name:'Mi viaje',exact:true}).click();await clickAndWait(page.getByRole('menuitem',{name:label,exact:true}),`/?viaje=${label==='Mis reservas'?'reservas':label.toLowerCase()}`);}
   assert.equal(requests['/api/traveler/saved'],1);await clickAndWait(page.getByRole('link',{name:'Mi cuenta',exact:true}),'/?viaje=perfil');
  }else{
   await clickAndWait(page.getByRole('link',{name:'Mi cuenta',exact:true}),'/dashboard');
   const paths=role==='Admin'?['users','agencies','publications','reservations','users']:['publications','reservations','publications'];
   for(const path of paths)await clickAndWait(page.locator(`a[href="/dashboard/${path}"]`).first(),`/dashboard/${path}`);
   if(role==='Admin')assert.equal(requests['/api/admin/users'],1);
   await clickAndWait(page.getByRole('link',{name:/Ver sitio web/}),'/');await page.getByRole('link',{name:'Mi cuenta',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Ingresar',exact:true}).count(),0);
  }
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.getByRole('link',{name:'Ingresar',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Mi cuenta',exact:true}).count(),0);assert.equal(requests['/api/auth/logout'],1);assert.deepEqual(errors,[]);assert.equal(requests['/api/auth/session'],1);assert.equal(documents,1,'navegación sin recargar el documento ni volver a validar la sesión');passed++;console.log('PASS '+role+' '+JSON.stringify({documents,requests,timings}));
 }catch(e){failures.push(role);console.log('FAIL '+role+' '+e.message+' '+JSON.stringify({documents,requests,errors}));}
 await context.close();
}
await browser.close();console.log(JSON.stringify({passed,failed:failures.length}));process.exitCode=failures.length?1:0;
