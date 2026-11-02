'use strict';
const previousUI={render,renderPrepare,renderAfter,renderReview,completion,exportRecord};
const isV5=()=>state.version==='study-5';
const preQuestions=()=>isV5()?window.STUDY_V5.pre:window.STUDY_PRE;
const stageOutcomes=()=>isV5()?{complete:'마쳤습니다.',partial:'진행했지만 마치지는 못했습니다.',not_attempted:'시작하지 못했습니다.'}:outcomes;
const postKeys=()=>window.STUDY_V5.pages.flatMap(p=>p.items.map(([k])=>'v5_'+k));
const interviewStarted=()=>!!state.answers.v5_interview_started_at;
const postComplete=()=>postKeys().every(v4Answered);

render=function(){
 previousUI.render();
 if(!isV5()){
  if(state.version==='study-4')$('#content').insertAdjacentHTML('afterbegin','<p class="version-note">이전 설문 기록입니다. 새 구성은 ‘응답 기록 → 새 기록’에서 시작해 주세요.</p>');
  return;
 }
 if(current()==='prepare')$('#phase').textContent='준비 · 사전 설문';
 if(current()==='finish')$('#phase').textContent='마지막 인터뷰';
 $('#steps').querySelectorAll('[data-step]').forEach(b=>{
  const key=sequence()[Number(b.dataset.step)];
  if(key==='prepare'||key==='finish')b.innerHTML=`<span class="stepnum" aria-hidden="true">·</span>${key==='prepare'?'준비 · 사전 설문':'마지막 인터뷰'}`;
 });
};

renderPrepare=function(){
 previousUI.renderPrepare();if(!isV5())return;
 $('#content .lead').textContent='자료를 준비한 뒤 사전 설문에 답해 주세요. 과제와 사후 설문을 마치면 진행자와 인터뷰합니다.';
 const first=$('#content .columns > section > .card');
 first.insertAdjacentHTML('beforeend','<p class="small">위슬리를 사용하는 과정을 살펴보는 테스트입니다. 평소처럼 작업하면서 생각나는 내용을 편하게 말씀해 주세요. 막히거나 그만하고 싶으면 진행자에게 알려 주세요.</p>');
 first.nextElementSibling.querySelector('p.small').textContent='생성형 AI 사용 경험을 선택해 주세요. 설명을 덧붙이는 것은 선택 사항입니다.';
};

completion=function(key,blocked,review=false){
 previousUI.completion(key,blocked,review);if(!isV5())return;
 const reason=$('#incomplete-reason .form-field');
 if(reason)reason.firstChild.textContent='멈췄거나 시작하지 못한 상황 (선택)';
};

renderAfter=function(){
 if(!isV5())return previousUI.renderAfter();
 const page=state.surveyPage,groups=window.STUDY_V5.pages,group=groups[page],last=page===groups.length-1;
 $('#content').innerHTML=`<h1>사후 설문</h1><p class="lead">${page+1} / ${groups.length} · 응답은 자동 저장되며 이전 화면으로 돌아가 수정할 수 있습니다.</p><section class="card survey-card"><h2>${esc(group.title)}</h2><p class="small">오늘 사용한 경험을 바탕으로 답해 주세요. 경험하지 않았거나 판단하기 어려운 항목은 ‘판단하기 어려움’을 선택해 주세요.</p>${group.items.map(([k,q])=>v4Rating('v5_'+k,q)).join('')}${last?note('v5_comment','설문에 덧붙이고 싶은 내용 (선택)'):''}<p class="form-error" role="alert"></p><div class="actions"><button class="secondary" id="survey-back">이전</button><button class="primary" id="survey-next">${last?'인터뷰 안내로':'다음'}</button></div></section>`;
 $('#content .omit').closest('.survey-card').querySelectorAll('.omit').forEach(el=>{el.lastChild.textContent=' 해당 경험이 없거나 판단하기 어려움';});
 $('#survey-back').onclick=()=>{if(page===0)go(5);else{state.surveyPage--;queueSave();render();window.scrollTo(0,0);}};
 $('#survey-next').onclick=()=>{
  if(focusMissing($('#content'),group.items.map(([k])=>'v5_'+k)))return;
  if(last)next();else{state.surveyPage++;queueSave();render();$('#main').focus();window.scrollTo(0,0);}
 };
};

function interviewQuestion(item){
 const notAttempted=item.task&&state.answers['v4_outcome_'+item.task]==='not_attempted';
 return `${item.section?`<h3 class="interview-section">${esc(item.section)}</h3>`:''}<details class="interview-item"><summary>${esc(item.title)}${notAttempted?' · 미시도':''}</summary>${notAttempted?'<p class="small">이 단계는 시도하지 않았습니다. 수행한 경험을 가정해 묻지 않습니다.</p><p>어떤 상황 때문에 이 단계를 시작하지 못하셨나요?</p>':`<p class="interview-question">${esc(item.question)}</p>${item.probes.length?`<p class="small">필요한 경우에만 하나씩 확인</p><ul class="probe-list">${item.probes.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`:''}${item.rule?`<p class="small">${esc(item.rule)}</p>`:''}`}<details class="answer-note"><summary>진행자 메모 (선택)</summary>${note('v5_note_'+item.key,'화면·시각·발화 등 기록할 내용')}</details></details>`;
}

