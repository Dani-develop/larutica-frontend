import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=new URL('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',root);
const target=new URL('public/maplibre/maplibre-gl-worker.mjs',root);
// Serve the unmodified, licensed distribution as a static module. Processing
// this standalone worker through Vinext/Vite injects window-based HMR helpers
// into its dynamic imports, which cannot run in a Web Worker.
const contents=await readFile(source);
let previous;try{previous=await readFile(target);}catch{}
if(!previous?.equals(contents)){
  await mkdir(new URL('public/maplibre/',root),{recursive:true});
  await writeFile(target,contents);
}
