from pathlib import Path
import asyncio,base64,json,subprocess,urllib.request,uuid,os
from websockets.asyncio.client import connect
root=Path(__file__).resolve().parents[1]
runtime=root/'.runtime'
profile=runtime/('qa-survey-'+uuid.uuid4().hex[:8]);profile.mkdir()
process=subprocess.Popen([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
async def run():
 for _ in range(100):
  try: port=(profile/'DevToolsActivePort').read_text().splitlines()[0];break
  except (FileNotFoundError,PermissionError,IndexError):await asyncio.sleep(.1)
 targets=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json',timeout=5))
 async with connect(next(t for t in targets if t['type']=='page')['webSocketDebuggerUrl'],max_size=16000000) as ws:
  n=0;errors=[]
  async def call(method,params=None):
   nonlocal n
   n+=1;await ws.send(json.dumps({'id':n,'method':method,'params':params or {}}))
   while True:
    r=json.loads(await asyncio.wait_for(ws.recv(),45))
    if r.get('method')=='Runtime.exceptionThrown':errors.append(r)
    if r.get('id')==n:
     assert 'error' not in r,r
     return r.get('result',{})
  async def js(code):
   if 'await ' in code: code='(async()=>('+code+'))()'
   r=await call('Runtime.evaluate',{'expression':code,'returnByValue':True,'awaitPromise':True});assert 'exceptionDetails' not in r,r
   return r.get('result',{}).get('value')
  async def click(selector):
   for _ in range(60):
    if await js('!!document.querySelector('+json.dumps(selector)+')'):break
    await asyncio.sleep(.05)
   await js('document.querySelector('+json.dumps(selector)+').click()')
  async def check(code):assert await js(code),code
  async def settled():assert await js('settle()'),await js('failure')
  async def ready(after_reload=False):
   for _ in range(100):
    if await js('typeof loaded!=="undefined" && loaded'+(' && !window.__beforeReload' if after_reload else '')):return
    await asyncio.sleep(.1)
   raise AssertionError('Page did not load')
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable')
  if os.environ.get('STUDY_QA_MANIFEST'):
   await call('Page.addScriptToEvaluateOnNewDocument',{'source':'''const qaFetch=window.fetch;window.fetch=async function(...args){const r=await qaFetch(...args);if(String(args[0]).endsWith('/api/access/start')&&r.ok){const d=await r.clone().json();const ids=JSON.parse(sessionStorage.getItem('qa-created-participants')||'[]');ids.push(d.participant.id);sessionStorage.setItem('qa-created-participants',JSON.stringify(ids));}return r;};'''})
  await call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
  await call('Page.navigate',{'url':os.environ.get('STUDY_BROWSER_URL') or 'http://127.0.0.1:'+ (runtime/'server-port').read_text()+'/'})
  await click('#entry-start')
  await ready()
  if os.environ.get('STUDY_QA_MANIFEST'):Path(os.environ['STUDY_QA_MANIFEST']).write_text(await js('sessionStorage.getItem("qa-created-participants")'),encoding='utf-8')
  async def screenshot(name):
   shot=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True});(runtime/name).write_bytes(base64.b64decode(shot['data']))
  async def input_value(key,value):
   await js('(()=>{const c=document.querySelector("[data-answer='+key+']");c.value='+json.dumps(value)+';c.dispatchEvent(new Event("input",{bubbles:true}));})()')
  async def choose(key,value):await click('[name='+key+'][value="'+str(value)+'"]')
  async def finish_task(key,outcome='complete',seq=4):
   await click('#done');await choose('v4_outcome_'+key,outcome);await choose('v4_seq_'+key,seq)
   if outcome!='complete':await input_value('v4_reason_'+key,'원하는 파일을 만들지 못함')
  async def advance():
   await settled()
   await click('#advance')
   for _ in range(600):
    if await js('!document.querySelector("dialog").open'):break
    await asyncio.sleep(.05)
   await check('!document.querySelector("dialog").open')
  await check('state.version==="study-5"')
  await input_value('participant','QA-V5')
  await choose('pre_ai_frequency','often')
  await check('document.querySelectorAll(".ai-experience").length===2 && !document.querySelector("[data-multi=pre_ai_workflow]")')
  await click('[data-multi=pre_ai_tools][value=chatgpt]')
  await click('[data-multi=pre_ai_purposes][value=write]')
  await js('document.querySelectorAll("[data-ready]").forEach(c=>c.click())')
  await screenshot('v5-prepare.png')
  await click('#start');await check('current()==="T3" && !document.querySelector(".interview-item")')
  await finish_task('T3','partial',3)
  await input_value('v4_reason_T3','')
  await choose('decision_T3','전달 보류');await advance();await check('current()==="T1"')
  await finish_task('T1');await advance()
  await finish_task('T2_1');await input_value('v4_artifact_T2_1','draft.pptx');await click('#draft-opened');await advance()
  await finish_task('T2_2');await advance();await check('current()==="T4"')
  await finish_task('T4');
  for key in ['word','excel','ppt']:await choose('v4_handoff_'+key,'ready')
  await advance();await check('current()==="after" && !document.querySelector(".interview-item")')
  await click('#survey-next');await check('state.surveyPage===0 && !!document.querySelector(".form-error").textContent')
  for key in ['start','status','context','preview']:await choose('v5_'+key,4)
  await js('document.querySelector("[data-answer=extra_v5_start]").closest("details").open=true')
  await input_value('extra_v5_start','시작 위치를 찾은 과정')
  await click('#survey-next');await click('#survey-back');await check('state.answers.v5_start===4 && state.answers.extra_v5_start==="시작 위치를 찾은 과정"')
  await screenshot('v5-survey.png');await click('#survey-next')
  for key in ['resume','changes','recovery']:await choose('v5_'+key,'na')
  await choose('v5_export',4);await click('#survey-next');await check('current()==="finish"')
  await check('!document.querySelector(".interview-item") && !document.querySelector("#content textarea")')
  await check('document.body.innerText.includes("답변은 말로") && !document.body.innerText.includes("최종 제출")')
  await screenshot('v5-interview-welcome.png')
  await click('#start-interview');await settled()
  await check('!!state.answers.v5_interview_started_at && document.querySelector("#interview-guide").open')
  await check('document.querySelectorAll(".interview-item").length===14 && !document.querySelector("[data-answer=v4_interview_1]")')
  await click('.interview-item summary');await click('.interview-item .answer-note summary')
  await input_value('v5_note_recall','첫 장면의 발화 기록');await settled()
  await screenshot('v5-moderator.png')
  await js('window.__beforeReload=true');await call('Page.reload');await ready(True)
  await check('state.answers.v5_note_recall==="첫 장면의 발화 기록" && !document.querySelector("#interview-guide").open')
  await click('.response-review>summary');await click('#edit-post');await choose('v5_start',2);await settled()
  await click('#survey-next');await click('#survey-next');await check('current()==="finish"')
  await js('window.originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=(blob)=>{window.downloadedBlob=blob;return window.originalCreateObjectURL(blob);}')
  await click('#export')
  for _ in range(300):
   if await js('!!window.downloadedBlob'):break
   await asyncio.sleep(.1)
  exported=await js('(async()=>JSON.parse(await window.downloadedBlob.text()))()')
  assert exported['record']['data']['answers']['v5_start']==2,exported
  assert exported['interview']['surveyAtStart']['v5_start']==4,exported
  assert exported['interview']['startRevision']>=1
  assert exported['record']['data']['answers']['v5_note_recall']=='첫 장면의 발화 기록'
  await call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
  await check('document.documentElement.scrollWidth<=innerWidth');await screenshot('v5-mobile.png')
  # All-new AI users skip the two followup pre-survey questions; missing PPT skips revision.
  old_record=await js('recordId')
  await click('#new-record');await click('#create-record')
  for _ in range(300):
   if await js('loaded && recordId!=='+json.dumps(old_record)):break
   await asyncio.sleep(.1)
  await ready()
  if os.environ.get('STUDY_QA_MANIFEST'):Path(os.environ['STUDY_QA_MANIFEST']).write_text(await js('sessionStorage.getItem("qa-created-participants")'),encoding='utf-8')
  await input_value('participant','QA-V5-NEW');await choose('pre_ai_frequency','never')
  await check('[...document.querySelectorAll(".ai-experience")].every(el=>el.hidden)')
  await js('document.querySelectorAll("[data-ready]").forEach(c=>c.click())');await click('#start');await check('current()==="T3"')
  await js('state.order="B";go(2)');await finish_task('T2_1','partial',2);await input_value('v4_reason_T2_1','');await advance()
  await check('current()==="T1" && state.skipped && state.answers.v4_outcome_T2_2==="not_attempted"')
  # Direct navigation cannot reveal interview questions before the survey is complete.
  await js('go(7)');await check('!!document.querySelector("#finish-survey") && !document.querySelector(".interview-item")')
  await settled();assert not errors,errors
  await call('Browser.close')
  print('PASS v5: pre/task/post/interview separation, optional reasons, draft gate, back/edit/autosave, spoken interview, moderator notes, interview boundary export, reload, mobile, AI nonusers, missing PPT, incomplete survey gate.')
try:asyncio.run(run())
finally:
 if process.poll() is None:process.terminate()
