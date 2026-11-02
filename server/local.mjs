import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import app from './app.js';
import {localDB} from './local-db.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),publicDir=path.join(root,'public');
const dataDir=path.resolve(process.env.DATA_DIR||path.join(root,'.data'));
fs.mkdirSync(dataDir,{recursive:true});
let adminKey=process.env.ADMIN_KEY;
if(!adminKey){
  if(process.env.NODE_ENV==='production')throw new Error('Set ADMIN_KEY (at least 32 characters) before production startup.');
  const keyPath=path.join(dataDir,'admin-key.txt');
  if(!fs.existsSync(keyPath))fs.writeFileSync(keyPath,randomBytes(32).toString('base64url'),{mode:0o600,flag:'wx'});
  adminKey=fs.readFileSync(keyPath,'utf8').trim();
}
if(adminKey.length<32)throw new Error('ADMIN_KEY must contain at least 32 characters.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.zip':'application/zip','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.txt':'text/plain; charset=utf-8'};
const DB=localDB(path.join(dataDir,'study.sqlite'));
const env={DB,ADMIN_KEY:adminKey,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||'',MAX_PARTICIPANTS:process.env.MAX_PARTICIPANTS||50,ASSETS:{async fetch(request){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  let pathname;try{pathname=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Not found',{status:404});}
  // A local preview always uses its own SQLite database, even after Pages is deployed.
  if(pathname==='/config.js')return new Response(request.method==='HEAD'?null:"window.STUDY_CONFIG={apiBase:''};\n",{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
  if(pathname.endsWith('/'))pathname+='index.html';
  const filename=path.resolve(publicDir,'.'+pathname);
  if(!filename.startsWith(publicDir+path.sep)||pathname.includes('\\')||pathname.includes('\0'))return new Response('Not found',{status:404});
  try {if(!fs.statSync(filename).isFile())return new Response('Not found',{status:404});
    return new Response(request.method==='HEAD'?null:fs.readFileSync(filename),{headers:{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"}});
  }catch{return new Response('Not found',{status:404});}
}}};
const server=http.createServer(async(req,res)=>{
  try {
    const parts=[];let size=0;
    for await(const part of req){size+=part.length;if(size>256000){res.writeHead(413);res.end('Request too large');return;}parts.push(part);}
    const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(parts)});
    const response=await app.fetch(request,{...env,CLIENT_IP:req.socket.remoteAddress});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Request failed');}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>{
  const url='http://127.0.0.1:'+server.address().port;
  fs.mkdirSync(path.join(root,'.runtime'),{recursive:true});fs.writeFileSync(path.join(root,'.runtime/server-port'),String(server.address().port));
  console.log('Study: '+url+'\nModerator: '+url+'/admin.html\nData directory: '+dataDir);
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{DB.sqlite.close();process.exit(0);}));
