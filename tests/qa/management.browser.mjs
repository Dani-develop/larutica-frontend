import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const api='http://127.0.0.1:4188',ui='http://127.0.0.1:4190';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
await mkdir('test-results/management',{recursive:true});
for(const width of [1440,390]) {
  await fetch(api+'/__qa/reset');await fetch(api+'/__qa/seed-management');
  const context=await browser.newContext({viewport:{width,height:1000}});context.setDefaultTimeout(12000);
  const errors=[];await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();if(url.pathname.startsWith('/api/'))return route.fulfill({response:await route.fetch({url:api+url.pathname+url.search,headers:{'content-type':'application/json','x-qa-actor':'owner'}})});return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(ui+'/dashboard/reservations');await page.locator('.manage-publication').nth(11).waitFor();assert.equal(await page.locator('.manage-publication').count(),12);
    await page.screenshot({path:`test-results/management/publications-${width}.png`,fullPage:width===1440});
    await page.getByRole('button',{name:'Siguiente',exact:true}).click();const publication=page.getByRole('link',{name:/Volcán Arenal/});await publication.waitFor();assert.equal(await page.locator('.manage-publication').count(),2);
    await publication.click();await page.locator('.manage-table tbody tr').nth(9).waitFor();assert.equal(await page.locator('.manage-table tbody tr').count(),10);
    await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.waitForURL(/pagina=2/);await page.locator('.manage-table tbody tr').nth(9).waitFor();
    await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.waitForURL(/pagina=3/);await page.waitForFunction(()=>document.querySelectorAll('.manage-table tbody tr').length===3);
    await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByText('Pagada',{exact:true}).waitFor();await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
    await page.getByLabel('Buscar viajero o reserva',{exact:true}).fill('Persona 023');await page.getByRole('button',{name:'Buscar',exact:true}).click();await page.getByRole('status').getByText('1 reserva encontrada',{exact:true}).waitFor();assert.equal(await page.locator('.manage-table tbody tr').count(),1);
    await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();await page.locator('.manage-table tbody tr').nth(9).waitFor();
    if(width===390)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,'page overflow');
    await page.screenshot({path:`test-results/management/reservations-${width}.png`,fullPage:width===1440});
    await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();await page.getByRole('dialog').waitFor();assert.ok(await page.getByRole('dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1),'dialog overflow');
    await page.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await page.getByRole('button',{name:'Sí, cancelar reserva',exact:true}).click();await page.getByText('Reserva cancelada. Puedes consultar el estado de la devolución en su detalle.',{exact:true}).waitFor();
    await page.getByLabel('Vista',{exact:true}).selectOption('history');await page.getByRole('status').getByText('1 reserva encontrada',{exact:true}).waitFor();assert.equal(await page.locator('.manage-table tbody tr').count(),1);
    await page.getByRole('link',{name:'Volver a publicaciones',exact:true}).click();await page.getByRole('link',{name:/Volcán Arenal/}).waitFor();assert.match(page.url(),/paginaPublicaciones=2/);
    assert.deepEqual(errors,[]);console.log('PASS',width,'publication and reservation pagination, search, details, cancellation, back navigation and mobile text');
  } catch(error){await page.screenshot({path:`test-results/management/failure-${width}.png`,fullPage:true});throw error;}finally{await context.close();}
}
await browser.close();
