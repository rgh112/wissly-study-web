import {DatabaseSync,backup} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const dir=path.resolve(process.env.DATA_DIR||'.data');
const source=new DatabaseSync(path.join(dir,'study.sqlite'),{readOnly:true});
fs.mkdirSync(path.join(dir,'backups'),{recursive:true});
const target=path.join(dir,'backups','study-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
await backup(source,target);source.close();console.log('Backup saved: '+target);
