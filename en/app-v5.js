'use strict';
const previousUI={render,renderPrepare,renderAfter,renderReview,completion,exportRecord};
const isV5=()=>state.version==='study-5';
const preQuestions=()=>isV5()?window.STUDY_V5.pre:window.STUDY_PRE;
const stageOutcomes=()=>isV5()?{complete:'I finished.',partial:'I started, but did not finish.',not_attempted:'I could not start.'}:outcomes;
const postKeys=()=>window.STUDY_V5.pages.flatMap(p=>p.items.map(([k])=>'v5_'+k));
const interviewStarted=()=>!!state.answers.v5_interview_started_at;
const postComplete=()=>postKeys().every(v4Answered);

render=function(){
 previousUI.render();
 if(!isV5()){
  if(state.version==='study-4')$('#content').insertAdjacentHTML('afterbegin','<p class="version-note">This record uses an earlier questionnaire. Start the current version from Response records → New record.</p>');
  return;
 }
 if(current()==='prepare')$('#phase').textContent='Setup · pre-task survey';
 if(current()==='finish')$('#phase').textContent='Final interview';
 $('#steps').querySelectorAll('[data-step]').forEach(b=>{
  const key=sequence()[Number(b.dataset.step)];
  if(key==='prepare'||key==='finish')b.innerHTML=`<span class="stepnum" aria-hidden="true">·</span>${key==='prepare'?'Setup · pre-task survey':'Final interview'}`;
 });
};

renderPrepare=function(){
 previousUI.renderPrepare();if(!isV5())return;
 $('#content .lead').textContent='Prepare the materials and complete the pre-task survey. After the tasks and post-task survey, you will have an interview with the moderator.';
 const first=$('#content .columns > section > .card');
 first.insertAdjacentHTML('beforeend','<p class="small">We are looking at the experience of using Wissly. Work as you normally would and share what you are thinking. Tell the moderator if you get stuck or want to stop.</p>');
 first.nextElementSibling.querySelector('p.small').textContent='Select the answers that describe your experience with generative AI. Additional comments are optional.';
};

completion=function(key,blocked,review=false){
 previousUI.completion(key,blocked,review);if(!isV5())return;
 const reason=$('#incomplete-reason .form-field');
 if(reason)reason.firstChild.textContent='What led you to stop or prevented you from starting? (optional)';
};

renderAfter=function(){
 if(!isV5())return previousUI.renderAfter();
 const page=state.surveyPage,groups=window.STUDY_V5.pages,group=groups[page],last=page===groups.length-1;
 $('#content').innerHTML=`<h1>Post-task survey</h1><p class="lead">${page+1} / ${groups.length} · Responses are saved automatically. You can return to a previous screen to edit them.</p><section class="card survey-card"><h2>${esc(group.title)}</h2><p class="small">Answer based on your experience today. Select Cannot judge if you did not experience something or cannot assess it.</p>${group.items.map(([k,q])=>v4Rating('v5_'+k,q)).join('')}${last?note('v5_comment','Anything else you would like to add to the survey (optional)'):''}<p class="form-error" role="alert"></p><div class="actions"><button class="secondary" id="survey-back">Previous</button><button class="primary" id="survey-next">${last?'Continue to the interview':'Next'}</button></div></section>`;
 $('#content .omit').closest('.survey-card').querySelectorAll('.omit').forEach(el=>{el.lastChild.textContent=' Not experienced or cannot judge';});
 $('#survey-back').onclick=()=>{if(page===0)go(5);else{state.surveyPage--;queueSave();render();window.scrollTo(0,0);}};
 $('#survey-next').onclick=()=>{
  if(focusMissing($('#content'),group.items.map(([k])=>'v5_'+k)))return;
  if(last)next();else{state.surveyPage++;queueSave();render();$('#main').focus();window.scrollTo(0,0);}
 };
};

function interviewQuestion(item){
 const notAttempted=item.task&&state.answers['v4_outcome_'+item.task]==='not_attempted';
 return `${item.section?`<h3 class="interview-section">${esc(item.section)}</h3>`:''}<details class="interview-item"><summary>${esc(item.title)}${notAttempted?' · Not attempted':''}</summary>${notAttempted?'<p class="small">This stage was not attempted. Do not ask as though the participant experienced it.</p><p>What prevented you from starting this stage?</p>':`<p class="interview-question">${esc(item.question)}</p>${item.probes.length?`<p class="small">Ask one follow-up at a time, only when needed</p><ul class="probe-list">${item.probes.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`:''}${item.rule?`<p class="small">${esc(item.rule)}</p>`:''}`}<details class="answer-note"><summary>Moderator notes (optional)</summary>${note('v5_note_'+item.key,'Screens, timestamps, comments, or other notes')}</details></details>`;
}

