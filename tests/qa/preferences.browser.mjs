import {chromium} from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const id='77777777-7777-4777-8777-777777777777';
const item={id,title:'Servicio QA original',description:'Descripción del proveedor',destination:'Nosara',serviceType:'EXCURSION',price:20,duration:240,image:null,agency:'Proveedor QA',included:'Guía',notIncluded:'Comidas',meetingPoint:'Centro',departures:[{id:'88888888-8888-4888-8888-888888888888',startAt:'2030-01-12T14:00:00Z',available:3}]};
for(const {failed,logged} of [{failed:false,logged:false},{failed:true,logged:false},{failed:false,logged:true}]){
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);
 let catalogs=0,fx=0;const posts=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
  if(u.pathname==='/api/auth/session')return route.fulfill(logged?{json:{data:{user:{id:'qa-user',role:'Viajero',status:'Activo',name:'Persona QA'},session:{userId:'qa-user',expiresAt:new Date(Date.now()+86400000).toISOString(),idleExpiresAt:new Date(Date.now()+3600000).toISOString()}}}}:{status:401,json:{error:'Sin sesión'}});
  if(u.pathname==='/api/traveler/saved')return route.fulfill({json:{data:[]}});
  if(u.pathname==='/api/reservations'){if(route.request().method()==='POST'){const payload=route.request().postDataJSON();posts.push(payload);return route.fulfill({status:201,json:{data:{id:'reservation-qa',publicationId:id,publicationTitle:item.title,departureStartAt:item.departures[0].startAt,departureId:item.departures[0].id,passengerId:'qa-user',numberOfPeople:1,unitPrice:20,total:20,status:'PENDING'}}});}return route.fulfill({json:{data:[]}});}
  if(u.pathname==='/api/catalog'){catalogs++;return route.fulfill({json:{data:[item]}});}
  if(u.pathname==='/api/exchange-rates'){fx++;return route.fulfill(failed?{status:503,json:{error:'Unavailable'}}:{json:{data:{date:new Date().toISOString().slice(0,10),fetchedAt:Date.now(),rates:{USD:1,CRC:500,EUR:0.9}}}});}
  if(u.pathname.startsWith('/api/'))throw Error('Unexpected API '+u.pathname);
  return route.continue();
 });
 await page.goto('http://localhost:3000/');await page.getByRole('heading',{name:item.title}).waitFor();
 const before=catalogs;await page.getByRole('button',{name:'Selecciona tu idioma',exact:true}).click();
 await page.getByRole('radio',{name:'English'}).click();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.getByRole('heading',{name:'Experiences for your next trip'}).waitFor();
 assert.equal(await page.getByText(item.description,{exact:true}).count(),1,'Provider content is preserved');
 assert.equal(await page.getByRole('button',{name:'Choose your language',exact:true}).evaluate(e=>e===document.activeElement),true,'Focus returns to trigger');
 await page.getByRole('button',{name:'Choose your currency: USD'}).click();
 if(failed){
  await page.getByText('Exchange rates are unavailable. Prices are still available in USD.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('radio',{name:'Costa Rican colón (CRC)'}).isDisabled(),true);
  await page.keyboard.press('Escape');assert.match(await page.locator('.card-footer strong').innerText(),/USD/);
 }else{
  await page.getByRole('radio',{name:'Costa Rican colón (CRC)'}).click();
  assert.match(await page.locator('.card-footer strong').innerText(),/≈ CRC\s*10,000\.00/);
  await page.getByRole('button',{name:'Choose your currency: CRC'}).click();await page.getByRole('radio',{name:'Euro (EUR)'}).click();
  assert.match(await page.locator('.card-footer strong').innerText(),/≈ EUR\s*18\.00/);
  assert.equal(catalogs,before,'Preference changes do not refetch catalog');assert.equal(fx,1,'Rates reused');
  await page.reload();await page.getByRole('heading',{name:item.title}).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.match(await page.locator('.card-footer strong').innerText(),/EUR/);assert.equal(fx,1,'Cached rates survive reload');
  await page.getByRole('link',{name:'View dates and book'}).click();
  await page.getByRole('button',{name:'Review request'}).waitFor();
  await page.getByRole('button',{name:'Review request'}).click();
  if(!logged)await page.getByRole('link',{name:'Sign in to book'}).waitFor();
  else await page.getByRole('button',{name:'Send reservation request'}).waitFor();
  assert.match(await page.locator('.booking-total').innerText(),/EUR\s*18\.00/);
  assert.match(await page.locator('.preference-rate-note').innerText(),/USD\s*20\.00/,'Original USD amount remains visible');
  if(logged){await page.getByRole('button',{name:'Send reservation request'}).click();await page.getByRole('heading',{name:'Request sent'}).waitFor();assert.equal(posts.length,1);assert.equal(posts[0].numberOfPeople,1);assert.equal(posts[0].departureId,item.departures[0].id);assert.equal(Object.hasOwn(posts[0],'currency'),false);assert.equal(Object.hasOwn(posts[0],'total'),false,'Server determines original price, not converted client display');}
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Choose your language',exact:true}).click();
  const dialog=await page.getByRole('dialog').boundingBox();assert.ok(dialog.x>=0&&dialog.x+dialog.width<=390,'Dialog fits mobile');
  if(!logged)await page.screenshot({path:'C:/Users/josed/Desktop/LaRutica/.locale-mobile.png'});
  await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);console.log(`PASS preferences: ${failed?'rates failure with honest USD fallback':'ES/EN, CRC/EUR, focus, persistence, no catalog refetch, booking original USD, mobile'}`);await context.close();
}
await browser.close();
