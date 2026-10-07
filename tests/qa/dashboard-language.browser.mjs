import { chromium } from 'file:///C:/Users/josed/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];let requests=0;page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
  if(u.pathname.startsWith('/api/')){
   requests++;
   if(u.pathname==='/api/auth/session')return route.fulfill({json:{data:{user:{id:'qa-admin',role:'Admin',status:'Activo',name:'Administrador QA',email:'qa@example.com'},session:{userId:'qa-admin',expiresAt:new Date(Date.now()+86400000).toISOString(),idleExpiresAt:new Date(Date.now()+3600000).toISOString()}}}});
   return route.fulfill({json:{data:[],total:0}});
  }
  return route.continue();
 });
 await page.goto('http://localhost:3000/dashboard');
 await page.getByRole('heading',{name:'Panel de Control',exact:true}).waitFor();
 const before=requests;
 await page.getByRole('button',{name:'Selecciona tu idioma',exact:true}).click();
 await page.getByRole('radio',{name:'English'}).locator('..').click();
 await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
 await page.getByRole('link',{name:'View website',exact:true}).waitFor();
 await page.getByRole('heading',{name:'Quick links',exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert.equal(requests,before,'Language change makes no API requests');
 assert.equal(await page.getByRole('button',{name:/Choose your currency/}).count(),0,'Dashboard only adds language control');
 await page.goto('http://localhost:3000/dashboard/users');
 await page.getByRole('heading',{name:'User management',exact:true}).waitFor();
 await page.getByPlaceholder('Search by name, email or phone…').waitFor();
 await page.getByText('No users found',{exact:true}).waitFor();
 await page.goto('http://localhost:3000/dashboard/publications');
 await page.getByRole('heading',{name:'Listings',exact:true}).waitFor();
 await page.getByPlaceholder('Search by title or destination…').waitFor();
 await page.goto('http://localhost:3000/dashboard');
 await page.reload();await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Choose your language',exact:true}).click();
 const box=await page.getByRole('dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391,'Mobile dialog fits viewport');
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Choose your language',exact:true}).evaluate(e=>e===document.activeElement),true,'Escape restores focus');
 await page.getByRole('button',{name:'Choose your language',exact:true}).click();
 await page.getByRole('radio',{name:'Español'}).locator('..').click();
 await page.getByRole('heading',{name:'Panel de Control',exact:true}).waitFor();
 assert.deepEqual(errors,[]);await context.close();console.log('PASS dashboard language: home, menus, users, listings, persistence, mobile and no extra requests');
} finally {await browser.close();}
