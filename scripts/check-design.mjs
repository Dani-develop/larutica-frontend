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
