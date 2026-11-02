'use strict';
const studyLanguage=document.documentElement.lang==='en'?'en':'ko';
const languageRender=render;
render=function(){
 if(studyLanguage==='en'&&state.version!=='study-5'){
  $('#content').innerHTML='<h1>Earlier study record</h1><p>This record uses an earlier Korean questionnaire. You can keep it and create a new English study record.</p><div class="actions"><a class="secondary" href="/?lang=ko">Open the original record in Korean</a><button class="primary" id="english-new-record">New English record</button></div>';
  $('#english-new-record').onclick=newRecord;status();return;
 }
 languageRender();
 if(state.version==='study-5'&&state.answers.study_language!==studyLanguage)answer('study_language',studyLanguage);
};
const untranslatedRequest=request;
request=async function(path,options){
 try{return await untranslatedRequest(path,options);}catch(error){
  if(studyLanguage==='en'&&/[\uac00-\ud7a3]/.test(error.message))error.message=window.STUDY_ERRORS_EN?.[error.message]||'Could not complete the request. Your entries are still here. Please check your connection and try again.';
  throw error;
 }
};
document.querySelectorAll('.language-switch a').forEach(a=>a.addEventListener('click',async e=>{
 if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 e.preventDefault();if(loaded&&!await settle())return;location.href=a.href;
}));
startIndependentStudy();
