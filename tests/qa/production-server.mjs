// Run the actual Vercel build on loopback for browser QA, without production credentials.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.SUPABASE_URL='http://127.0.0.1:4188';
process.env.SUPABASE_SECRET_KEY='isolated-qa-only';
process.env.LARUTICA_REMOTE_API_ORIGIN='';
const root=path.resolve('.vercel/output/static');
const app=(await import(pathToFileURL(path.resolve('.vercel/output/functions/__server.func/index.mjs')).href)).default;
const types={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:4190'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(file.startsWith(root+path.sep)&&(await stat(file).catch(()=>null))?.isFile()) {
    res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));return;
  }
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await app.fetch(request,{waitUntil(promise){promise.catch(console.error);}});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){console.error(error);res.writeHead(500);res.end('Isolated production adapter failed');}});
server.listen(4190,'127.0.0.1',()=>console.log('Vercel build listening on 4190'));
