'use strict';
const root=document.querySelector('#admin-main');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let adminToken=sessionStorage.getItem('wissly-moderator-access')||'';
const phase=['준비 · 사전 설문','과제 진행','과제 진행','과제 진행','과제 진행','인계 준비','사후 설문','마지막 인터뷰'];
const questionNames={participant:'참여자 코드',pre_ai_frequency:'생성형 AI 사용 빈도',pre_ai_tools:'사용하는 생성형 AI',pre_ai_purposes:'생성형 AI 사용 목적',study_language:'설문 언어',v5_interview_started_at:'인터뷰 시작 시각',v5_comment:'설문 추가 의견',pre_ai_comment:'사전 설문 추가 의견',decision_T3:'보고서 전달 판단'};
for(const group of window.STUDY_V5.pages)for(const [k,q] of group.items)questionNames['v5_'+k]=q;
for(const item of window.STUDY_V5.interview)questionNames['v5_note_'+item.key]='인터뷰 메모 · '+item.title;
for(const [key,name] of Object.entries({T3:'보고서',T1:'집계표',T2_1:'발표자료 초안',T2_2:'발표자료 수정',T4:'인계 준비'}))for(const [prefix,description] of Object.entries({outcome:'진행 결과',seq:'쉬움 정도 (1–7)',artifact:'파일 이름',reason:'멈춘 상황',event:'기억에 남는 상황'}))questionNames['v4_'+prefix+'_'+key]=name+' · '+description;
const label=key=>key.startsWith('extra_')?(questionNames[key.slice(6)]||key.slice(6))+' · 추가 의견':questionNames[key]||key;
const value=(v,key)=>{const options=window.STUDY_V5.pre.find(q=>q.key===key)?.options;if(options)return Array.isArray(v)?v.map(x=>options[x]||x).join(', '):options[v]||String(v);return Array.isArray(v)?v.join(', '):v==null?'미응답':typeof v==='boolean'?(v?'예':'아니요'):({na:'경험 없음 / 판단 어려움',complete:'완료',partial:'일부 진행',not_attempted:'시작하지 못함'}[v]||String(v));};
async function api(path,options={}){const r=await window.studyFetch('/admin'+path,options,adminToken);if(!r.ok){const d=await r.json();throw Object.assign(new Error(d.error||'기록을 불러오지 못했습니다.'),{status:r.status});}return r;}
function login(message=''){
  root.innerHTML=`<h1>진행자 화면</h1><p class="lead">참여 기록과 설문 응답을 확인하고 내려받습니다.</p><form class="card" id="admin-login"><label class="form-field" for="admin-key">진행자 키<input type="password" id="admin-key" autocomplete="current-password" required></label><button class="primary">열기</button><p class="form-error" role="alert">${safe(message)}</p></form>`;
  document.querySelector('#admin-login').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const d=await(await api('/login',{method:'POST',body:JSON.stringify({key:document.querySelector('#admin-key').value})})).json();adminToken=d.token;sessionStorage.setItem('wissly-moderator-access',adminToken);await dashboard();}catch(error){login(error.message);}};
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportAll(format){try{const response=await api('/export'+(format==='csv'?'?format=csv':''));download(await response.blob(),'wissly-responses-'+new Date().toISOString().slice(0,10)+'.'+format);}catch(e){document.querySelector('#admin-error').textContent=e.message;}}
async function dashboard(){
  try{
    const d=await(await api('/sessions')).json();
    root.innerHTML=`<h1>참여 기록</h1><div class="metric-row"><div><strong>${new Set(d.sessions.map(s=>s.participantCode)).size}</strong>응답을 시작한 참여자</div><div><strong>${d.sessions.length}</strong>저장된 기록</div><div><strong>${d.sessions.filter(s=>s.data.answers.v5_interview_started_at).length}</strong>인터뷰 시작 기록</div></div><div class="toolbar"><button class="secondary" id="refresh">새로고침</button><button class="primary" id="export-json">전체 응답·수정 이력</button><button class="secondary" id="export-csv">현재 응답 CSV</button><button class="quiet" id="admin-leave">나가기</button></div><p class="small">기록 수는 위슬리의 실행·재시도 횟수가 아닙니다. 화면 조작과 음성은 자동 수집하지 않습니다.</p><p id="admin-error" class="form-error" role="alert"></p><section class="card table-scroll">${d.sessions.length?`<table><thead><tr><th>참여자</th><th>진행 단계</th><th>언어 / 순서</th><th>마지막 저장</th><th>수정 이력</th><th></th></tr></thead><tbody>${d.sessions.map(s=>`<tr><td>${safe(s.participantCode)}${s.data.answers.participant!==s.participantCode?'<br>'+safe(s.data.answers.participant):''}</td><td>${phase[s.data.index]}${s.data.answers.v5_interview_started_at?'<br>인터뷰 시작함':''}</td><td>${safe(s.data.answers.study_language)} / ${safe(s.data.order)}</td><td>${safe(new Date(s.updatedAt).toLocaleString('ko-KR'))}</td><td>${s.revision}회</td><td><button class="secondary" data-view="${s.id}">응답 보기</button></td></tr>`).join('')}</tbody></table>`:'<p class="empty-state">아직 저장된 응답이 없습니다.</p>'}</section><div id="record-detail"></div>`;
    document.querySelector('#refresh').onclick=dashboard;
    document.querySelector('#export-json').onclick=()=>exportAll('json');document.querySelector('#export-csv').onclick=()=>exportAll('csv');
    document.querySelector('#admin-leave').onclick=async()=>{try{await api('/logout',{method:'POST',body:'{}'});}finally{sessionStorage.removeItem('wissly-moderator-access');adminToken='';login();}};
    document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>detail(b.dataset.view));
  }catch(e){if(e.status===401){sessionStorage.removeItem('wissly-moderator-access');adminToken='';login();}else login(e.message);}
}
async function detail(id){
  try{
    const d=await(await api('/sessions/'+id)).json();
    const target=document.querySelector('#record-detail');
    const fields=answers=>Object.entries(answers).map(([key,v])=>`<tr><th>${safe(label(key))}</th><td class="admin-detail">${safe(value(v,key))}</td></tr>`).join('');
    target.innerHTML=`<section class="card"><h2>${safe(d.participantCode)} 응답</h2><button class="secondary" id="download-one">이 기록 내려받기</button><table><tbody>${fields(d.record.data.answers)}</tbody></table><details><summary>인터뷰 시작 전 설문</summary>${d.interview.surveyAtStart?`<table><tbody>${fields(d.interview.surveyAtStart)}</tbody></table>`:'<p>인터뷰를 아직 시작하지 않았습니다.</p>'}</details><details><summary>수정 이력 ${d.history.length}개</summary>${d.history.map((h,i)=>{const previous=i?d.history[i-1].data.answers:{};const changed=Object.fromEntries(Object.entries(h.data.answers).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(previous[k])));return `<details><summary>${h.revision} · ${safe(new Date(h.at).toLocaleString('ko-KR'))}</summary><table><tbody>${fields(changed)}</tbody></table></details>`;}).join('')}</details></section>`;
    document.querySelector('#download-one').onclick=()=>download(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),'wissly-'+d.participantCode+'-'+id.slice(0,8)+'.json');target.scrollIntoView({behavior:'smooth'});
  }catch(e){document.querySelector('#admin-error').textContent=e.message;}
}
if(!window.studyBackendReady)root.innerHTML='<h1>진행자 화면</h1><p>응답 저장소를 연결하는 중입니다. 연결 후 참여 기록을 확인할 수 있습니다.</p>';
else if(adminToken)void dashboard();else login();
