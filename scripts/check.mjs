import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
for(const dir of ['server','public','scripts']){
  function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory())walk(p);else if(/\.(js|mjs)$/.test(p))execFileSync(process.execPath,['--check',p]);}}
  walk(dir);
}
for(const f of ['public/index.html','public/en/index.html']){
  const text=fs.readFileSync(f,'utf8');
  if(text.includes('signin-with-chatgpt'))throw new Error('Legacy sign-in link');
  for(const m of text.matchAll(/(?:src|href)="([^"]+)"/g)){
    if(/^(https?:|data:|#|\.\/|en\/index|\.\.\/)/.test(m[1]))continue;
    if(!fs.existsSync(path.join('public',m[1].split('?')[0])))throw new Error('Missing asset: '+m[1]);
  }
}
console.log('JavaScript and entrypoint assets checked.');
