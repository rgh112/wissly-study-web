import fs from 'node:fs';
const raw=process.argv[2];if(!raw)throw new Error('Usage: node scripts/configure-api.mjs https://your-worker.workers.dev');
const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Provide an HTTPS origin without a path, credentials or query.');
fs.writeFileSync(new URL('../public/config.js',import.meta.url),'window.STUDY_CONFIG='+JSON.stringify({apiBase:url.origin})+';\n');
console.log('Frontend API origin configured: '+url.origin);
