import {chromium} from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
for(const role of ['Viajero','Agencia','Transporte']){
 const context=await browser.newContext(),page=await context.newPage(),errors=[],posts=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.hostname!=='localhost')return route.abort();
  if(url.pathname==='/api/auth/session')return route.fulfill({status:401,json:{error:'Sin sesión'}});
  if(url.pathname==='/api/auth/register'){posts.push(route.request().postDataJSON());return route.fulfill({json:{data:{session:null,user:null,requiresEmailConfirmation:true}}});}
  if(url.pathname.startsWith('/api/'))throw Error('Unexpected request '+url.pathname);
  return route.continue();
 });
 await page.goto('http://localhost:3000/register');await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(e=>Object.keys(e).some(k=>k.startsWith('__reactProps'))));await page.getByRole('button',{name:new RegExp('^'+role)}).click();
 await page.locator('#fullName').fill('Persona QA');await page.locator('#email').fill('qa@example.test');
 await page.locator('#password').fill('Demo-QA-1234');await page.locator('#confirmPassword').fill('Demo-QA-1234');
 if(role!=='Viajero'){await page.locator('#companyName').fill('Empresa QA');await page.locator('#phone').fill('87654321');}
 await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
 await page.getByRole('heading',{name:'Confirma tu correo'}).waitFor();
 assert.equal(posts.length,1);assert.equal(posts[0].role,role);assert.equal(posts[0].fullName,'Persona QA');assert.deepEqual(errors,[]);
 console.log('PASS merged registration '+role+': original validation, controlled fields, confirmation and translations retained');await context.close();
}
await browser.close();
