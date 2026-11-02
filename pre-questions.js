window.STUDY_PRE = [
 {key:'pre_ai_frequency',label:'최근 4주 동안 생성형 AI를 사용한 날은 며칠인가요?',type:'single',options:{never:'사용해 본 적 없음',inactive:'사용 경험은 있지만 최근 4주에는 사용하지 않음',few:'1–3일',weekly:'4–7일',often:'8–15일',daily:'16일 이상'}},
 {key:'pre_ai_tools',label:'사용해 본 생성형 AI 도구는 무엇인가요?',type:'multi',options:{chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini',copilot:'Copilot',other:'기타'}},
 {key:'pre_ai_purposes',label:'생성형 AI를 주로 어떤 일에 사용하나요?',type:'multi',options:{learn:'정보 찾기·개념 이해',write:'글이나 문서 초안 작성',summarize:'자료 요약·정리',translate:'번역·문장 다듬기',data:'자료 분석·계산',code:'코드 작성',image:'이미지·영상 제작',other:'기타'}},
 {key:'pre_ai_documents',label:'생성형 AI로 다음과 같은 문서 작업을 해 본 적이 있나요?',type:'multi',exclusive:'none',options:{copy:'답변 내용을 문서나 발표자료에 옮겨 사용',read:'파일을 제공하고 요약·분석 요청',edit:'기존 파일의 내용 수정 요청',create:'문서·표·발표자료 파일 생성 요청',none:'문서 작업에는 사용한 적 없음'}},
 {key:'pre_ai_workflow',label:'생성형 AI의 답변이나 결과물을 받은 뒤 보통 어떻게 활용하나요?',type:'multi',exclusive:'none',options:{use:'받은 결과를 그대로 사용',followup:'추가 질문이나 수정을 요청',manual:'직접 고쳐서 사용',reference:'참고만 하고 직접 작업',varies:'작업에 따라 다름',other:'기타',none:'아직 실제 작업에 활용한 적 없음'}}
];
