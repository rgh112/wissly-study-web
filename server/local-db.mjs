import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function localDB(filename=':memory:') {
  const sqlite=new DatabaseSync(filename,{timeout:5000});
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='study_sessions'").get()) sqlite.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  sqlite.exec(fs.readFileSync(new URL('./access-schema.sql',import.meta.url),'utf8'));
  const run=s=>({meta:{changes:Number(sqlite.prepare(s.sql).run(...s.args).changes)}});
  const wrap=(sql,args=[])=>({sql,args,bind(...a){return wrap(sql,a);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return run(this);}});
  return {sqlite,prepare:sql=>wrap(sql),async batch(statements){
    // No await inside this transaction: concurrent requests cannot interleave.
    sqlite.exec('BEGIN IMMEDIATE');
    try {const result=statements.map(s=>/^\s*SELECT/i.test(s.sql)?{results:sqlite.prepare(s.sql).all(...s.args)}:run(s));sqlite.exec('COMMIT');return result;}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }};
}
