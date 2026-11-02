'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const orders={A:['prepare','T3','T1','T2_1','T2_2','T4','after','finish'],B:['prepare','T3','T2_1','T2_2','T1','T4','after','finish']};
const pointer='wissly-independent-session-v1';
let state,recordId,revision=0,saveTimer,saving=false,pending=[],failure='',loaded=false,conflict=false,queuedBase;
const current=()=>orders[state.order][state.index];
const sequence=()=>orders[state.order];
const link=(file,title,type,subtitle='Download')=>`<a class="download" href="materials/en/${file}" download><span class="file-icon">${type}</span><span>${title}<small>${subtitle}</small></span><span class="dl-arrow" aria-hidden="true">↓</span></a>`;
const clone=v=>JSON.parse(JSON.stringify(v));
const local={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},remove:k=>{try{localStorage.removeItem(k);}catch{}}};
function status(){const el=$('#save-status');el.textContent=failure?'Responses need attention':saving||pending.length?'Saving responses…':loaded?'Responses saved':'';el.classList.toggle('error',!!failure);$('#retry-save').hidden=!failure;$('#retry-save').textContent=conflict?'Review conflicting edits':'Retry saving';el.title=failure;$('#save-error').textContent=failure;$('#save-error').hidden=!failure;}
async function request(path,options={}){const r=await window.studyFetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});let d;try{d=await r.json();}catch{throw new Error('Could not read the server response. Please try again.');}if(!r.ok){const e=new Error(d.error||'Could not save your responses.');e.status=r.status;throw e;}return d;}
function backup(){local.set('draft:'+recordId,JSON.stringify({revision,state,pending}));}
function queueSave(immediate=false){if(!loaded)return;clearTimeout(saveTimer);const job={data:clone(state),base:clone(queuedBase||state),mutation:crypto.randomUUID(),debounced:!immediate};if(!immediate&&pending.length>(saving?1:0)&&pending.at(-1).debounced){job.base=pending.at(-1).base;pending[pending.length-1]=job;}else pending.push(job);queuedBase=clone(state);backup();status();if(immediate)void flush();else saveTimer=setTimeout(flush,450);}
async function flush(){
 clearTimeout(saveTimer);if(saving||!pending.length||conflict)return !failure;saving=true;failure='';status();
 try{while(pending.length){
   const job=pending[0],original=clone(job.data);let d;
   for(let attempt=0;attempt<3;attempt++){
     try{d=await request('/sessions/'+recordId,{method:'PUT',body:JSON.stringify({data:job.data,mutation:job.mutation,revision})});break;}
     catch(e){if(e.status!==409||attempt===2)throw e;const latest=await request('/sessions/'+recordId);const merged=mergeStudySession(job.base,job.data,latest.data);if(!merged)throw e;job.base=latest.data;job.data=merged;revision=latest.revision;backup();}
   }
   revision=d.revision;state=mergeStudySession(original,state,d.data)||state;pending.shift();backup();
 }queuedBase=clone(state);local.remove('draft:'+recordId);
 }catch(e){failure=e.message;conflict=e.status===409;backup();}finally{saving=false;status();}return !failure;
}
async function settle(){clearTimeout(saveTimer);while(saving)await new Promise(r=>setTimeout(r,40));return await flush();}
function answer(key,value){state.answers[key]=value;if(state.answers['unanswered_'+key]===true)state.answers['unanswered_'+key]=false;queueSave(true);}
function modal(body){$('#dialog-body').innerHTML=body;if(!$('#dialog').open)$('#dialog').showModal();bindInputs($('#dialog'));}
function dismiss(){$('#dialog').close();}
function go(i){state.index=i;state.furthest=Math.max(state.furthest,i);queueSave();render();$('#main').focus();window.scrollTo({top:0,behavior:'instant'});}
function next(){go(Math.min(state.index+1,7));}
function backButton(){return '<button class="secondary" id="back-step">Previous step</button>';}
function rating(key,label,max=7,left='Very difficult',right='Very easy',omitText='No response'){
 const selected=state.answers[key],skip=state.answers['unanswered_'+key];
 return `<fieldset class="question"><legend>${esc(label)}</legend><div class="rating" style="--options:${max}">${Array.from({length:max},(_,i)=>`<label><input type="radio" name="${key}" data-answer="${key}" data-number value="${i+1}" ${selected===i+1&&!skip?'checked':''}><span>${i+1}</span></label>`).join('')}</div><div class="scale-labels"><span>1 ${left}</span><span>${max} ${right}</span></div><label class="omit"><input type="checkbox" data-omit="${key}" ${skip?'checked':''}> ${omitText}</label></fieldset>`;
}
function textField(key,label,type='text',extra=''){return `<label class="form-field">${esc(label)}<input data-answer="${key}" type="${type}" value="${esc(state.answers[key]??'')}" ${extra}></label>`;}
function bindInputs(root=document){
 root.querySelectorAll('[data-answer]').forEach(el=>{el.addEventListener(el.type==='text'||el.type==='number'||el.tagName==='TEXTAREA'?'input':'change',()=>{
   const key=el.dataset.answer;
   if(el.type==='number'&&(!el.validity.valid||el.value==='')){if(el.value==='')answer(key,null);return;}
   state.answers[key]=el.hasAttribute('data-number')||el.type==='number'?Number(el.value):el.value;
   if(key==='ui_recovery'){state.answers.ui_recovery_experienced=true;const na=root.querySelector('[data-no-recovery]');if(na)na.checked=false;}
   if(state.answers['unanswered_'+key]===true)state.answers['unanswered_'+key]=false;
   const omit=root.querySelector(`[data-omit="${key}"]`);if(omit)omit.checked=false;
   queueSave(el.type!=='text'&&el.tagName!=='TEXTAREA');
 });el.addEventListener('blur',()=>{if(pending.length)void flush();});});
 root.querySelectorAll('[data-omit]').forEach(el=>el.onchange=()=>{const key=el.dataset.omit;state.answers['unanswered_'+key]=el.checked;if(el.checked){state.answers[key]=null;root.querySelectorAll(`[name="${key}"]`).forEach(r=>r.checked=false);const numeric=root.querySelector(`input[data-answer="${key}"][type="number"]`);if(numeric)numeric.value='';if(key==='ui_recovery'){state.answers.ui_recovery_experienced=null;root.querySelector('[data-no-recovery]').checked=false;}}queueSave(true);});
 root.querySelectorAll('[data-no-recovery]').forEach(el=>el.onchange=()=>{state.answers.ui_recovery_experienced=el.checked?false:null;if(el.checked){state.answers.ui_recovery=null;state.answers.unanswered_ui_recovery=false;root.querySelectorAll('[name="ui_recovery"]').forEach(r=>r.checked=false);root.querySelector('[data-omit="ui_recovery"]').checked=false;}queueSave(true);});
 root.querySelectorAll('[data-format]').forEach(el=>el.onchange=()=>answer('formats',[...root.querySelectorAll('[data-format]:checked')].map(x=>x.value)));
}
function render(){
 const key=current(),names={prepare:'Setup',T3:'보고서',T1:'집계표',T2_1:'발표자료',T4:'인계 준비',after:'Post-task survey',finish:'응답 확인'};
 $('#steps').innerHTML=sequence().map((s,i)=>s==='T2_2'?'':`<button class="step ${s===key||(s==='T2_1'&&key==='T2_2')?'active':''}" data-step="${i}" ${i>state.furthest?'disabled':''}><span class="stepnum">${sequence().slice(0,i+1).filter(x=>x!=='T2_2').length}</span>${names[s]}</button>`).join('');
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.step)));
 const n=sequence().slice(0,state.index+1).filter(x=>x!=='T2_2').length;
 $('#phase').textContent=key==='T2_2'?'발표자료 수정':names[key];$('#counter').textContent=`${String(n).padStart(2,'0')} / 07`;$('#progress-fill').style.width=`${n/7*100}%`;
 if(key==='prepare')renderPrepare();else if(key==='after')renderAfter();else if(key==='finish')renderReview();else renderTask(key);
 bindInputs();$('#back-step')?.addEventListener('click',()=>go(Math.max(0,state.index-1)));status();
}
function renderPrepare(){
 const a=state.answers;
 $('#content').innerHTML=`<h1>Before you start</h1><p class="lead">응답은 자동 저장되며, 나중에 수정할 수 있습니다.</p><div class="columns"><section><div class="card"><h2>위슬리 준비</h2><p>위슬리가 설치되어 있지 않다면 공식 사이트에서 다운로드해 주세요.</p><a class="secondary install-link" href="https://www.wissly.ai/en" target="_blank" rel="noopener noreferrer">Download Wissly · official website</a><div class="checklist"><label><input type="checkbox" class="ready-check" ${state.furthest>0?'checked':''}>I have read the participation information.</label><label><input type="checkbox" class="ready-check" ${state.furthest>0?'checked':''}>The materials and report are open in Wissly.</label></div></div><div class="card"><h2>Pre-task survey</h2>${textField('participant','Participant code (provided by the moderator)','text','maxlength="40"')}${textField('hours','최근 4주간 문서 작성·검토 시간 (주 평균 시간)','number','min="0" max="168" step="0.5"')}<fieldset class="question"><legend>주로 다루는 파일 (Select all that apply)</legend><div class="inline-options">${['엑셀','PPT','워드','기타'].map(x=>`<label><input type="checkbox" data-format value="${x}" ${(a.formats||[]).includes(x)?'checked':''}> ${x}</label>`).join('')}</div></fieldset>${textField('duration','위슬리 사용 기간','text','maxlength="2000" placeholder="예: 처음 사용 / 3개월"')}${textField('days','최근 4주간 위슬리를 사용한 일수','number','min="0" max="28" step="1"')}<label class="form-field">생성형 AI로 문서를 작성한 빈도<select data-answer="ai_frequency"><option value="" disabled ${!a.ai_frequency?'selected':''}>선택해 주세요</option>${['없음','월 1회 미만','월 1–3회','주 1–3회','주 4회 이상'].map(x=>`<option ${a.ai_frequency===x?'selected':''}>${x}</option>`).join('')}</select></label>${textField('office','주로 사용하는 MS오피스 프로그램과 숙련도','text','maxlength="2000" placeholder="예: 엑셀 · 보통"')}${textField('support','화면이나 입력 장치 이용에 필요한 지원 (선택)','text','maxlength="2000"')}<div class="actions"><button class="primary" id="start" ${state.furthest>0?'':'disabled'}>Start the first task</button></div></div></section><aside class="rail"><section class="card"><h2>자료</h2>${link('wissly-study-materials.zip','작업 자료','ZIP','자료 11개')}<details><summary>Moderator settings</summary><p>압축을 풀고 위슬리에서 ‘위슬리_실행프로젝트’ 폴더를 연 Next, ‘검토대상’의 보고서를 열어 주세요.</p><label for="order">Task order</label><select id="order" ${state.furthest>0?'disabled':''}><option value="A" ${state.order==='A'?'selected':''}>A · Report → Spreadsheet → Presentation</option><option value="B" ${state.order==='B'?'selected':''}>B · Report → Presentation → Spreadsheet</option></select></details></section></aside></div>`;
 document.querySelectorAll('.ready-check').forEach(c=>c.onchange=()=>$('#start').disabled=![...document.querySelectorAll('.ready-check')].every(x=>x.checked));$('#start').onclick=next;$('#order').onchange=e=>{state.order=e.target.value;queueSave();render();};
}
function renderTask(key){
 const [title,ps]=window.LEGACY_STUDY_TASKS[key],draft=key==='T2_1';
 $('#content').innerHTML=`<h1>${title}</h1><div class="columns task-columns"><section class="card task-body">${ps.map((p,i)=>`<p ${i===0?'class="context"':''}>${esc(p)}</p>`).join('')}<div class="actions">${backButton()}<button class="primary" id="done">${draft?'초안 작성 Completed':'Task 후 질문'}</button></div><div class="actions"><button class="text-button" id="blocked">진행이 어려운 경우</button>${draft&&state.furthest>=sequence().indexOf('T2_2')?'<button class="text-button" id="reopen-followup">추가 요청 다시 보기</button>':''}</div></section><aside class="rail"><section class="card"><h2>자료</h2>${link(key+'.pdf','과업지','PDF')}${key==='T3'?link('quality-report.docx','검토할 보고서','DOCX'):''}</section></aside></div>`;
 $('#done').onclick=()=>completion(key,false);$('#blocked').onclick=()=>completion(key,true);$('#reopen-followup')?.addEventListener('click',()=>go(sequence().indexOf('T2_2')));
}
function completion(key,blocked,review=false){
 const draft=key==='T2_1',group=key.startsWith('T2')?'T2':key,a=state.answers;
 modal(`<h2 id="dialog-title">${draft?'초안 확인':'Task 후 질문'}</h2>${blocked?'<p>진행자에게 막힌 부분을 알려 주세요. 이 과제를 여기서 마쳐도 응답을 남길 수 있습니다.</p>':''}${draft?'<p>진행자와 확인한 뒤 Next step 넘어가 주세요.</p>':rating('seq_'+group,'방금 과제는 전반적으로 얼마나 쉽거나 어려웠나요?')}${key==='T3'?`<fieldset class="question"><legend>What did you decide to do with the report?</legend><div class="choice-list">${['Share as it is','Revise, then share','Hold off on sharing','I have not decided'].map(v=>`<label><input type="radio" name="decision_T3" data-answer="decision_T3" value="${v}" ${a.decision_T3===v?'checked':''}> ${v}</label>`).join('')}</div></fieldset>${textField('confidence_T3','그 결정에 얼마나 확신하나요? (0–100)','number','min="0" max="100" step="1"')}<p class="small">0 전혀 확신하지 못함 · 100 매우 확신함</p><label class="omit"><input type="checkbox" data-omit="confidence_T3" ${a.unanswered_confidence_T3?'checked':''}> 결정하지 못했거나 No response</label>`:''}${review?'<div class="actions"><button class="primary" value="cancel">Back to response review</button></div>':`<label class="checklist"><span><input type="checkbox" id="confirm-step"> 진행자 확인 Completed</span></label><div class="actions"><button class="secondary" value="cancel">Back to the task</button><button type="button" class="primary" id="advance" disabled>${draft&&!blocked?'추가 요청 열기':'Next step'}</button></div>`}`);
 if(review)return;
 $('#confirm-step').onchange=e=>$('#advance').disabled=!e.target.checked;
 $('#advance').onclick=()=>{dismiss();if(draft&&blocked){state.skipped=true;go(state.index+2);}else next();};
}
function renderAfter(){
 const page=state.surveyPage,Q=window.STUDY_QUESTIONS;let body;
 if(page<2){const from=page*5;body=Q.usability.slice(from,from+5).map((q,i)=>rating('usability_'+(from+i+1),q,5,'Strongly disagree','Strongly agree')).join('');}
 else if(page===2)body='<p>위슬리 화면을 사용한 경험에 대해 답해 주세요.</p>'+Q.interface.map(([k,q])=>rating('ui_'+k,q,5,'Strongly disagree','Strongly agree')+(k==='recovery'?`<label class="omit"><input type="checkbox" data-no-recovery ${state.answers.ui_recovery_experienced===false?'checked':''}> 잘못된 선택이나 문제가 발생한 적 없음</label>`:'')).join('');
 else if(page===3)body=Q.results.map(([k,q])=>rating('post_'+k,q,7,'Strongly disagree','Strongly agree')).join('');
 else body=`<p>이번 테스트 Previous의 평소 습관을 떠올려 주세요. AI가 만든 결과의 Next 항목을 얼마나 확인했나요?</p>`+Q.habits.map(([k,q])=>rating('post_'+k,q,7,'전혀 확인하지 않음','항상 확인함')).join('')+`<label class="form-field">추가 의견 (선택)<textarea data-answer="comment" maxlength="2000" rows="4">${esc(state.answers.comment||'')}</textarea></label>`;
 $('#content').innerHTML=`<h1>Post-task survey</h1><p class="lead">${page+1} / 5 · Your answers are saved automatically. You can return to a previous screen to edit them.</p><section class="card survey-card">${body}<div class="actions"><button class="secondary" id="survey-back">Previous</button><button class="primary" id="survey-next">${page===4?'응답 확인':'Next'}</button></div></section>`;
 $('#survey-back').onclick=()=>{if(page===0)go(5);else{state.surveyPage--;queueSave();render();$('#main').focus();window.scrollTo(0,0);}};
 $('#survey-next').onclick=()=>{if(page===4)next();else{state.surveyPage++;queueSave();render();$('#main').focus();window.scrollTo(0,0);}};
}
function renderReview(){
 const ratings=['seq_T3','seq_T1','seq_T2','seq_T4',...Array.from({length:10},(_,i)=>'usability_'+(i+1)),...window.STUDY_QUESTIONS.interface.map(([k])=>'ui_'+k),...window.STUDY_QUESTIONS.results.map(([k])=>'post_'+k),...window.STUDY_QUESTIONS.habits.map(([k])=>'post_'+k)];
 const missing=ratings.filter(k=>state.answers[k]==null&&!state.answers['unanswered_'+k]&&!(k==='ui_recovery'&&state.answers.ui_recovery_experienced===false)).length;
 $('#content').innerHTML=`<h1>응답 확인</h1><p class="lead">저장된 답은 계속 수정할 수 있습니다.</p><section class="card"><p>${missing?`Unanswered 문항이 ${missing}.`:'Task 후 질문과 Post-task survey에 응답했습니다.'}</p><div class="review-grid">${[['T3','보고서'],['T1','집계표'],['T2','발표자료'],['T4','인계 준비']].map(([k,t])=>`<button class="secondary review-task" data-review="${k}">${t}<small>난이도 응답: ${state.answers['seq_'+k]??'Unanswered'}</small></button>`).join('')}</div><div class="actions"><button class="secondary" id="edit-pre">Edit pre-task survey</button><button class="primary" id="edit-post">Edit post-task survey</button></div></section><section class="card"><h2>인터뷰</h2><p>진행자가 Task 중의 화면을 보며 질문합니다. 당시의 생각과 판단을 말씀해 주세요.</p><p class="small">응답 파일은 아래에서 내려받을 수 있습니다. 내려받은 뒤에도 수정할 수 있습니다.</p><div class="actions"><button class="secondary" id="export">응답 Download</button><button class="text-button" id="new-record">Next 참가자 준비</button></div></section>`;
 document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>completion(b.dataset.review==='T2'?'T2_2':b.dataset.review,false,true));$('#edit-pre').onclick=()=>go(0);$('#edit-post').onclick=()=>{state.surveyPage=0;go(6);};$('#export').onclick=exportRecord;$('#new-record').onclick=newRecord;
}
async function exportRecord(){if(!await settle()){modal(`<h2 id="dialog-title">Please check your saved responses</h2><p>${esc(failure)}</p><button class="primary" value="cancel">Close</button>`);return;}try{const d=await request('/sessions/'+recordId+'/history');const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='wissly-'+recordId.slice(0,8)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){failure=e.message;status();}}
async function openRecord(id){if(loaded&&!await settle())return;loaded=false;status();try{const d=await request('/sessions/'+id);recordId=d.id;revision=d.revision;state=d.data;pending=[];failure='';conflict=false;local.set(pointer,id);const draft=local.get('draft:'+id);if(draft){const x=JSON.parse(draft);if(x.pending?.length){state=x.state;pending=x.pending;if(x.revision!==revision&&!pending[0].base){failure='Unsaved entries differ from responses in another window. Select Review conflicting edits to keep your entries.';conflict=true;}else revision=x.revision;}}queuedBase=clone(state);loaded=true;render();if(pending.length)void flush();}catch(e){failure=e.message;$('#content').innerHTML=`<h1>Could not load this record</h1><p>${esc(e.message)}</p><div class="actions"><button class="secondary" id="load-retry">Try loading again</button><button class="primary" id="load-new">Start a new record</button></div>`;$('#load-retry').onclick=()=>openRecord(id);$('#load-new').onclick=createRecord;status();}}
async function createRecord(){const id=crypto.randomUUID();local.set(pointer,id);try{await request('/sessions',{method:'POST',body:JSON.stringify({id,language:document.documentElement.lang})});await openRecord(id);}catch(e){failure=e.message;$('#content').innerHTML=`<h1>Please check your connection</h1><p>${esc(e.message)}</p><button class="primary" id="create-retry">Reconnect</button>`;$('#create-retry').onclick=async()=>{try{await request('/sessions',{method:'POST',body:JSON.stringify({id,language:document.documentElement.lang})});await openRecord(id);}catch(e){failure=e.message;status();}};status();}}
function newRecord(){modal('<h2 id="dialog-title">New study record</h2><p>Your current responses will be kept. You can reopen them from Response records after starting a new record.</p><div class="actions"><button class="secondary" value="cancel">Cancel</button><button type="button" class="primary" id="create-record">Create a new record</button></div>');$('#create-record').onclick=async()=>{if(!await settle())return;dismiss();await createRecord();};}
$('#records').onclick=async()=>{try{const d=await request('/sessions');modal(`<h2 id="dialog-title">Response records</h2><p class="small">Open a record to edit or download it.</p><div class="record-list">${d.sessions.map(s=>`<button type="button" class="secondary" data-record="${s.id}">${esc(s.label)}<small>${new Date(s.updatedAt).toLocaleString('en-US')}</small></button>`).join('')}</div><div class="actions"><button type="button" class="primary" id="start-new">New record</button></div>`);document.querySelectorAll('[data-record]').forEach(b=>b.onclick=async()=>{if(!await settle())return;dismiss();await openRecord(b.dataset.record);});$('#start-new').onclick=newRecord;}catch(e){failure=e.message;status();}};
$('#dialog').addEventListener('close',()=>{if(loaded&&current()==='finish')render();});
$('#help').onclick=()=>modal('<h2 id="dialog-title">Help</h2><p>Tell the moderator if you need help or a break. You can stop participating at any time.</p><p>Your answers are saved automatically. Return to an earlier step or open Response records to edit them.</p><button class="primary" value="cancel">Close</button>');
$('#retry-save').onclick=()=>{
 if(!conflict){void flush();return;}
 modal('<h2 id="dialog-title">This record was edited in another window</h2><p>Saving has paused to avoid overwriting responses from another window. You can keep your current entries as a separate record.</p><div class="actions"><button class="secondary" value="cancel">Go back</button><button type="button" class="primary" id="keep-copy">Save these entries as a new record</button></div>');
 $('#keep-copy').onclick=async()=>{const id=crypto.randomUUID(),data=clone(state);$('#keep-copy').disabled=true;try{await request('/sessions',{method:'POST',body:JSON.stringify({id,version:data.version})});await request('/sessions/'+id,{method:'PUT',body:JSON.stringify({data,revision:0,mutation:crypto.randomUUID()})});local.remove('draft:'+recordId);pending=[];conflict=false;failure='';dismiss();await openRecord(id);}catch(e){failure=e.message;status();$('#keep-copy').disabled=false;}};
};
window.addEventListener('beforeunload',e=>{if(pending.length||saving){backup();e.preventDefault();e.returnValue='';}});
window.addEventListener('online',()=>{if(pending.length)void flush();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&loaded)void flush();});
async function init(){const id=local.get(pointer);if(id)await openRecord(id);else await createRecord();}
// app-v4 installs version-specific screens, then initializes the shared persistence layer.
