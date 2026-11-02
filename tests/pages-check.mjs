import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const prefix='/wissly-study-web/',dir=path.resolve('.runtime/pages-'+crypto.randomUUID());fs.mkdirSync(dir,{recursive:true});
let apiOrigin;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const frontend=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local');
  if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
  const name=url.pathname.slice(prefix.length)||'index.html';
  if(name==='config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('window.STUDY_CONFIG='+JSON.stringify({apiBase:apiOrigin})+';');return;}
  const filename=path.resolve('public',name);
  if(!filename.startsWith(path.resolve('public')+path.sep)||!fs.existsSync(filename)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(fs.readFileSync(filename));
});
await new Promise(resolve=>frontend.listen(0,'127.0.0.1',resolve));
const frontendOrigin='http://127.0.0.1:'+frontend.address().port;
const backend=spawn(process.execPath,['server/local.mjs'],{env:{...process.env,PORT:'0',DATA_DIR:dir,ALLOWED_ORIGINS:frontendOrigin},windowsHide:true,stdio:['ignore','pipe','pipe']});
try{
  await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(new Error('Backend readiness timeout')),15000);
    backend.once('exit',()=>{clearTimeout(timer);reject(new Error('Backend stopped'));});
    backend.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/Study: (http:\/\/127\.0\.0\.1:\d+)/);if(match){apiOrigin=match[1];clearTimeout(timer);resolve();}});
  });
  const child=spawn('python',['tests/browser-access.py'],{env:{...process.env,STUDY_BROWSER_URL:frontendOrigin+prefix,STUDY_ADMIN_KEY_FILE:path.join(dir,'admin-key.txt')},windowsHide:true,stdio:'inherit'});
  const result=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});if(result)throw new Error('Pages browser test failed');
  console.log('PASS: GitHub Pages subdirectory and cross-origin API, including CORS preflights.');
}finally{backend.kill();frontend.close();}
