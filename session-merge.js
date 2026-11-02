// Merge only independent answer changes. A conflicting answer is never silently replaced.
globalThis.mergeStudySession = function(base, local, remote) {
  if(!base || base.version!==local.version || base.version!==remote.version)return null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const out=JSON.parse(JSON.stringify(remote));
  for(const key of new Set([...Object.keys(base.answers),...Object.keys(local.answers)])) {
    if(same(base.answers[key],local.answers[key]))continue;
    if(!same(remote.answers[key],base.answers[key])&&!same(remote.answers[key],local.answers[key]))return null;
    if(key in local.answers)out.answers[key]=local.answers[key];else delete out.answers[key];
  }
  for(const key of ['order','skipped'])if(!same(base[key],local[key]))out[key]=local[key];
  // Another tab's navigation must not move the current participant's screen.
  out.index=local.index;out.surveyPage=local.surveyPage;
  out.furthest=Math.max(local.furthest,remote.furthest,out.index);
  return out;
};
