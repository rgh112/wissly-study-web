'use strict';
window.studyTokenKey='wissly-participant-access-v1';
window.studyBackendReady=!!window.STUDY_CONFIG?.apiBase||['localhost','127.0.0.1','[::1]'].includes(location.hostname);
window.studyGetToken=()=>{try{return localStorage.getItem(window.studyTokenKey)||'';}catch{return window.studyMemoryToken||'';}};
window.studySetToken=value=>{window.studyMemoryToken=value;try{if(value)localStorage.setItem(window.studyTokenKey,value);else localStorage.removeItem(window.studyTokenKey);}catch{}};
window.studyFetch=(path,options={},accessToken=window.studyGetToken())=>fetch((window.STUDY_CONFIG?.apiBase||'').replace(/\/$/,'')+'/api'+path,{...options,credentials:'omit',headers:{'Content-Type':'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...options.headers}});
