import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.ELARA_TEST_URL || 'http://localhost:3107';
const origin=new URL(base).origin;
const fixture=JSON.parse(fs.readFileSync(process.env.ELARA_QA_FIXTURE || '.vercel/qa-v06-local.json','utf8'));
const audio=fs.readFileSync(process.env.ELARA_QA_AUDIO || '.vercel/qa-speech.webm');
let cookie='',passed=0;
async function request(body,type,status,source=origin){const response=await fetch(base+'/api/transcribe',{method:'POST',headers:{Origin:source,'Content-Type':type,Connection:'close',...(cookie?{Cookie:cookie}:{})},body,signal:AbortSignal.timeout(55000)});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));passed++;return data;}
try {
 await request(audio,'audio/webm',403,'https://evil.example');
 await request(audio,'audio/webm',401);
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:fixture.password})});assert.equal(login.status,200);
 cookie=login.headers.getSetCookie().find(v=>/^(?:elara-session|__Host-elara-session)=/.test(v)).split(';')[0];
 await request('{}','application/json',415);await request('short','audio/webm',400);await request(Buffer.alloc(2000001),'audio/webm',413);
 const started=Date.now();const data=await request(audio,'audio/webm',200);assert.match(data.text,/tienda/i);assert.match(data.text,/plantas/i);
 console.log(JSON.stringify({base,passed,elapsedMs:Date.now()-started,syntheticTranscript:data.text}));
} finally {if(cookie)await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:'{}'});}
