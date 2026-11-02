'use strict';
const accessEnglish=document.documentElement.lang==='en';
const t=(ko,en)=>accessEnglish?en:ko;
let activeParticipant;
const originalPrepare=renderPrepare;
renderPrepare=function(){originalPrepare();if(!activeParticipant)return;$('#content').insertAdjacentHTML('afterbegin',`<details class="card access-note"><summary>${t('재접속 코드 보관','Save your return code')} · ${esc(activeParticipant.label)}</summary><p class="small">${t('다른 기기에서 이어서 하려면 이 코드를 보관해 주세요. 코드를 아는 사람은 이 응답을 열 수 있습니다.','Keep this code to continue on another device. Anyone with this code can open these responses.')}</p><code class="access-code">${esc(window.studyGetToken())}</code><div class="actions"><button class="secondary" id="save-access-code">${t('코드 내려받기','Download code')}</button><button class="text-button" id="leave-study">${t('이 기기에서 나가기','Leave on this device')}</button></div></details>`);$('#save-access-code').onclick=downloadAccessCode;$('#leave-study').onclick=leaveStudy;};
function downloadAccessCode(){
  const root=new URL('./',document.baseURI).href;
  const blob=new Blob([`${t('Wissly 테스트 재접속','Return to the Wissly study')}\n${root}\n${activeParticipant.label}\n${window.studyGetToken()}\n`],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='wissly-'+activeParticipant.label+'-return-code.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function clearParticipant(){
  clearTimeout(saveTimer);local.remove(pointer);
  try{for(const key of Object.keys(localStorage))if(key.startsWith('draft:'))localStorage.removeItem(key);}catch{}
  window.studySetToken('');loaded=false;pending=[];saving=false;failure='';conflict=false;recordId=undefined;activeParticipant=undefined;queuedBase=undefined;
}
async function leaveStudy(){
  if(!await settle())return;
  modal(`<h2 id="dialog-title">${t('이 기기에서 나가기','Leave on this device')}</h2><p>${t('응답은 저장되어 있습니다. 다시 열려면 재접속 코드가 필요합니다.','Your responses are saved. You will need your return code to reopen them.')}</p><div class="actions"><button type="button" class="secondary" id="leave-code">${t('코드 내려받기','Download code')}</button><button type="button" class="primary" id="leave-confirm">${t('나가기','Leave')}</button></div>`);
  $('#leave-code').onclick=downloadAccessCode;$('#leave-confirm').onclick=()=>{dismiss();clearParticipant();renderEntry();};
}
newRecord=function(){
  modal(`<h2 id="dialog-title">${t('새 참여자 시작','Start a new participant')}</h2><p>${t('현재 응답은 보관됩니다. 현재 참여자가 다시 접속할 수 있도록 코드를 먼저 내려받아 주세요.','The current responses will be kept. Download the return code so this participant can reopen them.')}</p><div class="actions"><button type="button" class="secondary" id="new-save-code">${t('코드 내려받기','Download code')}</button><button type="button" class="primary" id="create-record">${t('새 참여자 시작','Start a new participant')}</button></div>`);
  $('#new-save-code').onclick=downloadAccessCode;
  $('#create-record').onclick=async()=>{if(!await settle())return;$('#create-record').disabled=true;try{const d=await request('/access/start',{method:'POST',body:'{}'});dismiss();clearParticipant();await acceptAccess(d);}catch(e){failure=e.message;status();$('#create-record').disabled=false;}};
};
const originalRecords=$('#records').onclick;
$('#records').onclick=async()=>{await originalRecords();if(!$('#dialog').open||!activeParticipant)return;$('#dialog-body').insertAdjacentHTML('beforeend',`<p class="small">${t('현재 참여자','Current participant')}: ${esc(activeParticipant.label)}</p><code class="access-code">${esc(window.studyGetToken())}</code><div class="actions"><button type="button" class="secondary" id="record-code">${t('재접속 코드 내려받기','Download return code')}</button><button type="button" class="text-button" id="record-leave">${t('이 기기에서 나가기','Leave on this device')}</button></div>`);$('#record-code').onclick=downloadAccessCode;$('#record-leave').onclick=leaveStudy;};
async function acceptAccess(d){
  window.studySetToken(d.token);activeParticipant=d.participant;document.body.classList.remove('entry');
  const sessions=await request('/sessions');const savedId=local.get(pointer);
  const id=sessions.sessions.some(s=>s.id===savedId)?savedId:sessions.sessions[0]?.id;
  if(id)await openRecord(id);else await createRecord();
}
function renderEntry(message=''){
  document.body.classList.add('entry');$('#phase').textContent='';$('#steps').innerHTML='';$('#counter').textContent='';$('#save-status').textContent='';$('#save-error').hidden=true;
  $('#content').innerHTML=`<h1>${t('Wissly 사용성 테스트','Wissly usability study')}</h1><p class="lead">${t('진행자와 함께 과제를 수행하고, 사용 경험에 관해 이야기합니다.','Work through the tasks with your moderator, then talk about your experience.')}</p><section class="card"><h2>${t('처음 참여하나요?','First time here?')}</h2><p>${t('계정 없이 시작할 수 있습니다. 응답은 자동 저장되며, 나중에 돌아와 수정할 수 있습니다.','No account is needed. Responses save automatically and you can return to edit them.')}</p><button class="primary" id="entry-start">${t('시작하기','Start')}</button><p class="form-error" id="entry-error" role="alert">${esc(message)}</p></section><section class="card"><h2>${t('이어서 참여하기','Continue your study')}</h2><form id="resume-form"><label class="form-field" for="return-code">${t('재접속 코드','Return code')}<input id="return-code" name="return-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="34" placeholder="W-…" required></label><button class="secondary" type="submit">${t('응답 다시 열기','Open my responses')}</button><p id="resume-error" class="form-error" role="alert"></p></form></section><section class="card"><h2>${t('작업 자료','Study materials')}</h2><a class="download" href="materials/${accessEnglish?'en/':''}wissly-study-materials.zip" download>${t('작업 자료 내려받기','Download study materials')}</a><a class="download" href="https://www.wissly.ai/${accessEnglish?'en':'ko'}" target="_blank" rel="noopener noreferrer">${t('위슬리 다운로드 · 공식 사이트','Download Wissly · official website')}</a></section>`;
  $('#entry-start').onclick=async()=>{const button=$('#entry-start');button.disabled=true;try{const d=await request('/access/start',{method:'POST',body:'{}'});await acceptAccess(d);}catch(e){renderEntry(e.message);}};
  $('#resume-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const d=await request('/access/resume',{method:'POST',body:JSON.stringify({code:$('#return-code').value.trim()})});local.remove(pointer);await acceptAccess(d);}catch(error){$('#resume-error').textContent=t('재접속 코드와 연결 상태를 확인해 주세요.','Check your return code and connection.');button.disabled=false;}};
  if(!window.studyBackendReady){
    $('#entry-start').disabled=true;$('#resume-form button').disabled=true;
    $('#entry-error').textContent=t('테스트 준비 중입니다. 참여가 가능해지면 진행자가 안내해 드립니다.','The study is being prepared. Your moderator will let you know when you can begin.');
  }
}
async function startIndependentStudy(){
  if(!window.studyGetToken()){renderEntry();return;}
  try{const d=await request('/access');await acceptAccess({...d,token:window.studyGetToken()});}
  catch(e){if(e.status===401){clearParticipant();renderEntry();}else renderEntry(t('응답을 불러오지 못했습니다. 연결을 확인한 뒤 새로고침해 주세요.','Could not load your responses. Check your connection and reload this page.'));}
}
