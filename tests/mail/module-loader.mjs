// Same test boundaries as the synchronous loader, using the loader API supported
// by the project's minimum Node.js 22.13 (registerHooks needs Node 22.15).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) specifier = pathToFileURL(root + specifier.slice(2)).href;
  if (specifier.startsWith('file:') || specifier.startsWith('.')) {
    let url = new URL(specifier, context.parentURL);
    for (const extension of ['.ts', '.tsx']) {
      if (existsSync(fileURLToPath(url) + extension)) { url = new URL(url.href + extension); break; }
    }
    if (url.href.endsWith('/lib/supabase/admin-client.ts')) return { url: new URL('./admin.mjs', import.meta.url).href, shortCircuit: true };
    if (url.href.endsWith('/lib/supabase/session.ts')) return { url: new URL('./session.mjs', import.meta.url).href, shortCircuit: true };
    if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
  }
  return next(specifier, context);
}
export function load(url, context, next) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, shortCircuit: true };
  return next(url, context);
}