renderReview=function(){
 if(!isV5())return previousUI.renderReview();
 const missing=postKeys().filter(k=>!v4Answered(k)).length;
 $('#content').innerHTML=`<h1>마지막 인터뷰</h1><p class="lead">이제 진행자와 오늘 작업에 관해 이야기합니다. 답변은 말로 해 주시면 됩니다.</p>${missing?`<section class="card"><p>사후 설문에 아직 답하지 않은 질문이 ${missing}개 있습니다.</p><button class="primary" id="finish-survey">사후 설문으로</button></section>`:`<section class="card"><h2>진행자와 함께 시작해 주세요</h2><p>작업했던 화면이나 만든 파일을 보면서 당시의 생각과 판단을 이야기해 주세요.</p>${interviewStarted()?'<p class="small">인터뷰를 시작한 기록이 있습니다. 진행자는 아래에서 질문을 다시 펼칠 수 있습니다.</p>':'<p class="small">진행자는 준비가 되면 아래 버튼을 눌러 주세요.</p><button class="secondary" id="start-interview">진행자: 인터뷰 시작</button><p id="interview-error" class="form-error" role="alert"></p>'}</section>${interviewStarted()?`<details class="card moderator-guide" id="interview-guide"><summary>진행자용 질문 펼치기</summary><p>참가자가 먼저 경험을 이야기하도록 합니다. 추가 질문은 관찰과 답변에서 아직 확인되지 않은 내용만, 한 번에 하나씩 묻습니다. 이미 충분히 이야기한 내용은 생략합니다.</p><p class="small">작업했던 화면과 파일을 함께 봅니다. 수행하지 못한 단계는 이유와 도달한 지점만 확인하고, 설문 점수를 바꾸도록 유도하지 않습니다.</p>${window.STUDY_V5.interview.map(interviewQuestion).join('')}</details>`:''}`}
 <details class="card response-review"><summary>설문 응답 확인·수정</summary><p class="small">쉬움 정도는 1 매우 어려움, 7 매우 쉬움입니다. 응답은 인터뷰 후에도 수정할 수 있습니다.</p><div class="review-grid">${sequence().filter(k=>k.startsWith('T')).map(k=>`<button class="secondary review-task" data-review="${k}">${taskNames[k]}<small>${outcomes[state.answers['v4_outcome_'+k]]||'아직 기록하지 않음'} · ${state.answers['v4_seq_'+k]==='na'?'시도하지 않음':state.answers['v4_seq_'+k]?`쉬움 정도 ${state.answers['v4_seq_'+k]} / 7`:'미응답'}</small></button>`).join('')}</div><div class="actions"><button class="secondary" id="edit-pre">사전 설문 수정</button><button class="secondary" id="edit-post">사후 설문 수정</button></div><details class="survey-summary"><summary>사후 설문 답변 보기</summary>${window.STUDY_V5.pages.flatMap(p=>p.items).map(([k,q])=>`<p>${esc(q)}<br><strong>${state.answers['v5_'+k]==='na'?'판단하기 어려움':v4Answered('v5_'+k)?state.answers['v5_'+k]+' / 5':'미응답'}</strong>${state.answers['extra_v5_'+k]?`<br>${esc(state.answers['extra_v5_'+k])}`:''}</p>`).join('')}</details></details>
 <section class="card"><h2>응답 기록</h2><p class="small">진행자에게 전달할 응답 파일을 내려받을 수 있습니다. 이후 답을 수정했다면 다시 내려받아 주세요.</p><div class="actions"><button class="primary" id="export">응답 기록 내려받기</button><button class="text-button" id="new-record">새 테스트 기록</button></div><p class="small status-note">파일에는 설문 답변과 수정 이력, 인터뷰 시작 시점, 작성한 진행자 메모가 포함됩니다.</p></section>`;
 document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>completion(b.dataset.review,false,true));
 const editPost=()=>{state.surveyPage=0;go(6);};
 $('#edit-pre').onclick=()=>go(0);$('#edit-post').onclick=editPost;
 if($('#finish-survey'))$('#finish-survey').onclick=editPost;
 $('#export').onclick=exportRecord;$('#new-record').onclick=newRecord;
 if($('#start-interview'))$('#start-interview').onclick=async()=>{
  const button=$('#start-interview');button.disabled=true;
  if(!interviewStarted())answer('v5_interview_started_at',new Date().toISOString());
  if(!await settle()){$('#interview-error').textContent='인터뷰 시작 기록을 저장하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.';button.disabled=false;return;}
  render();$('#interview-guide').open=true;$('#interview-guide summary').focus();
 };
};

exportRecord=async function(){
 if(!isV5())return previousUI.exportRecord();
 if(!await settle()){modal(`<h2 id="dialog-title">저장을 확인해 주세요</h2><p>${esc(failure)}</p><button class="primary" value="cancel">닫기</button>`);return;}
 try{
  const d=await request('/sessions/'+recordId+'/history');
  const first=d.history.find(r=>r.data.answers.v5_interview_started_at);
  d.interview={startedAt:d.record.data.answers.v5_interview_started_at||null,startRevision:first?.revision??null,surveyAtStart:first?Object.fromEntries(Object.entries(first.data.answers).filter(([k])=>!k.startsWith('v5_note_')&&k!=='v5_interview_started_at')):null};
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='wissly-'+recordId.slice(0,8)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){failure=e.message;status();}
};
// The language entrypoint initializes shared persistence after installing locale handling.
