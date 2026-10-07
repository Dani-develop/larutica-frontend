import {chromium} from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const id='11111111-1111-4111-8111-111111111111';
const user=role=>({id,name:'Persona QA',email:'qa@example.invalid',phone:'88888888',businessName:'Agencia QA',status:'Activo',role,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
async function paths(dir='app',base=''){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='api')continue;if(e.isDirectory())out.push(...await paths(`${dir}/${e.name}`,`${base}/${e.name==='[id]'?id:e.name}`));else if(e.name==='page.tsx')out.push(base||'/');}return out;}
const all=await paths();const results=[];
for(const role of [null,'Admin','Viajero','Agencia','Transporte']){
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(10000);let errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return route.abort();if(u.pathname.startsWith('/api/')){if(u.pathname==='/api/auth/session')return route.fulfill(role?{json:{data:{user:user(role),session:{userId:id,expiresAt:new Date(Date.now()+86400000).toISOString(),idleExpiresAt:new Date(Date.now()+3600000).toISOString()}}}}:{status:401,json:{error:'Sin sesión'}});return route.fulfill({json:{data:[],total:0}});}return route.continue();});
 const targets=role==='Admin'?all.filter(p=>p.startsWith('/dashboard')):role===null?all.filter(p=>!p.startsWith('/dashboard')):role==='Viajero'?['/?viaje=explorar','/?viaje=guardados','/?viaje=reservas','/?viaje=perfil','/dashboard/profile']:['/dashboard','/dashboard/my-agency','/dashboard/my-agency/new','/dashboard/publications','/dashboard/publications/new','/dashboard/reservations','/dashboard/profile'];
 for(const path of targets){errors=[];try{const response=await page.goto('http://localhost:3000'+path);await page.waitForFunction(()=>Array.from(document.querySelectorAll('button,a')).some(node=>Object.keys(node).some(key=>key.startsWith('__reactProps'))));await page.waitForTimeout(400);if(response.status()>=500)errors.push('HTTP '+response.status());if(await page.locator('vite-error-overlay').count())errors.push('Vite error overlay');if(!(await page.locator('body').innerText()).trim())errors.push('Pantalla vacía');}catch(e){errors.push(e.message);}results.push({role:role??'visitante',path,errors:[...errors]});console.log(`${errors.length?'FAIL':'PASS'} ${role??'visitante'} ${path}${errors.length?' '+errors.join(' | '):''}`);}
 await context.close();
}
await browser.close();console.log(JSON.stringify({passed:results.filter(r=>!r.errors.length).length,failed:results.filter(r=>r.errors.length).length,failures:results.filter(r=>r.errors.length)},null,2));process.exitCode=results.some(r=>r.errors.length)?1:0;
