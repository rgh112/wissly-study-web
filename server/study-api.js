import { db, owned, record } from './database.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const emptyData=(version='study-5',language)=>({order:'A',index:0,furthest:0,skipped:false,surveyPage:0,answers:language?{study_language:language}:{},version});
export function validData(d) {
  if(!d || !['A','B'].includes(d.order) || !Number.isInteger(d.index) || d.index<0 || d.index>7 || !Number.isInteger(d.furthest) || d.furthest<d.index || d.furthest>7 || !Number.isInteger(d.surveyPage) || d.surveyPage<0 || d.surveyPage>(d.version==='study-5'?1:d.version==='study-4'?2:4) || typeof d.skipped!=='boolean' || !['study-3','study-4','study-5'].includes(d.version)) return false;
  if(!d.answers || Array.isArray(d.answers) || typeof d.answers!=='object' || Object.keys(d.answers).length>140) return false;
  for(const [k,v] of Object.entries(d.answers)) {
    if(v===null) continue;
    if(k==='study_language'){if(d.version!=='study-5'||!['ko','en'].includes(v))return false;}
    else if(d.version==='study-5' && /^(v5_|extra_v5_)/.test(k)) {
      if(/^v5_(start|status|context|preview|resume|changes|recovery|export)$/.test(k)){if(v!=='na'&&(!Number.isInteger(v)||v<1||v>5))return false;}
      else if(/^extra_v5_(start|status|context|preview|resume|changes|recovery|export)$/.test(k)||k==='v5_comment'||/^v5_note_(recall|smooth|observed|report|sheet|draft|revision|handoff|survey|work|impact|future|priority|closing)$/.test(k)){if(typeof v!=='string'||v.length>2000)return false;}
      else if(k==='v5_interview_started_at'){
        if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)||!Number.isFinite(Date.parse(v)))return false;
        if(['start','status','context','preview','resume','changes','recovery','export'].some(key=>d.answers['v5_'+key]==null||d.answers['v5_'+key]===''))return false;
      }
      else return false;
    }
    else if(['study-4','study-5'].includes(d.version) && /^extra_/.test(k)) {
      if(!/^extra_(pre_ai_(frequency|tools|purposes|documents|workflow)|decision_T3|v4_(start|labels|status|context|preview|version|recovery|export|content|reuse|(seq|outcome)_T(1|3|4|2_1|2_2)|handoff_(word|excel|ppt)))$/.test(k)||typeof v!=='string'||v.length>2000)return false;
    }
    else if(['study-4','study-5'].includes(d.version) && /^pre_ai_/.test(k)) {
      const options={frequency:['never','inactive','few','weekly','often','daily'],tools:['chatgpt','claude','gemini','copilot','other'],purposes:['learn','write','summarize','translate','data','code','image','other'],documents:['copy','read','edit','create','none'],workflow:['use','followup','manual','reference','varies','other','none']};
      const field=k.slice(7);
      if(field==='comment'){if(typeof v!=='string'||v.length>2000)return false;}
      else if(field==='frequency'){if(!options.frequency.includes(v))return false;}
      else if(!options[field]||!Array.isArray(v)||v.length>options[field].length||new Set(v).size!==v.length||v.some(x=>!options[field].includes(x))||(['documents','workflow'].includes(field)&&v.includes('none')&&v.length>1))return false;
    }
    else if(['study-4','study-5'].includes(d.version) && /^v4_/.test(k)) {
      if(/^v4_(start|labels|status|context|preview|version|recovery|export|content|reuse)$/.test(k)){if(v!=='na'&&(!Number.isInteger(v)||v<1||v>5))return false;}
      else if(/^v4_seq_T(1|3|4|2_1|2_2)$/.test(k)){if(v!=='na'&&(!Number.isInteger(v)||v<1||v>7))return false;}
      else if(/^v4_outcome_T(1|3|4|2_1|2_2)$/.test(k)){if(!['complete','partial','blocked','not_attempted'].includes(v))return false;}
      else if(/^v4_(artifact|event|reason)_T(1|3|4|2_1|2_2)$/.test(k)||/^v4_interview_[1-6]$/.test(k)||['v4_folder','v4_office','v4_environment','v4_comment'].includes(k)){if(typeof v!=='string'||v.length>2000)return false;}
      else if(/^v4_ready_(materials|folder|app|consent)$/.test(k)||k==='v4_draft_opened'){if(typeof v!=='boolean')return false;}
      else if(/^v4_handoff_(word|excel|ppt)$/.test(k)){if(!['ready','rework','cannot_open','no_file','no_app'].includes(v))return false;}
      else return false;
    }
    else if(/^seq_T[1234]$/.test(k) || /^post_(accuracy|evidence|share|reuse|numbers|sources|format)$/.test(k)) {if(d.version!=='study-3'||!Number.isInteger(v)||v<1||v>7)return false;}
    else if(/^usability_([1-9]|10)$/.test(k)||/^ui_(start|status|version|recovery)$/.test(k)){if(!Number.isInteger(v)||v<1||v>5)return false;}
    else if(k==='confidence_T3'){if(!Number.isInteger(v)||v<0||v>100)return false;}
    else if(k==='ui_recovery_experienced'){if(typeof v!=='boolean')return false;}
    else if(['hours','days'].includes(k)){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>(k==='days'?28:168))return false;}
    else if(['participant','duration','office','support','comment'].includes(k)){if(typeof v!=='string'||v.length>(k==='participant'?40:2000))return false;}
    else if(k==='formats'){if(!Array.isArray(v)||v.some(x=>!['엑셀','PPT','워드','기타'].includes(x))||v.length>4)return false;}
    else if(k==='ai_frequency'){if(!['없음','월 1회 미만','월 1–3회','주 1–3회','주 4회 이상'].includes(v))return false;}
    else if(k==='decision_T3'){if(!['이대로 전달','수정 후 전달','전달 보류','결정하지 못함'].includes(v))return false;}
    else if(/^unanswered_(seq_T[1234]|confidence_T3|usability_([1-9]|10)|ui_(start|status|version|recovery)|post_(accuracy|evidence|share|reuse|numbers|sources|format))$/.test(k)){if(v!==true&&v!==false)return false;}
    else return false;
  }
  return true;
}
export async function api(request,env,url,owner) {
  if(!owner)return json({error:'재접속 코드를 입력해 응답을 다시 열어 주세요.'},401);
  if(!['GET','POST','PUT'].includes(request.method))return json({error:'지원하지 않는 요청입니다.'},405);
  if(request.method!=='GET') {
    // Origin and authorization are checked by the shared API entrypoint.
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON 형식이 필요합니다.'},415);
  }
  if(url.pathname==='/api/sessions' && request.method==='GET') {
    const result=await db(env).prepare('SELECT id, data, revision, updated_at FROM study_sessions WHERE owner = ? ORDER BY updated_at DESC LIMIT 100').bind(owner).all();
    return json({sessions:result.results.map(r=>({id:r.id,label:JSON.parse(r.data).answers?.participant||r.id.slice(0,8),updatedAt:r.updated_at}))});
  }
  let body;
  if(request.method!=='GET') { const raw=await request.text(); if(raw.length>192000)return json({error:'입력 내용이 너무 깁니다.'},413);try{body=JSON.parse(raw);}catch{return json({error:'입력 형식을 확인해 주세요.'},400);} }
  if(url.pathname==='/api/sessions' && request.method==='POST') {
    if(!uuid.test(body?.id||''))return json({error:'기록 번호가 올바르지 않습니다.'},400);
    if(body.version && !['study-3','study-4','study-5'].includes(body.version))return json({error:'설문 버전이 올바르지 않습니다.'},400);
    if(body.language && !['ko','en'].includes(body.language))return json({error:'지원하지 않는 언어입니다.'},400);
    const now=new Date().toISOString();
    await db(env).prepare('INSERT INTO study_sessions (id, owner, data, revision, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(id) DO NOTHING').bind(body.id,owner,JSON.stringify({...emptyData('study-5',body.language||'ko'),answers:{study_language:body.language||'ko',participant:env.participantLabel}}),now,now).run();
    const row=await owned(env,body.id,owner);return row?json(record(row),201):json({error:'기록을 열 수 없습니다.'},404);
  }
  const match=url.pathname.match(/^\/api\/sessions\/([a-f0-9-]+)(\/history)?$/i);
  if(!match || !uuid.test(match[1]))return json({error:'기록을 찾을 수 없습니다.'},404);
  const row=await owned(env,match[1],owner);if(!row)return json({error:'기록을 찾을 수 없습니다.'},404);
  if(request.method==='GET') {
    if(match[2]){const h=await db(env).prepare('SELECT revision, data, created_at FROM study_revisions WHERE session_id = ? ORDER BY revision').bind(row.id).all();return json({record:record(row),history:h.results.map(r=>({revision:r.revision,data:JSON.parse(r.data),at:r.created_at}))});}
    return json(record(row));
  }
  if(request.method!=='PUT'||match[2])return json({error:'지원하지 않는 요청입니다.'},405);
  if(!Number.isInteger(body?.revision)||!uuid.test(body?.mutation||'')||!validData(body?.data))return json({error:'응답 내용을 확인해 주세요.'},400);
  if(JSON.parse(row.data).version!==body.data.version)return json({error:'기존 기록의 설문 버전은 변경할 수 없습니다. 새 기록을 만들어 주세요.'},400);
  const prior=await db(env).prepare('SELECT id FROM study_revisions WHERE id = ? AND session_id = ?').bind(body.mutation,row.id).first();
  if(prior)return json(record(await owned(env,row.id,owner)));
  if(row.revision!==body.revision)return json({error:'다른 창에서 이 기록이 수정되었습니다. 저장된 기록을 다시 열어 주세요.',conflict:true},409);
  const started=JSON.parse(row.data).answers.v5_interview_started_at;
  if(started&&body.data.answers.v5_interview_started_at!==started)return json({error:'인터뷰 시작 기록은 유지해야 합니다. 설문 답변은 계속 수정할 수 있습니다.'},400);
  const now=new Date().toISOString(),data=JSON.stringify(body.data);
  const results=await db(env).batch([
    db(env).prepare('UPDATE study_sessions SET data = ?, revision = revision + 1, mutation = ?, updated_at = ? WHERE id = ? AND owner = ? AND revision = ?').bind(data,body.mutation,now,row.id,owner,body.revision),
    db(env).prepare('INSERT INTO study_revisions (id, session_id, revision, data, created_at) SELECT ?, id, revision, data, updated_at FROM study_sessions WHERE id = ? AND owner = ? AND mutation = ?').bind(body.mutation,row.id,owner,body.mutation)
  ]);
  if(!results[0].meta.changes)return json({error:'다른 창에서 이 기록이 수정되었습니다.',conflict:true},409);
  return json(record(await owned(env,row.id,owner)));
}
