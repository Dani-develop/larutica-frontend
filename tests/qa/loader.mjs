import { registerHooks } from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../../',import.meta.url));
registerHooks({
 resolve(specifier,context,next){
  const mocks={'@/lib/supabase/admin-client':'admin','@/lib/supabase/session':'session','@/lib/api/remote-proxy':'proxy'};
  if(mocks[specifier])return {url:new URL(`./${mocks[specifier]}.mjs`,import.meta.url).href,shortCircuit:true};
  if(specifier.startsWith('@/'))specifier=pathToFileURL(root+specifier.slice(2)).href;
  if(specifier.startsWith('file:')||specifier.startsWith('.')){
   const url=new URL(specifier,context.parentURL);
   for(const extension of ['.ts','.tsx'])if(existsSync(fileURLToPath(url)+extension))return {url:url.href+extension,shortCircuit:true};
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.endsWith('.ts')||url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
  return next(url,context);
 }
});
