"""Read-only public UI check plus a moderator login immediately followed by logout.
Does not create participants, read study responses or download response exports.
"""
from pathlib import Path
import asyncio,json,subprocess,urllib.request,uuid
from websockets.asyncio.client import connect
root=Path(__file__).resolve().parents[1]
profile=root/'.runtime'/('public-smoke-'+uuid.uuid4().hex[:8]);profile.mkdir()
base='https://kunheeryu.com/wissly-study-web/'
api='https://wissly-study-api.wissly-study-web.workers.dev'
process=subprocess.Popen([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
async def run():
 for _ in range(100):
  try:port=(profile/'DevToolsActivePort').read_text().splitlines()[0];break
  except (FileNotFoundError,PermissionError,IndexError):await asyncio.sleep(.1)
 targets=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json',timeout=5))
 async with connect(next(t for t in targets if t['type']=='page')['webSocketDebuggerUrl']) as ws:
  seq=0;errors=[]
  async def call(method,params=None):
   nonlocal seq
   seq+=1;await ws.send(json.dumps({'id':seq,'method':method,'params':params or {}}))
   while True:
    r=json.loads(await asyncio.wait_for(ws.recv(),30))
    if r.get('method')=='Runtime.exceptionThrown':errors.append(r)
    if r.get('id')==seq:
     assert 'error' not in r,r
     return r.get('result',{})
  async def js(code):
   r=await call('Runtime.evaluate',{'expression':code,'returnByValue':True,'awaitPromise':True})
   assert 'exceptionDetails' not in r,'Browser evaluation failed'
   return r.get('result',{}).get('value')
  await call('Runtime.enable');await call('Page.enable')
  for page,lang in [('', 'ko'),('en/index.html?lang=en','en')]:
   await call('Page.navigate',{'url':base+page})
   for _ in range(200):
    if await js('document.documentElement.lang==='+json.dumps(lang)+'&&!!document.querySelector("#entry-start")'):break
    await asyncio.sleep(.1)
   assert await js('document.documentElement.lang')==lang
   assert await js('window.STUDY_CONFIG.apiBase')==api
   assert await js('!document.querySelector("#entry-start").disabled')
   assert not await js('!!document.querySelector("a[href*=signin-with-chatgpt]")')
   assert await js('(async()=>{const r=await fetch(document.querySelector("a[download]").href);return r.status;})()')==200
  assert await js('(async()=>{const r=await window.studyFetch("/health",{},"");return r.ok&&(await r.json()).ok;})()')
  assert await js('(async()=>{const r=await window.studyFetch("/admin/sessions",{},"");return r.status;})()')==401
  key=(root/'.data/production-admin-key.txt').read_text().strip()
  code='''(async()=>{let token;try{const r=await window.studyFetch('/admin/login',{method:'POST',body:JSON.stringify({key:KEY})},'');if(!r.ok)return {login:r.status};token=(await r.json()).token;return {login:r.status,tokenPresent:!!token};}finally{if(token){const r=await window.studyFetch('/admin/logout',{method:'POST',body:'{}'},token);if(!r.ok)throw new Error('Logout failed');}}})()'''.replace('key:KEY','key:'+json.dumps(key))
  result=await js(code);assert result.get('login')==200 and result.get('tokenPresent'),result
  assert not errors,errors
  await call('Browser.close')
  print('PASS public Pages: Korean/English, enabled entry, materials, HTTPS API/CORS, unauthorized response access denied, moderator login and immediate logout. No study records created or read.')
try:asyncio.run(run())
finally:
 if process.poll() is None:process.terminate()
