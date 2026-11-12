import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const errors=[];
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
for(const file of ['app','components','modules'].flatMap(walk).filter(file=>file.endsWith('.css'))){
  const css=fs.readFileSync(file,'utf8');
  for(const match of css.matchAll(/font-family\s*:\s*([^;}]+)/g)){
    if(file.endsWith('fonts.css') && match[1].trim()==='"Poppins"')continue;
    if(!['var(--font-brand)','inherit'].includes(match[1].trim()))errors.push(`${file}: fuente fuera del sistema: ${match[1]}`);
  }
  if(!file.endsWith('design-tokens.css') && /#(?:003b22|00df5b|0d684e)\b/i.test(css))errors.push(`${file}: usar tokens para la paleta de marca`);
}
// Tamaño mínimo de texto: 12 px (type-caption). Usar text-xs o los tokens type-*.
for(const file of ['app','components','modules'].flatMap(walk)){
  if(file.endsWith('.tsx')){
    const source=fs.readFileSync(file,'utf8');
    for(const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)){
      if(Number(match[1])<12)errors.push(`${file}: texto de ${match[1]} px; el mínimo es 12 px (text-xs)`);
    }
  }
  if(file.endsWith('.css')){
    const sheet=fs.readFileSync(file,'utf8');
    for(const match of sheet.matchAll(/font-size\s*:\s*(\d*\.?\d+)(px|rem)/g)){
      const px=match[2]==='rem'?Number(match[1])*16:Number(match[1]);
      if(px<12)errors.push(`${file}: font-size ${match[1]}${match[2]} menor a 12 px`);
    }
  }
}
const css=fs.readFileSync('app/globals.css','utf8');
if(/(?:^|[}])\s*nav\s*\{/m.test(css))errors.push('globals.css: navegación global sin scope');
if(/(?:^|[}])\s*h[12]\s*\{/m.test(css))errors.push('globals.css: títulos de página sin scope');
const layout=fs.readFileSync('app/layout.tsx','utf8');
if(/next\/font\//.test(layout))errors.push('layout: reutilizar la fuente local Poppins');
const manifest=JSON.parse(fs.readFileSync('public/fonts/sources.json','utf8'));
for(const font of manifest.files){
  const file=fs.readFileSync(path.join('public/fonts',font.name));
  if(createHash('sha256').update(file).digest('hex')!==font.sha256)errors.push(`Fuente modificada: ${font.name}`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log('DESIGN_OK: familia única, paleta centralizada y selectores globales aislados.');
