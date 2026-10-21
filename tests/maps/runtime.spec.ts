import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {places,calculated} from './fixtures';

test('Vinext sirve el worker original y dibuja una línea que permite insertar una parada',async({page})=>{
  const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /worker|dibujar el mapa/i.test(m.text()))failures.push(m.text());});
  await page.route('**/api/maps/tiles/**',route=>route.fulfill({contentType:'image/png',path:fileURLToPath(new URL('./fixtures/tile.png',import.meta.url))}));
  await page.route('**/api/maps/places?**',route=>{const q=new URL(route.request().url()).searchParams.get('q')!.toLowerCase();return route.fulfill({json:{data:places.filter(p=>p.name.toLowerCase().includes(q))}});});
  await page.route('**/api/maps/reverse?**',route=>route.fulfill({json:{data:null}}));
  await page.route('**/api/maps/route',route=>{const body=route.request().postDataJSON();return route.fulfill({json:{data:calculated(body.points,body.mode)}});});
  // Same test host, served by the application's complete Vinext/Cloudflare
  // stack. No dynamic React roots, test accounts or application auth changes.
  await page.goto('/tests/maps/browser/index.html');
  await page.getByRole('combobox',{name:'A · Salida',exact:true}).fill('Heredia');
  await page.getByRole('listbox').getByRole('button').first().click();
  await page.getByRole('combobox',{name:'B · Llegada',exact:true}).fill('La Fortuna');
  await page.getByRole('listbox').getByRole('button').first().click();
  const confirm=page.getByRole('button',{name:'Confirmar este trayecto',exact:true});await expect(confirm).toBeEnabled({timeout:15000});
  await expect(page.locator('.lr-map-marker')).toHaveCount(2,{timeout:15000});await expect(page.locator('.lr-map-error')).toHaveCount(0);
  const worker=await page.request.get('/maplibre/maplibre-gl-worker.mjs?v=6.15.0');expect(worker.status()).toBe(200);expect(await worker.text()).not.toContain('/@vite/client');
  await page.getByRole('button',{name:'Editar trayecto en el mapa'}).click();await page.locator('canvas').scrollIntoViewIfNeeded();
  const a=await page.getByRole('button',{name:/^A:/}).boundingBox(),b=await page.getByRole('button',{name:/^B:/}).boundingBox();
  const x=(a!.x+a!.width/2+b!.x+b!.width/2)/2,y=(a!.y+a!.height/2+b!.y+b!.height/2)/2;
  await page.mouse.click(x,y);await expect(page.getByRole('combobox',{name:'Parada 1',exact:true})).toBeVisible();
  await expect(confirm).toBeEnabled();await confirm.click();await expect(page.getByRole('button',{name:'Trayecto confirmado'})).toBeVisible();expect(failures).toEqual([]);
});
