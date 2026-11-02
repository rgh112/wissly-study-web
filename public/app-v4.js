'use strict';
const legacyUI={render,renderPrepare,renderTask,completion,renderAfter,renderReview};
const isV4=()=>['study-4','study-5'].includes(state.version);
const taskNames={T3:'보고서 검토',T1:'집계표 작성',T2_1:'발표자료 · 초안',T2_2:'발표자료 · 수정',T4:'파일 전달 준비'};
const outcomes={complete:'완료',partial:'일부 진행',blocked:'진행 중단',not_attempted:'시도하지 않음'};
const handoffOptions={ready:'열어서 확인함 · 전달 가능',rework:'열었지만 추가 작업 필요',cannot_open:'파일이 열리지 않음',no_file:'전달할 파일 없음',no_app:'열 프로그램 없음'};
const v4Answered=k=>Array.isArray(state.answers[k])?state.answers[k].length>0:state.answers[k]!==undefined&&state.answers[k]!==null&&state.answers[k]!=='';
function choices(key,label,items){return `<fieldset class="question"><legend>${esc(label)}</legend><div class="choice-list">${Object.entries(items).map(([v,t])=>`<label><input type="radio" name="${key}" data-answer="${key}" value="${v}" ${state.answers[key]===v?'checked':''}> ${esc(t)}</label>`).join('')}</div>${extraNote(key)}</fieldset>`;}
function note(key,label){return `<label class="form-field">${esc(label)}<textarea data-answer="${key}" maxlength="2000" rows="3">${esc(state.answers[key]||'')}</textarea></label>`;}
function extraNote(key){return `<details class="answer-note" ${state.answers['extra_'+key]?'open':''}><summary>덧붙일 내용 (선택)</summary>${note('extra_'+key,'선택한 이유나 더 이야기하고 싶은 내용을 자유롭게 적어 주세요.')}</details>`;}
function v4Rating(key,label,max=5){
 const ends=max===7?['매우 어려움','매우 쉬움']:['전혀 그렇지 않다','매우 그렇다'];
 return `<fieldset class="question"><legend>${esc(label)}</legend><div class="rating" style="--options:${max}">${Array.from({length:max},(_,i)=>`<label><input type="radio" name="${key}" data-answer="${key}" data-number value="${i+1}" ${state.answers[key]===i+1?'checked':''}><span>${i+1}</span></label>`).join('')}</div><div class="scale-labels"><span>1 ${ends[0]}</span><span>${max} ${ends[1]}</span></div><label class="omit"><input type="radio" name="${key}" data-answer="${key}" value="na" ${state.answers[key]==='na'?'checked':''}> ${max===7?'시도하지 않아 판단할 수 없음':'해당 경험이 없어 판단하기 어려움'}</label>${extraNote(key)}</fieldset>`;
}
function focusMissing(root,keys){
 const missing=keys.filter(k=>!v4Answered(k));
 if(!missing.length)return false;
 const input=root.querySelector('[data-answer="'+missing[0]+'"], [data-multi="'+missing[0]+'"]');input?.focus();input?.closest('.question')?.scrollIntoView({block:'center',behavior:'smooth'});
 root.querySelector('.form-error').textContent='아직 답하지 않은 질문이 있습니다. 표시된 질문을 확인해 주세요.';
 return true;
}
render=function(){
 legacyUI.render();
 if(!isV4()){
  $('#content').insertAdjacentHTML('afterbegin','<p class="version-note">이전 설문 기록입니다. 당시 문항과 척도로 표시합니다. 새 테스트는 ‘응답 기록 → 새 기록’에서 시작해 주세요.</p>');
  document.querySelectorAll('a[href^="materials/"]').forEach(a=>a.setAttribute('href',a.getAttribute('href').replace('materials/','materials/v3/')));
  return;
 }
 const key=current(),task=key.startsWith('T');
 const group=key==='T2_2'?'T2_1':key;
 const number=sequence().filter(k=>k.startsWith('T')&&k!=='T2_2').indexOf(group)+1;
 $('#phase').textContent=task?`과제 ${number} / 4${key.startsWith('T2')?' · 발표자료 '+(key==='T2_1'?'1/2 초안':'2/2 수정'):''}`:({prepare:'시작 준비',after:'사후 설문',finish:'응답 확인 · 인터뷰'}[key]);
 $('#counter').textContent=task?'위슬리에서 작업 → 이 화면에서 기록':'';
 $('#steps').querySelectorAll('[data-step]').forEach(b=>{const k=sequence()[Number(b.dataset.step)];if(k.startsWith('T')){const n=sequence().filter(x=>x.startsWith('T')&&x!=='T2_2').indexOf(k)+1;b.innerHTML=`<span class="stepnum">${n}</span>${taskNames[k].replace(' · 초안','')}`;}else b.innerHTML=`<span class="stepnum" aria-hidden="true">·</span>${{prepare:'시작 준비',after:'사후 설문',finish:'응답 확인 · 인터뷰'}[k]}`;});
 if(innerWidth<=720)$('#steps .active')?.scrollIntoView({block:'nearest',inline:'center'});
};
renderPrepare=function(){
 legacyUI.renderPrepare();if(!isV4())return;
 const first=$('#content .columns > section > .card');
 first.innerHTML=`<h2>1. 작업 자료 받기</h2>${link('wissly-study-materials.zip','작업 자료 다운로드','ZIP','압축 파일 · 원문 10개와 보고서 1개')}<p class="small">압축을 풀어 주세요. 안에 있는 ‘위슬리_실행프로젝트’가 작업 자료 폴더입니다.</p><label class="ready-line"><input type="checkbox" data-ready="materials" ${state.answers.v4_ready_materials?'checked':''}> 자료를 내려받고 압축을 풀었습니다.</label><h2>2. 결과물을 둘 곳 정하기</h2><p>바탕화면 등 찾기 쉬운 곳에 ‘결과물’ 폴더를 만들어 주세요. 작업 자료 폴더와 별도로 두고, 오늘 만든 파일을 여기에 모읍니다.</p>${textField('v4_folder','결과물 폴더 위치 (선택)','text','placeholder="예: 바탕화면 / 결과물" maxlength="2000"')}<label class="ready-line"><input type="checkbox" data-ready="folder" ${state.answers.v4_ready_folder?'checked':''}> 결과물 폴더를 준비했습니다.</label><h2>3. 위슬리 열기</h2><a class="secondary install-link" href="https://www.wissly.ai/ko" target="_blank" rel="noopener noreferrer">위슬리 다운로드 · 공식 사이트</a><p class="small">진행자와 작업 자료 연결 상태를 확인하고, 검토할 보고서를 열어 주세요.</p><label class="ready-line"><input type="checkbox" data-ready="app" ${state.answers.v4_ready_app?'checked':''}> 위슬리에 작업 자료와 보고서가 열려 있습니다.</label><label class="ready-line"><input type="checkbox" data-ready="consent" ${state.answers.v4_ready_consent?'checked':''}> 참여 안내를 확인했습니다.</label><p class="small">과제는 4개이며 발표자료는 초안과 수정으로 나뉩니다. 작업은 위슬리에서 하고, 진행 결과와 설문은 이 화면에서 기록합니다. 과제 설명을 복사해 사용해도 됩니다.</p>`;
 const rail=$('#content .rail .card');rail.querySelector('h2').textContent='과제 순서';rail.querySelector('.download').remove();
 rail.querySelector('details p').textContent='진행자가 안내한 순서를 선택해 주세요.';
 const pre=first.nextElementSibling;
 pre.innerHTML=`<h2>사전 설문</h2><p class="small">평소 생성형 AI를 사용하는 경험에 대해 답해 주세요. 각 질문 아래에 설명을 덧붙일 수 있습니다.</p>${textField('participant','참가자 코드 (진행자 안내에 따라 입력)','text','maxlength="40"')}${preQuestions().map((q,i)=>`<div ${i?'class="ai-experience"':''}>${q.type==='single'?choices(q.key,q.label,q.options):`<fieldset class="question"><legend>${q.label} <small>(복수 선택)</small></legend><div class="choice-list">${Object.entries(q.options).map(([v,t])=>`<label><input type="checkbox" data-multi="${q.key}" value="${v}" ${(state.answers[q.key]||[]).includes(v)?'checked':''}> ${t}</label>`).join('')}</div>${extraNote(q.key)}</fieldset>`}</div>`).join('')}${note('pre_ai_comment','그 밖에 미리 이야기하고 싶은 내용 (선택)')}<div class="actions"><button class="primary" id="start">첫 과제로</button></div>`;
 const showExperience=()=>pre.querySelectorAll('.ai-experience').forEach(el=>{el.hidden=state.answers.pre_ai_frequency==='never';});
 pre.querySelectorAll('[data-multi]').forEach(el=>el.onchange=()=>{
  const key=el.dataset.multi,q=preQuestions().find(q=>q.key===key),inputs=[...pre.querySelectorAll('[data-multi="'+key+'"]')];
  if(el.checked&&q.exclusive)inputs.forEach(c=>{if((el.value===q.exclusive&&c!==el)||(el.value!==q.exclusive&&c.value===q.exclusive))c.checked=false;});
  answer(key,inputs.filter(c=>c.checked).map(c=>c.value));
  if(el.checked&&el.value==='other')el.closest('.question').querySelector('.answer-note').open=true;
 });
 pre.addEventListener('change',e=>{if(e.target.dataset.answer==='pre_ai_frequency')showExperience();});showExperience();
 const start=$('#start');start.disabled=true;
 start.parentElement.insertAdjacentHTML('beforebegin','<p id="start-hint" class="small" role="status"></p><p class="form-error" role="alert"></p>');
 const update=()=>{const missing=[...Object.entries({materials:'자료 다운로드·압축 해제',folder:'결과물 폴더 준비',app:'위슬리 실행',consent:'참여 안내 확인'}).filter(([k])=>!state.answers['v4_ready_'+k]).map(([,label])=>label),...(!String(state.answers.participant||'').trim()?['참가자 코드 입력']:[])];start.disabled=!!missing.length;$('#start-hint').textContent=missing.length?'시작 전 확인: '+missing.join(', '):'';};
 first.querySelectorAll('[data-ready]').forEach(c=>c.onchange=()=>{answer('v4_ready_'+c.dataset.ready,c.checked);update();});
 pre.addEventListener('input',update);update();
 start.onclick=()=>{update();if(start.disabled)return;const required=state.answers.pre_ai_frequency==='never'?['pre_ai_frequency']:preQuestions().map(q=>q.key);if(!focusMissing(pre,required))next();};
 $('#content .lead').textContent='자료를 준비한 뒤 사전 설문을 작성해 주세요. 응답은 자동 저장되며 언제든 수정할 수 있습니다.';
};
renderTask=function(key){
 if(!isV4())return legacyUI.renderTask(key);
 if(key==='T2_2'&&state.skipped){
  $('#content').innerHTML=`<h1>발표자료 수정은 진행하지 않았습니다</h1><section class="card"><p>수정할 PPT 초안이 준비되지 않아 이 단계는 건너뛰었습니다.</p><p>초안을 준비했다면 초안 결과를 다시 확인해 주세요.</p><div class="actions"><button class="secondary" id="return-draft">초안 결과로</button><button class="primary" id="skip-followup">다음 과제로</button></div></section>`;
  $('#return-draft').onclick=()=>go(sequence().indexOf('T2_1'));$('#skip-followup').onclick=next;return;
 }
 const [title,ps]=window.STUDY_TASKS[key],draft=key==='T2_1';
 const goal={T3:'전달할 보고서(.docx) 또는 전달을 보류한 이유',T1:'다음 분기에도 쓸 수 있는 집계표(.xlsx)',T2_1:'열어서 확인할 수 있는 발표자료 초안(.pptx)',T2_2:'초안과 구분해 저장한 최종 발표자료(.pptx)',T4:'전달할 최종 파일과 추가 작업 여부'}[key];
 $('#content').innerHTML=`<h1>${esc(title)}</h1><p class="lead">${key.startsWith('T2')?(draft?'초안을 만든 뒤 추가 요청이 이어집니다.':'앞서 만든 초안에서 작업을 이어갑니다.'):'평소 작업하듯 진행해 주세요.'}</p><div class="columns task-columns"><section class="card task-body"><p class="context">${esc(ps[0])}</p>${ps.slice(1).map(p=>`<p>${esc(p)}</p>`).join('')}<div class="outcome-box"><strong>마칠 때 확인할 것</strong><p>${goal}</p><small>파일 저장 위치: ${esc(state.answers.v4_folder||'준비한 결과물 폴더')}</small></div><div class="actions">${backButton()}<button class="primary" id="done">${draft?'초안 결과 남기기':key==='T2_2'?'수정 결과 남기기':'진행 결과 남기기'}</button></div><button class="text-button" id="blocked">더 진행하기 어려워요</button></section><aside class="rail"><section class="card"><h2>과제 설명</h2>${link(key+'.pdf','과제 설명 PDF','PDF')}<button class="secondary copy-task" id="copy-task">설명 복사</button><p class="small" id="copy-status" role="status"></p></section></aside></div>`;
 $('#done').onclick=()=>completion(key,false);$('#blocked').onclick=()=>completion(key,true);
 $('#copy-task').onclick=async()=>{try{await navigator.clipboard.writeText(title+'\n\n'+ps.join('\n\n'));$('#copy-status').textContent='복사했습니다.';}catch{$('#copy-status').textContent='본문을 선택해 복사해 주세요.';}};
};
completion=function(key,blocked,review=false){
 if(!isV4())return legacyUI.completion(key,blocked,review);
 const a=state.answers,draft=key==='T2_1',outcomeKey='v4_outcome_'+key;
 const seqKey='v4_seq_'+key;
 modal(`<h2 id="dialog-title">${taskNames[key]} · 진행 결과</h2><p class="small">${blocked?'완성하지 못해도 지금까지 진행한 상태를 남길 수 있습니다.':'지금 상태를 기록해 주세요. 나중에 돌아와 수정할 수 있습니다.'}</p>${choices(outcomeKey,'어디까지 진행했나요?',outcomes)}${v4Rating(seqKey,'방금 단계는 전반적으로 얼마나 쉽거나 어려웠나요?',7)}${key==='T3'?choices('decision_T3','보고서를 어떻게 하기로 결정했나요?',{'이대로 전달':'이대로 전달','수정 후 전달':'수정 후 전달','전달 보류':'전달 보류','결정하지 못함':'결정하지 못함'}):''}${key!=='T4'?textField('v4_artifact_'+key,draft?'저장한 PPT 초안 파일 이름 (.pptx)':'선택한 파일 이름 (파일이 있다면 입력)','text','maxlength="2000"'):''}${draft?`<label class="ready-line"><input type="checkbox" id="draft-opened" ${a.v4_draft_opened?'checked':''}> 저장한 PPT 초안 파일을 열어 확인했습니다.</label><p class="small">수정 단계는 PPT 초안이 준비된 경우에만 열립니다. 파일이 없으면 현재 결과를 기록하고 다음 과제로 넘어갑니다.</p>`:''}${key==='T4'?Object.entries({word:'Word 보고서',excel:'Excel 집계표',ppt:'PowerPoint 발표자료'}).map(([k,t])=>choices('v4_handoff_'+k,t,handoffOptions)).join(''):''}<div id="incomplete-reason">${note('v4_reason_'+key,'어느 부분에서 멈췄거나 시작하지 못했나요?')}<p class="small">위의 추가 설명에 적었다면 다시 적지 않아도 됩니다.</p></div><details class="answer-note" ${a['v4_event_'+key]?'open':''}><summary>그 밖에 남기고 싶은 내용 (선택)</summary>${note('v4_event_'+key,'기억해 둘 화면이나 상황을 적어 주세요.')}</details><p class="form-error" role="alert"></p><div class="actions"><button class="secondary" value="cancel">${review?'응답 확인으로':'과제로 돌아가기'}</button>${review?'':`<button type="button" class="primary" id="advance">${draft?'결과 기록하고 계속':'다음 단계로'}</button>`}</div>`);
 const syncReason=()=>{$('#incomplete-reason').hidden=!state.answers[outcomeKey]||state.answers[outcomeKey]==='complete';};
 $('#dialog').querySelector('[name="'+outcomeKey+'"]').closest('fieldset').addEventListener('change',syncReason);syncReason();
 if(draft)$('#draft-opened').onchange=e=>answer('v4_draft_opened',e.target.checked);
 if(review)return;
 $('#advance').onclick=async()=>{
  const root=$('#dialog'),required=[outcomeKey,seqKey];
  if(key==='T3')required.push('decision_T3');
  if(key==='T4')required.push('v4_handoff_word','v4_handoff_excel','v4_handoff_ppt');
  if(focusMissing(root,required))return;
  const now=state.answers,outcome=now[outcomeKey];
  if(outcome!=='not_attempted'&&now[seqKey]==='na'){root.querySelector('.form-error').textContent='시도한 단계의 난이도를 골라 주세요. 완료 여부와 관계없이 답할 수 있습니다.';return;}
  if(outcome==='not_attempted'&&now[seqKey]!=='na'){root.querySelector('.form-error').textContent='시도하지 않은 단계라면 난이도에서 ‘시도하지 않아 판단할 수 없음’을 선택해 주세요.';return;}
  if(!isV5()&&outcome!=='complete'&&!String(now['v4_reason_'+key]||now['extra_'+outcomeKey]||'').trim()){root.querySelector('.form-error').textContent='어느 부분에서 멈췄는지 또는 시도하지 않은 이유를 적어 주세요.';root.querySelector('[data-answer="v4_reason_'+key+'"]').focus();return;}
  const pptReady=!!now.v4_draft_opened&&/\.pptx$/i.test(String(now.v4_artifact_T2_1||'').trim());
  if(draft&&outcome==='complete'&&!pptReady){root.querySelector('.form-error').textContent='PPT 파일 이름과 열기 여부를 확인해 주세요. 준비되지 않았다면 일부 진행 또는 진행 중단을 선택해 주세요.';return;}
  if(draft){state.skipped=!pptReady;if(state.skipped){state.answers.v4_outcome_T2_2='not_attempted';state.answers.v4_seq_T2_2='na';state.answers.v4_reason_T2_2='수정할 PPT 초안이 준비되지 않음';}}
  queueSave(true);$('#advance').disabled=true;
  if(!await settle()){root.querySelector('.form-error').textContent=conflict?'다른 창의 응답과 충돌했습니다. 과제로 돌아간 뒤 상단의 ‘변경 충돌 확인’을 눌러 주세요.':'아직 저장하지 못했습니다. 연결을 확인한 뒤 이 버튼을 다시 눌러 주세요. 입력한 내용은 남아 있습니다.';$('#advance').disabled=false;return;}
  dismiss();if(draft&&state.skipped)go(state.index+2);else next();
 };
};
renderAfter=function(){
 if(!isV4())return legacyUI.renderAfter();
 const page=state.surveyPage,group=window.STUDY_V4.pages[page];
 $('#content').innerHTML=`<h1>사후 설문</h1><p class="lead">${page+1} / 3 · 선택한 답은 자동 저장됩니다. 이전 화면으로 돌아가 수정할 수 있습니다.</p><section class="card survey-card"><h2>${group.title}</h2><p class="small">오늘 직접 사용한 경험을 기준으로 답해 주세요.${page===2?' 앞의 화면 조작과 별개로 결과물에 대해 묻습니다.':''}</p>${group.items.map(([k,q])=>v4Rating('v4_'+k,q)).join('')}${page===2?note('v4_comment','추가로 남기고 싶은 내용 (선택)'):''}<p class="form-error" role="alert"></p><div class="actions"><button class="secondary" id="survey-back">이전</button><button class="primary" id="survey-next">${page===2?'응답 확인 · 인터뷰':'다음'}</button></div></section>`;
 $('#survey-back').onclick=()=>{if(page===0)go(5);else{state.surveyPage--;queueSave();render();window.scrollTo(0,0);}};
 $('#survey-next').onclick=()=>{if(focusMissing($('#content'),group.items.map(([k])=>'v4_'+k)))return;if(page===2)next();else{state.surveyPage++;queueSave();render();$('#main').focus();window.scrollTo(0,0);}};
};
renderReview=function(){
 if(!isV4())return legacyUI.renderReview();
 const keys=window.STUDY_V4.pages.flatMap(p=>p.items.map(([k])=>'v4_'+k));
 const missing=keys.filter(k=>!v4Answered(k)).length;
 $('#content').innerHTML=`<h1>응답 확인 · 인터뷰</h1><p class="lead">답은 자동 저장됩니다. 내려받은 뒤에도 계속 수정할 수 있습니다.</p><section class="card"><h2>진행 결과</h2><p class="small">쉬움 정도는 1 매우 어려움, 7 매우 쉬움입니다.</p><div class="review-grid">${sequence().filter(k=>k.startsWith('T')).map(k=>`<button class="secondary review-task" data-review="${k}">${taskNames[k]}<small>${outcomes[state.answers['v4_outcome_'+k]]||'아직 기록하지 않음'} · ${state.answers['v4_seq_'+k]==='na'?'시도하지 않음':state.answers['v4_seq_'+k]?`쉬움 정도 ${state.answers['v4_seq_'+k]} / 7`:'난이도 미응답'}</small></button>`).join('')}</div><p class="small status-note">사후 설문: ${missing?`${missing}개 미응답`:'모두 응답함'}</p><div class="actions"><button class="secondary" id="edit-pre">사전 설문 수정</button><button class="secondary" id="edit-post">사후 설문 수정</button></div></section><section class="card"><h2>인터뷰 질문</h2><p>진행자와 작업했던 화면을 보며 이야기해 주세요. 2–4번은 1번에서 고른 순간에 대해 묻습니다. 이미 이야기한 내용은 건너뛰어도 됩니다.</p><p class="small">말로 답해도 되고, 필요한 내용만 메모로 남겨도 됩니다. 메모도 함께 저장됩니다.</p>${window.STUDY_V4.interview.map(([t,q],i)=>`<details class="interview-item"><summary>${i+1}. ${t}</summary><p>${q}</p>${note('v4_interview_'+(i+1),'답변 메모 (선택)')}</details>`).join('')}<div class="actions"><button class="primary" id="export">응답 기록 내려받기</button><button class="text-button" id="new-record">새 테스트 기록</button></div><p class="small status-note">내려받은 파일에는 최초 응답과 이후 수정 이력이 들어 있습니다. 진행자에게 전달할 때 사용해 주세요.</p></section>`;
 document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>completion(b.dataset.review,false,true));
 $('#edit-pre').onclick=()=>go(0);$('#edit-post').onclick=()=>{state.surveyPage=0;go(6);};$('#export').onclick=exportRecord;$('#new-record').onclick=newRecord;
};
// app-v5 installs the current questionnaire, then initializes shared persistence.
