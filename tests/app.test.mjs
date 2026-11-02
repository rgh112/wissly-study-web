import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import app from '../server/app.js';
import {localDB} from '../server/local-db.mjs';
import {emptyData,validData} from '../server/study-api.js';
const KEY='test-only-moderator-key-12345678901234567890';
const origin='https://rgh112.github.io';
function setup(filename=':memory:'){
  const env={DB:localDB(filename),ADMIN_KEY:KEY,ALLOWED_ORIGINS:origin,MAX_PARTICIPANTS:50,ASSETS:{fetch:()=>new Response('public')}};
  const req=async(p,method='GET',body,token='',extra={})=>{
    const headers={Origin:origin,...extra};if(body!==undefined)headers['Content-Type']='application/json';if(token)headers.Authorization='Bearer '+token;
    const response=await app.fetch(new Request('https://study-api.test/api'+p,{method,headers,body:body!==undefined?JSON.stringify(body):undefined}),env);
    const text=await response.text();let value;try{value=JSON.parse(text);}catch{value=text;}
    return {status:response.status,headers:response.headers,body:value};
  };
  const start=async()=>{const r=await req('/access/start','POST',{});assert.equal(r.status,201);return r.body;};
  const create=async token=>{const r=await req('/sessions','POST',{id:crypto.randomUUID(),language:'ko'},token);assert.equal(r.status,201);return r.body;};
  const admin=async()=>{const r=await req('/admin/login','POST',{key:KEY});assert.equal(r.status,200);return r.body.token;};
  return {env,req,start,create,admin};
}
test('no ChatGPT identity required; return code restores only its owner',async t=>{
  const {env,req,start,create}=setup();t.after(()=>env.DB.sqlite.close());
  const a=await start(),b=await start();assert.notEqual(a.token,b.token);assert.equal(a.participant.label,'P01');
  const session=await create(a.token);assert.equal(session.data.answers.participant,'P01');
  assert.equal((await req('/sessions/'+session.id)).status,401);
  assert.equal((await req('/sessions/'+session.id,'GET',undefined,b.token)).status,404);
  assert.equal((await req('/sessions/'+session.id,'GET',undefined,'',{'oai-authenticated-user-id':a.participant.id})).status,401);
  assert.deepEqual((await req('/sessions','GET',undefined,b.token)).body.sessions,[]);
  assert.equal((await req('/access/resume','POST',{code:a.token})).body.participant.id,a.participant.id);
  assert.equal((await req('/access/resume','POST',{code:'P01'})).status,401);
  assert.equal((await req('/access/resume','POST',{code:'W-'+'x'.repeat(32)})).status,401);
  const stored=env.DB.sqlite.prepare('SELECT * FROM participants').all();assert.ok(stored.every(r=>r.code_hash.length===64&&!Object.values(r).includes(a.token)));
});
test('autosave, idempotency, conflicts, atomic history, language and post-interview edits',async t=>{
  const {env,req,start,create}=setup();t.after(()=>env.DB.sqlite.close());const a=await start(),s=await create(a.token);const d=s.data;
  d.answers.pre_ai_frequency='never';d.answers.study_language='en';
  const first={revision:0,mutation:crypto.randomUUID(),data:structuredClone(d)};
  assert.equal((await req('/sessions/'+s.id,'PUT',first,a.token)).body.revision,1);
  assert.equal((await req('/sessions/'+s.id,'PUT',first,a.token)).body.revision,1);
  for(const key of ['start','status','context','preview','resume','changes','recovery','export'])d.answers['v5_'+key]=4;
  d.index=7;d.furthest=7;d.surveyPage=1;d.answers.v5_interview_started_at=new Date().toISOString();
  assert.equal((await req('/sessions/'+s.id,'PUT',{revision:1,mutation:crypto.randomUUID(),data:d},a.token)).status,200);
  d.answers.v5_start=2;d.answers.v5_note_recall='Participant opened the preview.';
  const writes=await Promise.all([2,3].map(value=>req('/sessions/'+s.id,'PUT',{revision:2,mutation:crypto.randomUUID(),data:{...d,answers:{...d.answers,v5_start:value}}},a.token)));
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
  const h=(await req('/sessions/'+s.id+'/history','GET',undefined,a.token)).body;assert.equal(h.history.length,3);assert.deepEqual(h.history.map(r=>r.revision),[1,2,3]);
  assert.equal(h.history[1].data.answers.v5_start,4);assert.equal(h.record.data.answers.v5_start,2);
  d.answers.v5_interview_started_at=null;assert.equal((await req('/sessions/'+s.id,'PUT',{revision:3,mutation:crypto.randomUUID(),data:d},a.token)).status,400);
});
test('origin allowlist, preflight, method guard and data validation',async t=>{
  const {env,req,start,create}=setup();t.after(()=>env.DB.sqlite.close());
  const pre=await req('/sessions','OPTIONS');assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await req('/access/start','POST',{},'',{Origin:'https://evil.test'})).status,403);
  assert.equal((await req('/sessions','DELETE')).status,405);
  const a=await start(),s=await create(a.token),d=s.data;d.answers.v5_start=7;assert.equal(validData(d),false);
  assert.equal((await req('/sessions/'+s.id,'PUT',{revision:0,mutation:crypto.randomUUID(),data:d},a.token)).status,400);
  assert.equal((await req('/sessions','POST',{id:crypto.randomUUID(),version:'study-3'},a.token)).status,400);
  d.answers={pre_ai_tools:['bad']};assert.equal(validData(d),false);
});
test('moderator protection, aggregate export, interview snapshot and safe CSV',async t=>{
  const {env,req,start,create,admin}=setup();t.after(()=>env.DB.sqlite.close());const a=await start(),s=await create(a.token);
  assert.equal((await req('/admin/sessions','GET',undefined,a.token)).status,401);
  assert.equal((await req('/admin/login','POST',{key:'bad'})).status,401);
  const d=s.data;for(const k of ['start','status','context','preview','resume','changes','recovery','export'])d.answers['v5_'+k]=4;
  d.answers.v5_interview_started_at=new Date().toISOString();d.answers.extra_v5_start='=HYPERLINK("bad")';
  await req('/sessions/'+s.id,'PUT',{revision:0,mutation:crypto.randomUUID(),data:d},a.token);
  d.answers.v5_start=1;await req('/sessions/'+s.id,'PUT',{revision:1,mutation:crypto.randomUUID(),data:d},a.token);
  const key=await admin();assert.equal((await req('/admin/sessions','GET',undefined,key)).body.sessions.length,1);
  const exported=(await req('/admin/export','GET',undefined,key)).body;
  assert.equal(exported.sessions[0].interview.surveyAtStart.v5_start,4);assert.equal(exported.sessions[0].record.data.answers.v5_start,1);
  assert.ok(!JSON.stringify(exported).includes(a.token));assert.ok(!JSON.stringify(exported).includes('code_hash'));
  const csv=await req('/admin/export?format=csv','GET',undefined,key);assert.match(csv.body,/'=HYPERLINK/);
  assert.equal((await req('/admin/sessions/'+s.id,'GET',undefined,key)).body.history.length,2);
  await req('/admin/logout','POST',{},key);assert.equal((await req('/admin/sessions','GET',undefined,key)).status,401);
});
test('records and return codes survive server restart',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wissly-test-')),file=path.join(dir,'study.sqlite');
  let db;try{
    const first=setup(file);db=first.env.DB;const p=await first.start(),s=await first.create(p.token);s.data.answers.pre_ai_frequency='often';
    await first.req('/sessions/'+s.id,'PUT',{revision:0,mutation:crypto.randomUUID(),data:s.data},p.token);db.sqlite.close();db=null;
    const next=setup(file);db=next.env.DB;
    assert.equal((await next.req('/access/resume','POST',{code:p.token})).status,200);
    assert.equal((await next.req('/sessions/'+s.id,'GET',undefined,p.token)).body.data.answers.pre_ai_frequency,'often');
  }finally{db?.sqlite.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('concurrent enrollment respects capacity and abusive login is limited',async t=>{
  const {env,req}=setup();t.after(()=>env.DB.sqlite.close());env.MAX_PARTICIPANTS=2;
  const r=await Promise.all(Array.from({length:5},()=>req('/access/start','POST',{})));assert.equal(r.filter(x=>x.status===201).length,2);assert.equal(r.filter(x=>x.status===409).length,3);
  for(let i=0;i<10;i++)assert.equal((await req('/admin/login','POST',{key:'bad'})).status,401);
  assert.equal((await req('/admin/login','POST',{key:'bad'})).status,429);
});