renderReview=function(){
 if(!isV5())return previousUI.renderReview();
 const missing=postKeys().filter(k=>!v4Answered(k)).length;
 $('#content').innerHTML=`<h1>Final interview</h1><p class="lead">You will now talk with the moderator about your work today. Please answer aloud.</p>${missing?`<section class="card"><p>Unanswered post-task survey questions: ${missing}.</p><button class="primary" id="finish-survey">Return to the post-task survey</button></section>`:`<section class="card"><h2>Start with the moderator</h2><p>Use the screens or files you worked with to describe what you were thinking and how you made decisions.</p>${interviewStarted()?'<p class="small">The interview has been started. The moderator can reopen the questions below.</p>':'<p class="small">Moderator: press the button below when you are ready.</p><button class="secondary" id="start-interview">Moderator: start interview</button><p id="interview-error" class="form-error" role="alert"></p>'}</section>${interviewStarted()?`<details class="card moderator-guide" id="interview-guide"><summary>Open moderator questions</summary><p>Let the participant describe their experience first. Ask follow-ups one at a time, only about points not yet clear from their actions or answers. Skip anything already covered.</p><p class="small">Look at the screens and files together. For stages not attempted, ask only what prevented them and how far the participant got. Do not encourage changes to survey ratings.</p>${window.STUDY_V5.interview.map(interviewQuestion).join('')}</details>`:''}`}
 <details class="card response-review"><summary>Review or edit survey responses</summary><p class="small">Ease ratings range from 1 (very difficult) to 7 (very easy). Responses can still be edited after the interview.</p><div class="review-grid">${sequence().filter(k=>k.startsWith('T')).map(k=>`<button class="secondary review-task" data-review="${k}">${taskNames[k]}<small>${outcomes[state.answers['v4_outcome_'+k]]||'Not yet recorded'} · ${state.answers['v4_seq_'+k]==='na'?'Not attempted':state.answers['v4_seq_'+k]?`Ease: ${state.answers['v4_seq_'+k]} / 7`:'Unanswered'}</small></button>`).join('')}</div><div class="actions"><button class="secondary" id="edit-pre">Edit pre-task survey</button><button class="secondary" id="edit-post">Edit post-task survey</button></div><details class="survey-summary"><summary>View post-task survey responses</summary>${window.STUDY_V5.pages.flatMap(p=>p.items).map(([k,q])=>`<p>${esc(q)}<br><strong>${state.answers['v5_'+k]==='na'?'Cannot judge':v4Answered('v5_'+k)?state.answers['v5_'+k]+' / 5':'Unanswered'}</strong>${state.answers['extra_v5_'+k]?`<br>${esc(state.answers['extra_v5_'+k])}`:''}</p>`).join('')}</details></details>
 <section class="card"><h2>Response records</h2><p class="small">Download your responses to give to the moderator. If you edit them later, download the file again.</p><div class="actions"><button class="primary" id="export">Download response record</button><button class="text-button" id="new-record">New study record</button></div><p class="small status-note">The file includes survey responses, revision history, the interview start time, and any moderator notes.</p></section>`;
 document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>completion(b.dataset.review,false,true));
 const editPost=()=>{state.surveyPage=0;go(6);};
 $('#edit-pre').onclick=()=>go(0);$('#edit-post').onclick=editPost;
 if($('#finish-survey'))$('#finish-survey').onclick=editPost;
 $('#export').onclick=exportRecord;$('#new-record').onclick=newRecord;
 if($('#start-interview'))$('#start-interview').onclick=async()=>{
  const button=$('#start-interview');button.disabled=true;
  if(!interviewStarted())answer('v5_interview_started_at',new Date().toISOString());
  if(!await settle()){$('#interview-error').textContent='Could not save the interview start. Check your connection and try again.';button.disabled=false;return;}
  render();$('#interview-guide').open=true;$('#interview-guide summary').focus();
 };
};

exportRecord=async function(){
 if(!isV5())return previousUI.exportRecord();
 if(!await settle()){modal(`<h2 id="dialog-title">Please check your saved responses</h2><p>${esc(failure)}</p><button class="primary" value="cancel">Close</button>`);return;}
 try{
  const d=await request('/sessions/'+recordId+'/history');
  const first=d.history.find(r=>r.data.answers.v5_interview_started_at);
  d.interview={startedAt:d.record.data.answers.v5_interview_started_at||null,startRevision:first?.revision??null,surveyAtStart:first?Object.fromEntries(Object.entries(first.data.answers).filter(([k])=>!k.startsWith('v5_note_')&&k!=='v5_interview_started_at')):null};
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='wissly-'+recordId.slice(0,8)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){failure=e.message;status();}
};
// The language entrypoint initializes shared persistence after installing locale handling.
