'use strict';
const legacyUI={render,renderPrepare,renderTask,completion,renderAfter,renderReview};
const isV4=()=>['study-4','study-5'].includes(state.version);
const taskNames={T3:'Review a report',T1:'Create a spreadsheet',T2_1:'Presentation · draft',T2_2:'Presentation · revision',T4:'Prepare files for handoff'};
const outcomes={complete:'Completed',partial:'Partly completed',blocked:'Stopped',not_attempted:'Not attempted'};
const handoffOptions={ready:'Opened and checked · ready to hand over',rework:'Opened · more work needed',cannot_open:'The file would not open',no_file:'No file to hand over',no_app:'No application available to open it'};
const v4Answered=k=>Array.isArray(state.answers[k])?state.answers[k].length>0:state.answers[k]!==undefined&&state.answers[k]!==null&&state.answers[k]!=='';
function choices(key,label,items){return `<fieldset class="question"><legend>${esc(label)}</legend><div class="choice-list">${Object.entries(items).map(([v,t])=>`<label><input type="radio" name="${key}" data-answer="${key}" value="${v}" ${state.answers[key]===v?'checked':''}> ${esc(t)}</label>`).join('')}</div>${extraNote(key)}</fieldset>`;}
function note(key,label){return `<label class="form-field">${esc(label)}<textarea data-answer="${key}" maxlength="2000" rows="3">${esc(state.answers[key]||'')}</textarea></label>`;}
function extraNote(key){return `<details class="answer-note" ${state.answers['extra_'+key]?'open':''}><summary>Additional comments (optional)</summary>${note('extra_'+key,'Add a reason for your answer or anything else you would like to share.')}</details>`;}
function v4Rating(key,label,max=5){
 const ends=max===7?['Very difficult','Very easy']:['Strongly disagree','Strongly agree'];
 return `<fieldset class="question"><legend>${esc(label)}</legend><div class="rating" style="--options:${max}">${Array.from({length:max},(_,i)=>`<label><input type="radio" name="${key}" data-answer="${key}" data-number value="${i+1}" ${state.answers[key]===i+1?'checked':''}><span>${i+1}</span></label>`).join('')}</div><div class="scale-labels"><span>1 ${ends[0]}</span><span>${max} ${ends[1]}</span></div><label class="omit"><input type="radio" name="${key}" data-answer="${key}" value="na" ${state.answers[key]==='na'?'checked':''}> ${max===7?'Not attempted, so I cannot judge':'I did not experience this, so I cannot judge'}</label>${extraNote(key)}</fieldset>`;
}
function focusMissing(root,keys){
 const missing=keys.filter(k=>!v4Answered(k));
 if(!missing.length)return false;
 const input=root.querySelector('[data-answer="'+missing[0]+'"], [data-multi="'+missing[0]+'"]');input?.focus();input?.closest('.question')?.scrollIntoView({block:'center',behavior:'smooth'});
 root.querySelector('.form-error').textContent='Please answer the highlighted question before continuing.';
 return true;
}
render=function(){
 legacyUI.render();
 if(!isV4()){
  $('#content').insertAdjacentHTML('afterbegin','<p class="version-note">This record uses an earlier questionnaire. Start a new study from Response records → New record.</p>');
  document.querySelectorAll('a[href^="materials/"]').forEach(a=>a.setAttribute('href',a.getAttribute('href').replace('materials/','materials/v3/')));
  return;
 }
 const key=current(),task=key.startsWith('T');
 const group=key==='T2_2'?'T2_1':key;
 const number=sequence().filter(k=>k.startsWith('T')&&k!=='T2_2').indexOf(group)+1;
 $('#phase').textContent=task?`Task ${number} / 4${key.startsWith('T2')?' · Presentation '+(key==='T2_1'?'1/2 Draft':'2/2 Revision'):''}`:({prepare:'Setup',after:'Post-task survey',finish:'Review responses · interview'}[key]);
 $('#counter').textContent=task?'Work in Wissly → record your progress here':'';
 $('#steps').querySelectorAll('[data-step]').forEach(b=>{const k=sequence()[Number(b.dataset.step)];if(k.startsWith('T')){const n=sequence().filter(x=>x.startsWith('T')&&x!=='T2_2').indexOf(k)+1;b.innerHTML=`<span class="stepnum">${n}</span>${taskNames[k].replace(' · draft','')}`;}else b.innerHTML=`<span class="stepnum" aria-hidden="true">·</span>${{prepare:'Setup',after:'Post-task survey',finish:'Review responses · interview'}[k]}`;});
 if(innerWidth<=720)$('#steps .active')?.scrollIntoView({block:'nearest',inline:'center'});
};
renderPrepare=function(){
 legacyUI.renderPrepare();if(!isV4())return;
 const first=$('#content .columns > section > .card');
 first.innerHTML=`<h2>1. Download the materials</h2>${link('wissly-study-materials.zip','Download study materials','ZIP','ZIP · 10 source documents and 1 report')}<p class="small">Extract the ZIP file. The Wissly_Project folder contains the study materials.</p><label class="ready-line"><input type="checkbox" data-ready="materials" ${state.answers.v4_ready_materials?'checked':''}> I have downloaded and extracted the materials.</label><h2>2. Choose where to save your work</h2><p>Create a Results folder somewhere easy to find, such as your desktop. Keep it separate from the source materials and save the files you create today in it.</p>${textField('v4_folder','Results folder location (optional)','text','placeholder="For example: Desktop / Results" maxlength="2000"')}<label class="ready-line"><input type="checkbox" data-ready="folder" ${state.answers.v4_ready_folder?'checked':''}> I have created a Results folder.</label><h2>3. Open Wissly</h2><a class="secondary install-link" href="https://www.wissly.ai/en" target="_blank" rel="noopener noreferrer">Download Wissly · official website</a><p class="small">With the moderator, check that the materials are connected in Wissly and open the report to review.</p><label class="ready-line"><input type="checkbox" data-ready="app" ${state.answers.v4_ready_app?'checked':''}> The materials and report are open in Wissly.</label><label class="ready-line"><input type="checkbox" data-ready="consent" ${state.answers.v4_ready_consent?'checked':''}> I have read the participation information.</label><p class="small">There are four tasks. The presentation task has a draft stage and a revision stage. Work in Wissly and record your progress and survey answers here. You may copy the task instructions.</p>`;
 const rail=$('#content .rail .card');rail.querySelector('h2').textContent='Task order';rail.querySelector('.download').remove();
 rail.querySelector('details p').textContent='Select the order given by the moderator.';
 const pre=first.nextElementSibling;
 pre.innerHTML=`<h2>Pre-task survey</h2><p class="small">Tell us about your experience using generative AI. You can add comments below each question.</p>${textField('participant','Participant code (provided by the moderator)','text','maxlength="40"')}${preQuestions().map((q,i)=>`<div ${i?'class="ai-experience"':''}>${q.type==='single'?choices(q.key,q.label,q.options):`<fieldset class="question"><legend>${q.label} <small>(Select all that apply)</small></legend><div class="choice-list">${Object.entries(q.options).map(([v,t])=>`<label><input type="checkbox" data-multi="${q.key}" value="${v}" ${(state.answers[q.key]||[]).includes(v)?'checked':''}> ${t}</label>`).join('')}</div>${extraNote(q.key)}</fieldset>`}</div>`).join('')}${note('pre_ai_comment','Anything else you would like to share before starting (optional)')}<div class="actions"><button class="primary" id="start">Start the first task</button></div>`;
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
 const update=()=>{const missing=[...Object.entries({materials:'Download and extract the materials',folder:'Create a Results folder',app:'Open Wissly',consent:'Read the participation information'}).filter(([k])=>!state.answers['v4_ready_'+k]).map(([,label])=>label),...(!String(state.answers.participant||'').trim()?['Enter your participant code']:[])];start.disabled=!!missing.length;$('#start-hint').textContent=missing.length?'Before you start: '+missing.join(', '):'';};
 first.querySelectorAll('[data-ready]').forEach(c=>c.onchange=()=>{answer('v4_ready_'+c.dataset.ready,c.checked);update();});
 pre.addEventListener('input',update);update();
 start.onclick=()=>{update();if(start.disabled)return;const required=state.answers.pre_ai_frequency==='never'?['pre_ai_frequency']:preQuestions().map(q=>q.key);if(!focusMissing(pre,required))next();};
 $('#content .lead').textContent='Prepare the materials, then complete the pre-task survey. Responses are saved automatically and can be edited at any time.';
};
renderTask=function(key){
 if(!isV4())return legacyUI.renderTask(key);
 if(key==='T2_2'&&state.skipped){
  $('#content').innerHTML=`<h1>The presentation revision was not attempted</h1><section class="card"><p>This stage was skipped because a PowerPoint draft was not available to revise.</p><p>If you now have a draft, return to the draft stage and update your progress.</p><div class="actions"><button class="secondary" id="return-draft">Back to draft progress</button><button class="primary" id="skip-followup">Next task</button></div></section>`;
  $('#return-draft').onclick=()=>go(sequence().indexOf('T2_1'));$('#skip-followup').onclick=next;return;
 }
 const [title,ps]=window.STUDY_TASKS[key],draft=key==='T2_1';
 const goal={T3:'A report to hand over (.docx), or your reason for holding off',T1:'A spreadsheet you can reuse next quarter (.xlsx)',T2_1:'A presentation draft you can open and check (.pptx)',T2_2:'A final presentation saved separately from the draft (.pptx)',T4:'The final files and any work still needed'}[key];
 $('#content').innerHTML=`<h1>${esc(title)}</h1><p class="lead">${key.startsWith('T2')?(draft?'A follow-up request will appear after you create the draft.':'Continue working from the draft you created earlier.'):'Work as you normally would.'}</p><div class="columns task-columns"><section class="card task-body"><p class="context">${esc(ps[0])}</p>${ps.slice(1).map(p=>`<p>${esc(p)}</p>`).join('')}<div class="outcome-box"><strong>What to have when you finish</strong><p>${goal}</p><small>Save files in: ${esc(state.answers.v4_folder||'your Results folder')}</small></div><div class="actions">${backButton()}<button class="primary" id="done">${draft?'Record draft progress':key==='T2_2'?'Record revision progress':'Record progress'}</button></div><button class="text-button" id="blocked">I cannot continue</button></section><aside class="rail"><section class="card"><h2>Task instructions</h2>${link(key+'.pdf','Task instructions PDF','PDF')}<button class="secondary copy-task" id="copy-task">Copy instructions</button><p class="small" id="copy-status" role="status"></p></section></aside></div>`;
 $('#done').onclick=()=>completion(key,false);$('#blocked').onclick=()=>completion(key,true);
 $('#copy-task').onclick=async()=>{try{await navigator.clipboard.writeText(title+'\n\n'+ps.join('\n\n'));$('#copy-status').textContent='Copied.';}catch{$('#copy-status').textContent='Select the instructions and copy them.';}};
};
completion=function(key,blocked,review=false){
 if(!isV4())return legacyUI.completion(key,blocked,review);
 const a=state.answers,draft=key==='T2_1',outcomeKey='v4_outcome_'+key;
 const seqKey='v4_seq_'+key;
 modal(`<h2 id="dialog-title">${taskNames[key]} · Progress</h2><p class="small">${blocked?'You can record your progress even if you did not finish.':'Record your current progress. You can come back and edit it later.'}</p>${choices(outcomeKey,'How far did you get?',outcomes)}${v4Rating(seqKey,'Overall, how difficult or easy was this stage?',7)}${key==='T3'?choices('decision_T3','What did you decide to do with the report?',{'이대로 전달':'Share as it is','수정 후 전달':'Revise, then share','전달 보류':'Hold off on sharing','결정하지 못함':'I have not decided'}):''}${key!=='T4'?textField('v4_artifact_'+key,draft?'Filename of the saved PowerPoint draft (.pptx)':'Selected filename (if a file is available)','text','maxlength="2000"'):''}${draft?`<label class="ready-line"><input type="checkbox" id="draft-opened" ${a.v4_draft_opened?'checked':''}> I opened and checked the saved PowerPoint draft.</label><p class="small">The revision stage is available once a PowerPoint draft is ready. If there is no file, record your progress and move to the next task.</p>`:''}${key==='T4'?Object.entries({word:'Word report',excel:'Excel spreadsheet',ppt:'PowerPoint presentation'}).map(([k,t])=>choices('v4_handoff_'+k,t,handoffOptions)).join(''):''}<div id="incomplete-reason">${note('v4_reason_'+key,'Where did you stop, or what prevented you from starting?')}<p class="small">You do not need to repeat anything you have already added above.</p></div><details class="answer-note" ${a['v4_event_'+key]?'open':''}><summary>Anything else you would like to add (optional)</summary>${note('v4_event_'+key,'Note any screen or situation you would like to mention.')}</details><p class="form-error" role="alert"></p><div class="actions"><button class="secondary" value="cancel">${review?'Back to response review':'Back to the task'}</button>${review?'':`<button type="button" class="primary" id="advance">${draft?'Save progress and continue':'Next step'}</button>`}</div>`);
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
  if(outcome!=='not_attempted'&&now[seqKey]==='na'){root.querySelector('.form-error').textContent='Please rate the stage you attempted, whether or not you finished it.';return;}
  if(outcome==='not_attempted'&&now[seqKey]!=='na'){root.querySelector('.form-error').textContent='For a stage you did not attempt, select Not attempted, so I cannot judge.';return;}
  if(!isV5()&&outcome!=='complete'&&!String(now['v4_reason_'+key]||now['extra_'+outcomeKey]||'').trim()){root.querySelector('.form-error').textContent='Describe where you stopped or why you did not attempt the stage.';root.querySelector('[data-answer="v4_reason_'+key+'"]').focus();return;}
  const pptReady=!!now.v4_draft_opened&&/\.pptx$/i.test(String(now.v4_artifact_T2_1||'').trim());
  if(draft&&outcome==='complete'&&!pptReady){root.querySelector('.form-error').textContent='Check the PowerPoint filename and confirm that you opened it. If it is not ready, select that you did not finish.';return;}
  if(draft){state.skipped=!pptReady;if(state.skipped){state.answers.v4_outcome_T2_2='not_attempted';state.answers.v4_seq_T2_2='na';state.answers.v4_reason_T2_2='No PowerPoint draft available to revise';}}
  queueSave(true);$('#advance').disabled=true;
  if(!await settle()){root.querySelector('.form-error').textContent=conflict?'Your entries conflict with another window. Return to the task and select Review conflicting edits at the top.':'Your entries have not been saved yet. Check your connection and press this button again. Your entries are still here.';$('#advance').disabled=false;return;}
  dismiss();if(draft&&state.skipped)go(state.index+2);else next();
 };
};
renderAfter=function(){
 if(!isV4())return legacyUI.renderAfter();
 const page=state.surveyPage,group=window.STUDY_V4.pages[page];
 $('#content').innerHTML=`<h1>Post-task survey</h1><p class="lead">${page+1} / 3 · Your answers are saved automatically. You can return to a previous screen to edit them.</p><section class="card survey-card"><h2>${group.title}</h2><p class="small">Answer based on your experience today.${page===2?' 앞의 화면 조작과 별개로 결과물에 대해 묻습니다.':''}</p>${group.items.map(([k,q])=>v4Rating('v4_'+k,q)).join('')}${page===2?note('v4_comment','Additional comments (optional)'):''}<p class="form-error" role="alert"></p><div class="actions"><button class="secondary" id="survey-back">Previous</button><button class="primary" id="survey-next">${page===2?'Review responses · interview':'Next'}</button></div></section>`;
 $('#survey-back').onclick=()=>{if(page===0)go(5);else{state.surveyPage--;queueSave();render();window.scrollTo(0,0);}};
 $('#survey-next').onclick=()=>{if(focusMissing($('#content'),group.items.map(([k])=>'v4_'+k)))return;if(page===2)next();else{state.surveyPage++;queueSave();render();$('#main').focus();window.scrollTo(0,0);}};
};
renderReview=function(){
 if(!isV4())return legacyUI.renderReview();
 const keys=window.STUDY_V4.pages.flatMap(p=>p.items.map(([k])=>'v4_'+k));
 const missing=keys.filter(k=>!v4Answered(k)).length;
 $('#content').innerHTML=`<h1>Review responses · interview</h1><p class="lead">답은 자동 저장됩니다. 내려받은 뒤에도 계속 수정할 수 있습니다.</p><section class="card"><h2>Progress</h2><p class="small">쉬움 정도는 1 Very difficult, 7 Very easy입니다.</p><div class="review-grid">${sequence().filter(k=>k.startsWith('T')).map(k=>`<button class="secondary review-task" data-review="${k}">${taskNames[k]}<small>${outcomes[state.answers['v4_outcome_'+k]]||'Not yet recorded'} · ${state.answers['v4_seq_'+k]==='na'?'Not attempted':state.answers['v4_seq_'+k]?`Ease: ${state.answers['v4_seq_'+k]} / 7`:'난이도 Unanswered'}</small></button>`).join('')}</div><p class="small status-note">Post-task survey: ${missing?`${missing}개 Unanswered`:'모두 응답함'}</p><div class="actions"><button class="secondary" id="edit-pre">Edit pre-task survey</button><button class="secondary" id="edit-post">Edit post-task survey</button></div></section><section class="card"><h2>인터뷰 질문</h2><p>진행자와 작업했던 화면을 보며 이야기해 주세요. 2–4번은 1번에서 고른 순간에 대해 묻습니다. 이미 이야기한 내용은 건너뛰어도 됩니다.</p><p class="small">말로 답해도 되고, 필요한 내용만 메모로 남겨도 됩니다. 메모도 함께 저장됩니다.</p>${window.STUDY_V4.interview.map(([t,q],i)=>`<details class="interview-item"><summary>${i+1}. ${t}</summary><p>${q}</p>${note('v4_interview_'+(i+1),'답변 메모 (선택)')}</details>`).join('')}<div class="actions"><button class="primary" id="export">Download response record</button><button class="text-button" id="new-record">New study record</button></div><p class="small status-note">내려받은 파일에는 최초 응답과 이후 수정 이력이 들어 있습니다. 진행자에게 전달할 때 사용해 주세요.</p></section>`;
 document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>completion(b.dataset.review,false,true));
 $('#edit-pre').onclick=()=>go(0);$('#edit-post').onclick=()=>{state.surveyPage=0;go(6);};$('#export').onclick=exportRecord;$('#new-record').onclick=newRecord;
};
// app-v5 installs the current questionnaire, then initializes shared persistence.
