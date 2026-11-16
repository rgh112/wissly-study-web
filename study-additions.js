'use strict';
// Wording and materials guidance revised from the supplied 2026-11-16 review.
// Keep the saved task-order values A/B. Display 1/2 to distinguish them from file sets.
(function(){
 const copy={
  ko:{
   heading:'이번 과제 자료',
   noticeTitle:'참여 안내 · 시작 전에 읽어 주세요',
   introduction:'연세대학교 연구진이 주식회사 스텝하우와 함께 업무용 AI 프로그램 ‘위슬리’의 사용성을 살펴보는 연구입니다. 인천스타트업파크 스케일업 챌린지 사업의 지원을 받아 진행합니다. 프로그램을 평가하는 것이며, 참여자님의 능력을 평가하지 않습니다. 막히거나 끝내지 못한 과제도 중요한 결과입니다.',
   notice:[
    ['하는 일','위슬리로 업무 과제 4개를 수행합니다. 작업하면서 떠오르는 생각을 편하게 소리 내어 말씀해 주세요. 과제 진행 결과와 설문은 이 화면에 기록하고, 마지막 인터뷰는 말로 답합니다.'],
    ['진행 방식·사례비','Zoom 화상통화로 온라인에서 진행합니다. 인터뷰를 완료하면 사례비 미화 100달러(USD 100)를 지급합니다. 지급 방법과 시기는 진행자가 안내합니다.'],
    ['작업 자료','모두 연구를 위해 만든 가상 문서입니다. 각 과제의 ‘이번 과제 자료’에서 사용할 자료 묶음과 위치를 확인할 수 있습니다.'],
    ['화면·음성 기록','진행자와 기록 범위를 확인하고 동의한 범위에서만 녹화·녹음합니다. 녹화·녹음 자료는 연구 종료 시까지 보관한 뒤 삭제합니다. 기록 중에는 개인 파일이나 메시지 창을 열지 말아 주세요.'],
    ['응답의 사용','응답은 참가자 번호로 분석하며, 보고에는 이름 없이 요약 결과와 익명 발화를 사용합니다. 이 사이트가 화면이나 음성을 자동으로 녹화하는 것은 아닙니다.'],
    ['비밀유지','테스트에서 보신 미공개 기능은 외부에 공유하지 말아 주세요.'],
    ['자발적 참여','언제든 쉬거나 그만둘 수 있고, 참여를 중단해도 불이익은 없습니다. 답하기 어려운 질문이 있으면 진행자에게 말씀해 주세요.'],
    ['문의·동의','연구 관련 문의는 rgh00826@yonsei.ac.kr로 보내 주세요. 시작 전에 궁금한 내용을 질문하고, 설명을 충분히 들은 뒤 진행자와 동의 내용을 확인해 주세요.']
   ],
   consent:' 참여 안내를 읽고, 진행자와 동의 내용을 확인했습니다.',
   order:{A:'순서 1 · 보고서 → 집계표 → 발표자료',B:'순서 2 · 보고서 → 발표자료 → 집계표'},
   materials:{
    T3:{set:'C',items:['‘검토대상’ 폴더의 보고서 · 위슬리에 열려 있는 문서','관련 자료: C로 시작하는 파일 3개 (C01–C03)'],where:'‘위슬리_실행프로젝트’ 폴더에서 찾을 수 있습니다.'},
    T1:{set:'A',items:['A로 시작하는 파일 4개 (A01–A04)'],where:'‘위슬리_실행프로젝트’ 폴더에서 찾을 수 있습니다.'},
    T2_1:{set:'B',items:['B로 시작하는 파일 3개 (B01–B03)'],where:'‘위슬리_실행프로젝트’ 폴더에서 찾을 수 있습니다.'},
    T2_2:{set:'B',items:['앞 단계에서 만든 PPT 초안','필요하면 B로 시작하는 파일 3개 (B01–B03)'],where:'초안은 ‘결과물’ 폴더에, B 자료는 ‘위슬리_실행프로젝트’ 폴더에 있습니다.'},
    T4:{set:'',items:['‘결과물’ 폴더에 저장한 파일'],where:''}
   }
  },
  en:{
   heading:'Materials for this task',
   noticeTitle:'Participation information · Please read before starting',
   introduction:'Researchers at Yonsei University, together with StepHow Inc., are studying the usability of the workplace AI software Wissly. This study is supported by the Incheon Startup Park Scale-up Challenge program. We are evaluating the software, not your ability. Getting stuck or not finishing a task is also a useful result.',
   notice:[
    ['What you will do','Complete four work tasks in Wissly and say what comes to mind as you work. Record your progress and survey responses on this site, then answer the final interview aloud.'],
    ['Format and compensation','The session takes place online via a Zoom video call. You will receive USD 100 after completing the interview. The moderator will explain how and when payment will be made.'],
    ['Work materials','All documents are fictional and were created for this study. The Materials for this task section identifies the relevant file set and its location.'],
    ['Screen and audio recording','Confirm the recording scope with the moderator before starting. Recording is limited to what you agree to. Screen and audio recordings will be retained until the study ends and then deleted. Please keep personal files and messaging apps closed while recording.'],
    ['Use of responses','Responses are analyzed by participant number. Reports use summarized results and anonymized quotes without names. This site does not automatically record your screen or voice.'],
    ['Confidentiality','Please do not share any unreleased features you see during the session.'],
    ['Voluntary participation','You may take a break or stop at any time without penalty. Tell the moderator if there is a question you find difficult to answer.'],
    ['Questions and consent','For questions about the study, email rgh00826@yonsei.ac.kr. Ask any questions before starting and review the consent information with the moderator after receiving a full explanation.']
   ],
   consent:' I have read the participation information and reviewed the consent information with the moderator.',
   order:{A:'Order 1 · Report → Spreadsheet → Presentation',B:'Order 2 · Report → Presentation → Spreadsheet'},
   materials:{
    T3:{set:'C',items:['The report in the Review folder · already open in Wissly','Related materials: the 3 files starting with C (C01–C03)'],where:'You can find these in the Wissly_Project folder.'},
    T1:{set:'A',items:['The 4 files starting with A (A01–A04)'],where:'You can find these in the Wissly_Project folder.'},
    T2_1:{set:'B',items:['The 3 files starting with B (B01–B03)'],where:'You can find these in the Wissly_Project folder.'},
    T2_2:{set:'B',items:['The PowerPoint draft you created in the previous step','If needed, the 3 files starting with B (B01–B03)'],where:'The draft is in your Results folder. The B files are in the Wissly_Project folder.'},
    T4:{set:'',items:['The files saved in your Results folder'],where:''}
   }
  }
 };
 window.STUDY_ADDITIONS=copy;
 if(typeof renderPrepare!=='function')return;
 const L=document.documentElement.lang==='en'?copy.en:copy.ko;
 const usesCurrentScreens=()=>['study-4','study-5'].includes(state.version);
 const prepareBase=renderPrepare;
 renderPrepare=function(){
  prepareBase();if(!usesCurrentScreens())return;
  const consent=document.querySelector('#content [data-ready="consent"]');
  if(consent&&!document.querySelector('#content .participation-notice')){
   consent.closest('label').insertAdjacentHTML('beforebegin',`<details class="participation-notice" open><summary>${esc(L.noticeTitle)}</summary><p>${esc(L.introduction)}</p><ul>${L.notice.map(([label,text])=>`<li><strong>${esc(label)}</strong> — ${esc(text)}</li>`).join('')}</ul></details>`);
   consent.closest('label').lastChild.textContent=L.consent;
  }
  const order=document.querySelector('#order');
  if(order)[...order.options].forEach(option=>{if(L.order[option.value])option.textContent=L.order[option.value];});
 };
 const taskBase=renderTask;
 renderTask=function(key){
  taskBase(key);if(!usesCurrentScreens())return;
  const material=L.materials[key],rail=document.querySelector('#content .rail');
  if(!material||!rail)return;
  rail.insertAdjacentHTML('afterbegin',`<section class="card task-materials"><h2>${esc(L.heading)}${material.set?' · '+esc(material.set):''}</h2><ul>${material.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>${material.where?`<p class="small">${esc(material.where)}</p>`:''}</section>`);
 };
})();
