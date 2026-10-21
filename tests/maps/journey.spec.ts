import {test,expect,type Page} from '@playwright/test';
import {places,calculated} from './fixtures';
import type {Journey} from '../../modules/journeys/types';
import {fileURLToPath} from 'node:url';

const confirm=(page:Page)=>page.getByRole('button',{name:/Confirmar este trayecto|Trayecto confirmado|Consultando la ubicación/});
const state=async(page:Page)=>JSON.parse(await page.getByTestId('journey-state').textContent()??'null') as Journey;
async function choose(page:Page,label:string,name:string){
  const field=page.getByRole('combobox',{name:label,exact:true});await field.fill(name);
  const option=page.getByRole('listbox').getByRole('option').filter({hasText:name}).first().getByRole('button');
  if(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches))await option.tap();else await option.click();
}
async function endpoints(page:Page){await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','La Fortuna');await expect(confirm(page)).toBeEnabled();}
test.beforeEach(async({page})=>{
  await page.route('**/api/maps/tiles/**',route=>route.fulfill({contentType:'image/png',path:fileURLToPath(new URL('./fixtures/tile.png',import.meta.url))}));
  await page.route('**/api/maps/places?**',route=>{const q=new URL(route.request().url()).searchParams.get('q')!.toLowerCase();return route.fulfill({json:{data:places.filter(p=>p.name.toLowerCase().includes(q))}});});
  await page.route('**/api/maps/reverse?**',route=>{const u=new URL(route.request().url());return route.fulfill({json:{data:{...places[2],type:'map_point',adjusted:true,lat:Number(u.searchParams.get('lat')),lon:Number(u.searchParams.get('lon'))}}});});
  await page.route('**/api/maps/route',route=>{const body=route.request().postDataJSON();return route.fulfill({json:{data:calculated(body.points,body.mode)}});});
  await page.goto('/');
});
test('selección por teclado, contexto territorial, cálculo y confirmación',async({page})=>{
  const a=page.getByRole('combobox',{name:'A · Salida'});await a.fill('Heredia');
  await expect(page.getByRole('listbox').getByRole('option')).toContainText('Cantón: Heredia');await expect(page.getByRole('listbox').getByRole('option')).toContainText('Provincia: Heredia');
  await a.press('ArrowDown');await a.press('Enter');
  await expect(confirm(page)).toBeDisabled();await choose(page,'B · Llegada','La Fortuna');
  await expect(confirm(page)).toBeEnabled();await confirm(page).click();
  expect((await state(page)).confirmedAt).toBeTruthy();
});
test('añadir, completar, reordenar y quitar paradas invalida la confirmación',async({page})=>{
  await endpoints(page);await confirm(page).click();
  await page.getByRole('button',{name:'Añadir parada',exact:true}).click();await expect(confirm(page)).toBeDisabled();
  await expect(page.getByRole('combobox',{name:'Parada 1',exact:true})).toHaveValue('');
  expect((await state(page)).geometry).toBeNull();expect((await state(page)).confirmedAt).toBeNull();
  await choose(page,'Parada 1','San Ramón');await expect(confirm(page)).toBeEnabled();
  await page.getByRole('button',{name:'Añadir parada',exact:true}).click();await choose(page,'Parada 2','Zarcero');await expect(confirm(page)).toBeEnabled();
  await confirm(page).click();await page.getByRole('button',{name:'Subir parada 2'}).click();await expect(confirm(page)).toHaveText('Confirmar este trayecto');await expect(confirm(page)).toBeEnabled();
  expect((await state(page)).points.map(p=>p?.id)).toEqual(['heredia','zarcero','ramon','fortuna']);
  await page.getByRole('button',{name:'Eliminar parada 1'}).click();await expect(confirm(page)).toBeEnabled();
  expect((await state(page)).points.map(p=>p?.id)).toEqual(['heredia','ramon','fortuna']);
  await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();
});
test('respuesta lenta anterior no sustituye el recálculo nuevo',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);let oldStarted!:()=>void;const started=new Promise<void>(r=>oldStarted=r);
  await page.route('**/api/maps/route',async route=>{const body=route.request().postDataJSON();if(body.mode==='drive'){oldStarted();await gate;}await route.fulfill({json:{data:calculated(body.points,body.mode)}}).catch(()=>{});});
  await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','La Fortuna');await started;
  await page.getByLabel('Tipo de recorrido').selectOption('walk');await expect(confirm(page)).toBeEnabled();release();
  await expect.poll(async()=> (await state(page)).mode).toBe('walk');await confirm(page).click();expect((await state(page)).mode).toBe('walk');
});
test('fallo del proveedor conserva puntos, impide confirmar y permite reintentar',async({page})=>{
  let fail=true;
  await page.route('**/api/maps/route',route=>{const body=route.request().postDataJSON();return route.fulfill(fail?{status:422,json:{error:'Alguno de los puntos no tiene acceso cercano a una carretera.'}}:{json:{data:calculated(body.points,body.mode)}});});
  await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','La Fortuna');await expect(page.getByRole('alert')).toContainText('carretera');await expect(confirm(page)).toBeDisabled();
  expect((await state(page)).points.map(p=>p?.id)).toEqual(['heredia','fortuna']);
  fail=false;await page.getByRole('button',{name:'Reintentar cálculo'}).click();await expect(confirm(page)).toBeEnabled();await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();
});
test('puntos consecutivos duplicados se rechazan; el circuito con parada sí se calcula',async({page})=>{
  await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','Heredia');await expect(page.getByRole('alert')).toContainText('coinciden');await expect(confirm(page)).toBeDisabled();
  await page.getByRole('button',{name:'Añadir parada',exact:true}).click();await choose(page,'Parada 1','San Ramón');await expect(confirm(page)).toBeEnabled();await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();
});
test('cambio de modo recalcula; solo ubicaciones nunca inventa una línea',async({page})=>{
  await endpoints(page);await confirm(page).click();await page.getByLabel('Tipo de recorrido').selectOption('hike');await expect(confirm(page)).toHaveText('Confirmar este trayecto');await expect(confirm(page)).toBeEnabled();
  expect((await state(page)).mode).toBe('hike');await page.getByLabel('Tipo de recorrido').selectOption('locations');await expect(confirm(page)).toBeEnabled();expect((await state(page)).geometry).toBeNull();
  await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();await page.getByLabel('Tipo de recorrido').selectOption('drive');await expect(confirm(page)).toBeEnabled();expect((await state(page)).geometry).toBeTruthy();expect((await state(page)).confirmedAt).toBeNull();
});
test('mapa carga el worker y permite agregar parada manual y mover salida',async({page})=>{
  const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
  await endpoints(page);await expect(page.getByText('Cargando mapa…')).toHaveCount(0);await expect(page.locator('.lr-map-error')).toHaveCount(0);
  await page.getByRole('button',{name:'El encuentro será en la salida'}).click();await confirm(page).click();
  await page.getByRole('button',{name:'Editar trayecto en el mapa'}).click();
  const canvas=page.locator('.maplibregl-canvas');await canvas.click({position:{x:150,y:150}});
  await expect.poll(async()=>(await state(page)).points.length).toBe(3);await expect(confirm(page)).toBeEnabled();
  expect((await state(page)).geometry?.coordinates.length).toBe(2);expect((await state(page)).confirmedAt).toBeNull();
  // Hit the first rendered segment. If the worker/line failed, this would append
  // before B instead of inserting between A and the existing first stop.
  await canvas.scrollIntoViewIfNeeded();
  const firstStopId=(await state(page)).points[1]!.id;
  const a=await page.locator('.lr-map-marker').filter({hasText:/^A$/}).boundingBox();
  const s=await page.locator('.lr-map-marker').filter({hasText:/^1$/}).boundingBox();
  expect(a).toBeTruthy();expect(s).toBeTruthy();
  const x=(a!.x+a!.width/2+s!.x+s!.width/2)/2,y=(a!.y+a!.height/2+s!.y+s!.height/2)/2;
  await expect.poll(async()=>{
    const png=await page.screenshot({clip:{x:x-6,y:y-6,width:12,height:12}});
    return page.evaluate(async base64=>{
      const image=await createImageBitmap(await (await fetch('data:image/png;base64,'+base64)).blob());
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const context=canvas.getContext('2d')!;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i]<40 && pixels[i+1]>40 && pixels[i+1]<130 && pixels[i+2]<80)return true;
      return false;
    },png.toString('base64'));
  }).toBe(true);
  await page.mouse.click(x,y);
  await expect.poll(async()=>(await state(page)).points.length).toBe(4);await expect(confirm(page)).toBeEnabled();
  expect((await state(page)).points[2]?.id).toBe(firstStopId);
  await page.getByLabel('Al hacer clic en el mapa').selectOption('origin');await canvas.click({position:{x:180,y:180}});await expect(confirm(page)).toBeEnabled();
  const j=await state(page);expect(j.points[0]?.adjusted).toBe(true);expect(j.meetingLocation?.lat).toBe(j.points[0]?.lat);expect(j.meetingLocation?.lon).toBe(j.points[0]?.lon);
  await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();expect(failures).toEqual([]);
});
test('paso del formulario exige confirmar y conserva el trayecto como borrador',async({page})=>{
  await page.goto('/?form');await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByText('Define y confirma el trayecto.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Empezar edición',exact:true}).click();
  await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','La Fortuna');
  await expect(page.getByText('24 km · 20 min de recorrido estimado',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'El encuentro será en la salida'}).click();await page.getByRole('button',{name:'Terminar ruta',exact:true}).click();
  await page.getByRole('button',{name:'Guardar trayecto como borrador'}).click();
  const saved=JSON.parse(await page.getByTestId('saved-state').textContent()??'null');expect(saved.action).toBe('DRAFT');expect(saved.journey.confirmedAt).toBeTruthy();expect(saved.destination).toBe('La Fortuna');expect(saved.meetingPoint).toContain('Heredia');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Detalles del servicio',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Enviar a revisión',exact:true}).click();
  const submitted=JSON.parse(await page.getByTestId('saved-state').textContent()??'null');expect(submitted.action).toBe('SUBMIT');expect(submitted.journey.integrity).toHaveLength(64);
});
test('excursión permite empezar vacía y terminar la ruta con un único botón',async({page})=>{
  await page.goto('/?excursion');
  await expect(page.getByRole('button',{name:'Empezar edición',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Empezar edición',exact:true}).click();
  const finish=page.getByRole('button',{name:'Terminar ruta',exact:true});await expect(finish).toBeEnabled();await finish.click();
  await expect(finish).toBeVisible();expect((await state(page)).confirmedAt).toBeNull();
  await expect(page.getByText('Cargando mapa…')).toHaveCount(0);
  const canvas=page.locator('.maplibregl-canvas');await canvas.click({position:{x:150,y:150}});
  await expect.poll(async()=>!!(await state(page)).points[0]).toBe(true);expect((await state(page)).points[1]).toBeNull();
  await canvas.click({position:{x:210,y:190}});
  await expect(page.getByText('24 km · 20 min de recorrido estimado',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Consultando la ubicación…',exact:true})).toHaveCount(0);
  await expect.poll(async()=> (await page.getByText('Identificando la dirección del punto elegido…').count())).toBe(0);
  await finish.click();await expect(page.getByRole('button',{name:'Empezar edición',exact:true})).toBeEnabled();
  expect((await state(page)).confirmedAt).toBeTruthy();await expect(page.getByRole('button',{name:'Confirmar este trayecto'})).toHaveCount(0);
  await page.getByRole('button',{name:'Empezar edición',exact:true}).click();expect((await state(page)).confirmedAt).toBeNull();await expect(finish).toBeEnabled();
});
test('excursión confirma desde los campos sin entrar a editar el mapa y exige reconfirmar los cambios',async({page})=>{
  await page.goto('/?excursion');
  await expect(confirm(page)).toBeDisabled();
  await endpoints(page);
  await expect(page.getByRole('button',{name:'Empezar edición',exact:true})).toHaveAttribute('aria-pressed','false');
  await confirm(page).click();expect((await state(page)).confirmedAt).toBeTruthy();
  await choose(page,'B · Llegada','Zarcero');expect((await state(page)).confirmedAt).toBeNull();
  await expect(confirm(page)).toBeEnabled();await confirm(page).click();
  expect((await state(page)).confirmedAt).toBeTruthy();expect((await state(page)).points[1]?.id).toBe('zarcero');
  await expect(page.getByRole('button',{name:'Empezar edición',exact:true})).toHaveAttribute('aria-pressed','false');
});
test('sin desbordamiento y controles accesibles con texto ampliado',async({page})=>{
  await endpoints(page);await page.evaluate(()=>document.documentElement.style.fontSize='125%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await expect(page.getByRole('combobox',{name:'A · Salida'})).toBeVisible();await expect(page.getByRole('button',{name:'Editar trayecto en el mapa'})).toBeVisible();
});
test('borrar un extremo durante el cálculo descarta el resultado y exige seleccionarlo de nuevo',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);let notify!:()=>void;const started=new Promise<void>(r=>notify=r);let first=true;
  await page.route('**/api/maps/route',async route=>{const body=route.request().postDataJSON();if(first){first=false;notify();await gate;}await route.fulfill({json:{data:calculated(body.points,body.mode)}}).catch(()=>{});});
  await choose(page,'A · Salida','Heredia');await choose(page,'B · Llegada','La Fortuna');await started;
  await page.getByRole('combobox',{name:'B · Llegada',exact:true}).fill('');release();
  await expect(confirm(page)).toBeDisabled();expect((await state(page)).points[1]).toBeNull();expect((await state(page)).geometry).toBeNull();
  await choose(page,'B · Llegada','Zarcero');await expect(confirm(page)).toBeEnabled();expect((await state(page)).points[1]?.id).toBe('zarcero');
});
test('arrastrar un marcador recalcula e invalida la ruta confirmada',async({page})=>{
  await endpoints(page);await confirm(page).click();const marker=page.locator('.lr-map-marker').filter({hasText:/^B$/});await marker.scrollIntoViewIfNeeded();
  const box=await marker.boundingBox();const old=(await state(page)).points[1]!;
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2-35,box!.y+box!.height/2+20,{steps:12});await page.mouse.up();
  await expect.poll(async()=>(await state(page)).points[1]?.adjusted).toBe(true);await expect(confirm(page)).toBeEnabled();
  const j=await state(page);expect(j.points[1]?.lat).not.toBe(old.lat);expect(j.confirmedAt).toBeNull();expect(j.geometry).toBeTruthy();await confirm(page).click();
});
test('si falla consultar la dirección manual conserva coordenadas y las indicaciones escritas',async({page})=>{
  await page.route('**/api/maps/reverse?**',route=>route.fulfill({status:502,json:{error:'Servicio temporalmente no disponible'}}));
  await endpoints(page);await page.getByRole('button',{name:'El encuentro será en la salida'}).click();
  await page.getByLabel('Indicaciones del punto de encuentro').fill('Frente a la iglesia, 15 minutos antes');
  await page.getByRole('button',{name:'Editar trayecto en el mapa'}).click();await page.getByLabel('Al hacer clic en el mapa').selectOption('origin');
  await page.locator('.maplibregl-canvas').click({position:{x:180,y:150}});await expect(confirm(page)).toBeEnabled();
  await expect(page.getByText('No se obtuvo una dirección exacta. Conservamos las coordenadas elegidas en el mapa.')).toBeVisible();
  await expect(page.getByLabel('Indicaciones del punto de encuentro')).toHaveValue('Frente a la iglesia, 15 minutos antes');
  const j=await state(page);expect(j.points[0]?.adjusted).toBe(true);expect(j.meetingLocation?.lat).toBe(j.points[0]?.lat);await confirm(page).click();
});
test('quitar una parada cancela su consulta de dirección pendiente y permite confirmar el resto',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);let notify!:()=>void;const started=new Promise<void>(r=>notify=r);
  await page.route('**/api/maps/reverse?**',async route=>{notify();await gate;await route.fulfill({json:{data:places[2]}}).catch(()=>{});});
  await endpoints(page);await page.getByRole('button',{name:'Editar trayecto en el mapa'}).click();await page.locator('.maplibregl-canvas').click({position:{x:150,y:150}});await started;
  await expect(confirm(page)).toBeDisabled();await page.getByRole('button',{name:'Eliminar parada 1'}).click();
  await expect(confirm(page)).toBeEnabled();await confirm(page).click();release();
  expect((await state(page)).points.length).toBe(2);expect((await state(page)).confirmedAt).toBeTruthy();
});
