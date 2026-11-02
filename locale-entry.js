'use strict';
if(new URLSearchParams(location.search).get('lang')==='en'&&document.documentElement.lang!=='en')location.replace(new URL('en/index.html?lang=en',document.baseURI).href);
