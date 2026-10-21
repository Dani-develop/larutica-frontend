import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function resolve(specifier,context,next){
  if(specifier.startsWith('@/'))specifier=pathToFileURL(root+specifier.slice(2)).href;
  if(specifier.startsWith('file:')||specifier.startsWith('.')){
    let url=new URL(specifier,context.parentURL);
    for(const ext of ['.ts','.tsx'])if(existsSync(fileURLToPath(url)+ext)){url=new URL(url.href+ext);break;}
    // Authentication is isolated only inside the Node test process. Production
    // route handlers, input validation, provider calls and HMAC remain real.
    if(url.href.endsWith('/lib/supabase/session.ts'))return {url:new URL('./session.mjs',import.meta.url).href,shortCircuit:true};
    if(url.href.endsWith('/lib/api/remote-proxy.ts'))return {url:new URL('./remote.mjs',import.meta.url).href,shortCircuit:true};
    if(existsSync(fileURLToPath(url)))return {url:url.href,shortCircuit:true};
  }
  return next(specifier,context);
}
export function load(url,context,next){
  if(url.endsWith('.ts')||url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
  return next(url,context);
}
