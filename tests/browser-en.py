from pathlib import Path
import asyncio,base64,json,subprocess,urllib.request,uuid
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
    r=json.loads(await asyncio.wait_for(ws.recv(),15))
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
  await call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
  await call('Page.navigate',{'url':'http://127.0.0.1:'+ (runtime/'server-port').read_text()+'/?lang=en'})
  await click('#entry-start')
  await ready()
  async def screenshot(name):
   shot=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True});(runtime/name).write_bytes(base64.b64decode(shot['data']))
  async def input_value(key,value):
   await js('(()=>{const c=document.querySelector("[data-answer='+key+']");c.value='+json.dumps(value)+';c.dispatchEvent(new Event("input",{bubbles:true}));})()')
  async def choose(key,value):await click('[name='+key+'][value="'+str(value)+'"]')
  async def finish_task(key,outcome='complete',seq=4):
   await click('#done');await choose('v4_outcome_'+key,outcome);await choose('v4_seq_'+key,seq)
   if outcome!='complete':await input_value('v4_reason_'+key,'원하는 파일을 만들지 못함')
  async def advance():
   await click('#advance')
   for _ in range(100):
    if await js('!document.querySelector("dialog").open'):break
    await asyncio.sleep(.05)
   await check('!document.querySelector("dialog").open')
  async def english_screen():
   texts=await js(r'''(()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const bad=[];let n;while(n=walker.nextNode()){if(n.parentElement.closest('script,style,textarea,.language-switch'))continue;const range=document.createRange();range.selectNode(n);if(range.getBoundingClientRect().width && /[\uac00-\ud7a3]/.test(n.textContent))bad.push(n.textContent);}return bad;})()''')
   assert not texts,texts
  await check('state.version==="study-5" && document.documentElement.lang==="en"')
  await settled();await check('state.answers.study_language==="en"')
  await english_screen()
  await check('document.querySelector("a[download]").getAttribute("href")==="materials/en/wissly-study-materials.zip"')
  await input_value('participant','QA-EN');await choose('pre_ai_frequency','often')
  await click('[data-multi=pre_ai_tools][value=chatgpt]');await click('[data-multi=pre_ai_purposes][value=write]')
  await js('document.querySelectorAll("[data-ready]").forEach(c=>c.click())')
  await screenshot('en-prepare.png');await click('#start');await english_screen()
  await check('document.querySelector("h1").textContent==="Review a report"')
  await click('#done');await click('#advance');await english_screen()
  await choose('v4_outcome_T3','complete');await choose('v4_seq_T3',4);await choose('decision_T3','전달 보류')
  await screenshot('en-progress.png');await english_screen();await advance()
  await english_screen();await finish_task('T1');await advance()
  await english_screen();await finish_task('T2_1');await click('#advance');await english_screen()
  await check('document.querySelector("dialog").open')
  await input_value('v4_artifact_T2_1','draft.pptx');await click('#draft-opened');await advance()
  await english_screen();await finish_task('T2_2');await advance()
  await english_screen();await finish_task('T4')
  for key in ['word','excel','ppt']:await choose('v4_handoff_'+key,'ready')
  await english_screen();await advance();await click('#survey-next');await english_screen()
  for key in ['start','status','context','preview']:await choose('v5_'+key,4)
  await js('document.querySelector("[data-answer=extra_v5_start]").closest("details").open=true')
  await input_value('extra_v5_start','The starting point was clear.')
  await click('#survey-next');await click('#survey-back');await check('state.answers.extra_v5_start==="The starting point was clear."')
  await screenshot('en-survey.png');await click('#survey-next');await english_screen()
  for key in ['resume','changes','recovery']:await choose('v5_'+key,'na')
  await choose('v5_export',4);await click('#survey-next');await english_screen()
  await check('!document.querySelector("#content textarea") && document.body.innerText.includes("Please answer aloud")')
  await screenshot('en-interview-welcome.png');await click('#start-interview');await settled()
  await js('document.querySelectorAll(".interview-item").forEach(el=>el.open=true)');await english_screen()
  await click('.interview-item .answer-note summary');await input_value('v5_note_recall','Participant recalled the file preview.');await settled()
  await js('window.__beforeReload=true');await call('Page.reload');await ready(True)
  await check('state.answers.v5_note_recall==="Participant recalled the file preview." && state.answers.study_language==="en"')
  await click('.response-review>summary');await click('#edit-post');await choose('v5_start',2);await settled()
  await click('#survey-next');await click('#survey-next')
  await js('window.originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=(blob)=>{window.downloadedBlob=blob;return window.originalCreateObjectURL(blob);}')
  await click('#export');await asyncio.sleep(.3)
  exported=await js('(async()=>JSON.parse(await window.downloadedBlob.text()))()')
  assert exported['record']['data']['answers']['v5_start']==2
  assert exported['interview']['surveyAtStart']['v5_start']==4
  assert exported['interview']['surveyAtStart']['study_language']=='en'
  # Language switching retains the same record and edits, and records the language change.
  original_id=await js('recordId')
  await js('window.__beforeReload=true');await click('.language-switch a[href="./?lang=ko"]');await ready(True);await settled()
  await check('document.documentElement.lang==="ko" && state.answers.study_language==="ko" && state.answers.v5_start===2')
  assert await js('recordId')==original_id
  await js('window.__beforeReload=true');await click('.language-switch a[href="en/index.html?lang=en"]');await ready(True);await settled()
  await check('state.answers.study_language==="en" && state.answers.v5_start===2')
  await call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
  await check('document.documentElement.scrollWidth<=innerWidth');await english_screen();await screenshot('en-mobile.png')
  await click('#help');await english_screen();await click('dialog button[value=cancel]')
  await click('#records');await english_screen();await click('#start-new');await english_screen();await click('#create-record');await asyncio.sleep(.3);await ready()
  await input_value('participant','QA-EN-NEW');await choose('pre_ai_frequency','never')
  await check('[...document.querySelectorAll(".ai-experience")].every(el=>el.hidden)')
  await js('document.querySelectorAll("[data-ready]").forEach(c=>c.click())');await click('#start')
  await js('state.order="B";go(2)');await finish_task('T2_1','partial',2);await input_value('v4_reason_T2_1','');await advance()
  await check('state.skipped && state.answers.v4_outcome_T2_2==="not_attempted"')
  await js('go(3)');await english_screen();await check('document.body.innerText.includes("was not attempted")')
  await js('go(7)');await english_screen();await check('!!document.querySelector("#finish-survey") && !document.querySelector(".interview-item")')
  await settled();assert not errors,errors
  await call('Browser.close')
  print('PASS English: all task and survey screens, English materials links, choice codes, validation, draft prerequisites, interview notes/boundary/export, language switching without loss, AI nonusers, skipped task, mobile, help and records.')
try:asyncio.run(run())
finally:
 if process.poll() is None:process.terminate()
