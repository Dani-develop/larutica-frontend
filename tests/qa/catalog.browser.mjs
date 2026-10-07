import {chromium} from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const id='77777777-7777-4777-8777-777777777777';
const item={id,title:'Servicio real QA',description:'Experiencia publicada',destination:'Nosara',serviceType:'EXCURSION',price:20,duration:240,image:null,agency:'Mundo Viajero Costa Rica',included:'Guía',notIncluded:'Comidas',meetingPoint:'Centro',departures:[{id:'88888888-8888-4888-8888-888888888888',startAt:'2030-01-12T14:00:00Z',available:3}]};
for (const logged of [false,true]) {
  const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);
  let catalogRequests=0,savedFinished=false;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    if(u.pathname==='/api/auth/session')return route.fulfill(logged?{json:{data:{user:{id:'a',role:'Viajero',status:'Activo',name:'Persona QA'},session:{userId:'a',expiresAt:new Date(Date.now()+86400000).toISOString(),idleExpiresAt:new Date(Date.now()+3600000).toISOString()}}}}:{status:401,json:{error:'Sin sesión'}});
    if(u.pathname==='/api/catalog'){catalogRequests++;await new Promise(r=>setTimeout(r,150));return route.fulfill({json:{data:[item]}});}
    if(u.pathname==='/api/traveler/saved'){assert.equal(u.searchParams.get('ids'),'1');await new Promise(r=>setTimeout(r,4000));savedFinished=true;return route.fulfill({json:{data:[]}});}
    if(u.pathname.startsWith('/api/'))throw Error('Consulta adicional no esperada: '+u.pathname);
    return route.continue();
  });
  await page.goto('http://localhost:3000/');
  await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
  assert.equal(savedFinished,false,'Los servicios deben mostrarse sin esperar a Guardados');
  assert.equal(await page.getByRole('heading',{name:'Bosque nuboso de Monteverde'}).count(),0);
  assert.equal(await page.locator('.experience-card .trip-actions a').count(),1);
  assert.equal(await page.locator('.experience-card .trip-actions a').getAttribute('href'),`/experiencias/${id}`);
  await page.getByRole('button',{name:'Transporte',exact:true}).click();
  await page.getByText('No encontramos viajes con esa búsqueda.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();
  await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
  if(logged){
    await page.getByRole('button',{name:'Explorar',exact:true}).click();
    await page.waitForURL(url => url.pathname === '/' && !url.search);
    await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
    assert.equal(catalogRequests,1,'Ambas secciones reutilizan el mismo catálogo');
    assert.equal(await page.getByRole('heading',{name:'Costa Rica, más cerca de lo que imaginas.',exact:true}).count(),1);
    await page.getByRole('button',{name:'Mi viaje',exact:true}).click();
    await page.getByRole('menuitem',{name:'Mi perfil',exact:true}).click();
    await page.waitForURL('**/?viaje=perfil');
    await page.getByRole('button',{name:'Explorar',exact:true}).click();
    await page.waitForURL(url => url.pathname === '/' && !url.search);
    await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS ${logged?'viajero':'visitante'}: catálogo real, filtros, una acción y Guardados independiente; ${catalogRequests} consulta(s) de catálogo`);
  await context.close();
}
await browser.close();
