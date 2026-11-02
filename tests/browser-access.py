from pathlib import Path
import asyncio,base64,json,subprocess,urllib.request,uuid,os
from websockets.asyncio.client import connect

root=Path(__file__).resolve().parents[1]
runtime=root/'.runtime'
profile=runtime/('qa-access-'+uuid.uuid4().hex[:8]);profile.mkdir()
base=os.environ.get('STUDY_BROWSER_URL') or 'http://127.0.0.1:'+(runtime/'server-port').read_text()+'/'
admin_key=Path(os.environ.get('STUDY_ADMIN_KEY_FILE',str(root/'.data/admin-key.txt'))).read_text().strip()
process=subprocess.Popen([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)

async def run():
 for _ in range(100):
  try:port=(profile/'DevToolsActivePort').read_text().splitlines()[0];break
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
   r=await call('Runtime.evaluate',{'expression':code,'returnByValue':True,'awaitPromise':True});assert 'exceptionDetails' not in r,r
   return r.get('result',{}).get('value')
  async def wait(code):
   for _ in range(100):
    if await js(code):return
    await asyncio.sleep(.1)
   raise AssertionError(code)
  async def click(selector):
   await wait('!!document.querySelector('+json.dumps(selector)+')')
   await js('document.querySelector('+json.dumps(selector)+').click()')
  async def fill(selector,value):await js('(()=>{const el=document.querySelector('+json.dumps(selector)+');el.value='+json.dumps(value)+';el.dispatchEvent(new Event("input",{bubbles:true}));})()')
  async def screenshot(name):
   result=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True});(runtime/name).write_bytes(base64.b64decode(result['data']))
  async def capture_download():await js('window.originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=(blob)=>{window.downloadedBlob=blob;return window.originalCreateObjectURL(blob);}')
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable')
  if os.environ.get('STUDY_QA_MANIFEST'):
   # Record only IDs created by this test, so synthetic production data can be removed precisely.
   manifest=os.environ['STUDY_QA_MANIFEST']
   await call('Page.addScriptToEvaluateOnNewDocument',{'source':'''window.__qaParticipants=[];const qaFetch=window.fetch;window.fetch=async function(...args){const r=await qaFetch(...args);if(String(args[0]).endsWith('/api/access/start')&&r.ok){const d=await r.clone().json();const ids=JSON.parse(sessionStorage.getItem('qa-created-participants')||'[]');ids.push(d.participant.id);sessionStorage.setItem('qa-created-participants',JSON.stringify(ids));}return r;};'''})
  await call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':900,'deviceScaleFactor':1,'mobile':False})
  await call('Page.navigate',{'url':base});await wait('!!document.querySelector("#entry-start")')
  assert not await js('!!document.querySelector("a[href*=signin-with]")')
  await screenshot('independent-entry.png');await click('#entry-start');await wait('typeof loaded!=="undefined"&&loaded');assert await js('settle()')
  code=await js('window.studyGetToken()');record_id=await js('recordId')
  if os.environ.get('STUDY_QA_MANIFEST'):Path(manifest).write_text(await js('sessionStorage.getItem("qa-created-participants")'),encoding='utf-8')
  await click('[name=pre_ai_frequency][value=often]');assert await js('settle()')
  await js('answer("v5_comment","<img src=x onerror=alert(1)>")');assert await js('settle()')
  await js('document.querySelector(".access-note").open=true');await capture_download();await click('#save-access-code')
  assert code in await js('window.downloadedBlob.text()')
  # A network failure must not display successful server storage; recovery flushes the draft.
  await call('Network.emulateNetworkConditions',{'offline':True,'latency':0,'downloadThroughput':0,'uploadThroughput':0})
  await js('answer("extra_pre_ai_frequency","offline input survives")');await wait('!!failure')
  assert await js('!!local.get("draft:"+recordId)')
  await call('Network.emulateNetworkConditions',{'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
  assert await js('settle()')
  await click('#leave-study');await click('#leave-confirm');await wait('!!document.querySelector("#entry-start")')
  assert await js('!window.studyGetToken()')
  await click('#entry-start');await wait('typeof loaded!=="undefined"&&loaded');assert await js('settle()')
  assert await js('recordId')!=record_id
  if os.environ.get('STUDY_QA_MANIFEST'):Path(manifest).write_text(await js('sessionStorage.getItem("qa-created-participants")'),encoding='utf-8')
  assert await js('(async()=>{const r=await window.studyFetch("/sessions/'+record_id+'");return r.status;})()')==404
  await js('document.querySelector(".access-note").open=true');await click('#leave-study');await click('#leave-confirm')
  await fill('#return-code',code);await click('#resume-form button');await wait('typeof loaded!=="undefined"&&loaded');assert await js('settle()')
  assert await js('recordId')==record_id
  assert await js('state.answers.pre_ai_frequency')=='often'
  assert await js('state.answers.extra_pre_ai_frequency')=='offline input survives'
  await js('window.__beforeReload=true');await call('Page.reload');await wait('typeof loaded!=="undefined"&&loaded&&!window.__beforeReload')
  assert await js('recordId')==record_id
  await js('window.__beforeReload=true');await click('.language-switch a[href="en/index.html?lang=en"]');await wait('typeof loaded!=="undefined"&&loaded&&!window.__beforeReload');assert await js('settle()')
  assert await js('recordId')==record_id
  assert await js('(async()=>{const r=await fetch(document.querySelector("a[download]").href);return r.status;})()')==200
  await call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
  assert await js('document.documentElement.scrollWidth<=innerWidth')
  await call('Page.navigate',{'url':base+'admin.html'});await wait('!!document.querySelector("#admin-login")')
  await fill('#admin-key',admin_key);await click('#admin-login button');await wait('!!document.querySelector("#export-json")')
  await click('[data-view="'+record_id+'"]');await wait('!!document.querySelector("#download-one")')
  assert await js('document.querySelector("#record-detail").innerText.includes("8–15일")')
  assert not await js('!!document.querySelector("#record-detail img")')
  await call('Emulation.setDeviceMetricsOverride',{'width':1280,'height':900,'deviceScaleFactor':1,'mobile':False})
  await screenshot('moderator-dashboard.png');await capture_download();await click('#export-json');await wait('!!window.downloadedBlob')
  exported=json.loads(await js('window.downloadedBlob.text()'));assert any(s['record']['id']==record_id for s in exported['sessions'])
  await js('window.downloadedBlob=null');await click('#export-csv');await wait('!!window.downloadedBlob');assert 'record_id' in await js('window.downloadedBlob.text()')
  await click('#admin-leave');await wait('!!document.querySelector("#admin-login")')
  assert not await js('sessionStorage.getItem("wissly-moderator-access")')
  assert not errors,errors
  await call('Browser.close')
  print('PASS: anonymous entry, return-code download/re-entry, participant isolation, offline recovery, reload, language switching, materials, mobile, moderator authentication, safe rendering, JSON/CSV export and logout.')
try:asyncio.run(run())
finally:
 if process.poll() is None:process.terminate()
