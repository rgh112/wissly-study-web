import {api} from './study-api.js';
import {record} from './database.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const encoder=new TextEncoder();
const token=prefix=>prefix+btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
const bearer=request=>request.headers.get('Authorization')?.match(/^Bearer ([WA]-[\w-]{32})$/)?.[1]||'';
const label=p=>'P'+String(p.number).padStart(2,'0');
const participantInfo=p=>({id:p.id,label:label(p)});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function exportRecord(row,history){
  const revisions=history.map(r=>({revision:r.revision,data:JSON.parse(r.data),at:r.created_at}));
  const first=revisions.find(r=>r.data.answers.v5_interview_started_at);
  return {record:record(row),history:revisions,interview:{startedAt:JSON.parse(row.data).answers.v5_interview_started_at||null,startRevision:first?.revision??null,surveyAtStart:first?Object.fromEntries(Object.entries(first.data.answers).filter(([k])=>!k.startsWith('v5_note_')&&k!=='v5_interview_started_at')):null}};
}
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Object.assign(new Error('JSON 요청이 필요합니다.'),{status:415});
  const text=await request.text();if(text.length>192000)throw Object.assign(new Error('입력 내용이 너무 큽니다.'),{status:413});
  try{return JSON.parse(text);}catch{throw Object.assign(new Error('입력 내용을 확인해 주세요.'),{status:400});}
}
async function limited(env,request,group,limit){
  const now=Math.floor(Date.now()/1000),window=Math.floor(now/900);
  const key=await hash(`${group}:${window}:${env.CLIENT_IP||request.headers.get('cf-connecting-ip')||'local'}`);
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
  const r=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,(window+2)*900).first();
  return r.hits>limit;
}
async function createParticipant(env){
  const id=crypto.randomUUID(),code=token('W-'),digest=await hash(code);
  const max=Number(env.MAX_PARTICIPANTS||50);
  const result=await env.DB.prepare('INSERT INTO participants (id,code_hash,created_at) SELECT ?,?,? WHERE (SELECT count(*) FROM participants) < ?').bind(id,digest,new Date().toISOString(),max).run();
  if(!result.meta.changes)return json({error:'새 참여 기록을 만들 수 없습니다. 진행자에게 알려 주세요.'},409);
  const p=await env.DB.prepare('SELECT number,id FROM participants WHERE id=?').bind(id).first();
  return json({token:code,participant:participantInfo(p)},201);
}
async function participant(env,request){
  const code=bearer(request);if(!code.startsWith('W-'))return null;
  return env.DB.prepare('SELECT id,number FROM participants WHERE code_hash=?').bind(await hash(code)).first();
}
async function admin(env,request){
  const code=bearer(request);if(!code.startsWith('A-'))return false;
  return !!await env.DB.prepare('SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(code),Date.now()).first();
}
function csv(rows){
  const keys=[...new Set(rows.flatMap(r=>Object.keys(JSON.parse(r.data).answers)))].sort();
  const cell=value=>{let s=Array.isArray(value)?value.join(' | '):String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const lines=[['record_id','participant_code','revision','updated_at',...keys],...rows.map(r=>[r.id,label(r),r.revision,r.updated_at,...keys.map(k=>JSON.parse(r.data).answers[k])])];
  return '\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n');
}
async function adminAPI(request,env,url){
  if(url.pathname==='/api/admin/login'&&request.method==='POST'){
    if(await limited(env,request,'admin',10))return json({error:'잠시 후 다시 시도해 주세요.'},429);
    const d=await body(request);
    if(!env.ADMIN_KEY||env.ADMIN_KEY.length<32)return json({error:'진행자 접근 설정이 필요합니다.'},503);
    const a=await hash(String(d.key||'')),b=await hash(env.ADMIN_KEY);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
    if(mismatch)return json({error:'진행자 키를 확인해 주세요.'},401);
    const key=token('A-');await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(Date.now()).run();
    await env.DB.prepare('INSERT INTO admin_sessions (token_hash,expires_at) VALUES (?,?)').bind(await hash(key),Date.now()+12*3600000).run();
    return json({token:key});
  }
  if(!await admin(env,request))return json({error:'진행자 키를 입력해 주세요.'},401);
  if(url.pathname==='/api/admin/logout'&&request.method==='POST'){
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await hash(bearer(request))).run();return json({ok:true});
  }
  if(url.pathname==='/api/admin/participants'&&request.method==='POST')return createParticipant(env);
  if(request.method!=='GET')return json({error:'지원하지 않는 요청입니다.'},405);
  if(url.pathname==='/api/admin/sessions'){
    const rows=await env.DB.prepare('SELECT s.*,p.number FROM study_sessions s JOIN participants p ON p.id=s.owner ORDER BY s.updated_at DESC').all();
    return json({sessions:rows.results.map(r=>({...record(r),participantCode:label(r)}))});
  }
  if(url.pathname==='/api/admin/export'){
    const result=await env.DB.batch([env.DB.prepare('SELECT s.*,p.number FROM study_sessions s JOIN participants p ON p.id=s.owner ORDER BY p.number,s.created_at'),env.DB.prepare('SELECT * FROM study_revisions ORDER BY session_id,revision')]);
    const rows=result[0].results,history=result[1].results;
    if(url.searchParams.get('format')==='csv')return new Response(csv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wissly-responses.csv"'}});
    return json({exportedAt:new Date().toISOString(),sessions:rows.map(r=>({participantCode:label(r),...exportRecord(r,history.filter(h=>h.session_id===r.id))}))});
  }
  const match=url.pathname.match(/^\/api\/admin\/sessions\/([a-f0-9-]+)$/i);
  if(match&&uuid.test(match[1])){
    const row=await env.DB.prepare('SELECT s.*,p.number FROM study_sessions s JOIN participants p ON p.id=s.owner WHERE s.id=?').bind(match[1]).first();
    if(!row)return json({error:'기록을 찾을 수 없습니다.'},404);
    const history=await env.DB.prepare('SELECT revision,data,created_at FROM study_revisions WHERE session_id=? ORDER BY revision').bind(row.id).all();
    return json({participantCode:label(row),...exportRecord(row,history.results)});
  }
  return json({error:'찾을 수 없습니다.'},404);
}
async function route(request,env,url){
  if(url.pathname==='/api/health'&&request.method==='GET'){
    await env.DB.prepare('SELECT id FROM participants LIMIT 1').first();return json({ok:true});
  }
  if(url.pathname.startsWith('/api/admin/'))return adminAPI(request,env,url);
  if(url.pathname==='/api/access/start'&&request.method==='POST'){
    await body(request);if(await limited(env,request,'start',20))return json({error:'잠시 후 다시 시도해 주세요.'},429);
    return createParticipant(env);
  }
  if(url.pathname==='/api/access/resume'&&request.method==='POST'){
    if(await limited(env,request,'resume',30))return json({error:'잠시 후 다시 시도해 주세요.'},429);
    const d=await body(request),code=String(d.code||'').trim();
    if(!/^W-[\w-]{32}$/.test(code))return json({error:'재접속 코드를 확인해 주세요.'},401);
    const p=await env.DB.prepare('SELECT id,number FROM participants WHERE code_hash=?').bind(await hash(code)).first();
    if(!p)return json({error:'재접속 코드를 확인해 주세요.'},401);
    return json({token:code,participant:participantInfo(p)});
  }
  const p=await participant(env,request);
  if(!p)return json({error:'재접속 코드를 입력해 응답을 다시 열어 주세요.'},401);
  if(url.pathname==='/api/access'&&request.method==='GET')return json({participant:participantInfo(p)});
  if(url.pathname.startsWith('/api/sessions')){
    if(url.pathname==='/api/sessions'&&request.method==='POST'){
      const d=await body(request.clone());if(d.version&&d.version!=='study-5')return json({error:'새 기록은 현재 설문으로 시작해 주세요.'},400);
      const n=await env.DB.prepare('SELECT count(*) AS n FROM study_sessions WHERE owner=?').bind(p.id).first();
      const existing=d.id&&await env.DB.prepare('SELECT id FROM study_sessions WHERE id=? AND owner=?').bind(d.id,p.id).first();
      if(n.n>=10&&!existing)return json({error:'진행자에게 기존 응답 기록을 확인해 달라고 요청해 주세요.'},409);
    }
    return api(request,{...env,participantLabel:label(p)},url,p.id);
  }
  return json({error:'찾을 수 없습니다.'},404);
}
export default {async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(url.protocol==='http:'&&!env.CLIENT_IP){url.protocol='https:';return Response.redirect(url.href,308);}
  const allowed=new Set([url.origin,...String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  let response;
  if(origin&&!allowed.has(origin))response=json({error:'허용되지 않은 요청입니다.'},403);
  else if(request.method==='OPTIONS')response=new Response(null,{status:204});
  else if(!['GET','POST','PUT'].includes(request.method))response=json({error:'지원하지 않는 요청입니다.'},405);
  else try {response=await route(request,env,url);}catch(e){
    response=json({error:e.status?e.message:'저장소에 연결하지 못했습니다. 입력은 화면에 남아 있습니다. 다시 저장해 주세요.'},e.status||503);
    if(!e.status)console.error('Study request failed',e.name);
  }
  const headers=new Headers(response.headers);
  headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Vary','Origin');
  if(origin&&allowed.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization,Content-Type');}
  return new Response(response.body,{status:response.status,headers});
}};
