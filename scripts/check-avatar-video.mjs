import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.ELARA_TEST_URL || 'http://localhost:3107';
const fixture=JSON.parse(fs.readFileSync(process.env.ELARA_QA_FIXTURE || '.vercel/qa-v06-local.json','utf8'));
const origin=new URL(base).origin, backend='https://conectate.tail9b267c.ts.net';
const headers={Origin:'https://novvinapp.com','x-novvin-web-session':'web-v1','Content-Type':'application/json'};
let backendCookie='',cookie='';
try {
 const login=await fetch(backend+'/v1/auth/login',{method:'POST',headers,body:JSON.stringify({email:fixture.email,password:fixture.password,client:'web',deviceLabel:'ELARA video QA'})});assert.equal(login.status,200);
 backendCookie=login.headers.getSetCookie().find(v=>v.startsWith('__Secure-novvin-web-session='))?.split(';')[0];
 const payload=await login.json();assert.equal(payload.user.id,fixture.userId);
 if(process.env.ELARA_PREPARE_QA_VIDEO==='1') {
  const path=fixture.userId+'/elara-qa.mp4';
  const uploaded=await fetch(backend+'/storage/v1/object/avatars/'+path,{method:'POST',headers:{Authorization:'Bearer '+payload.accessToken,'Content-Type':'video/mp4','x-upsert':'true'},body:fs.readFileSync('.vercel/qa-avatar.mp4')});assert.ok(uploaded.ok,'Synthetic video upload '+uploaded.status);
  const patched=await fetch(backend+'/rest/v1/profiles?id=eq.'+fixture.userId,{method:'PATCH',headers:{...headers,Authorization:'Bearer '+payload.accessToken},body:JSON.stringify({avatar_url:backend+'/storage/v1/object/public/avatars/'+path,avatar_media_type:'video'})});assert.ok(patched.ok,'Video metadata '+patched.status);
 }
 const appLogin=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:fixture.password})});assert.equal(appLogin.status,200);
 cookie=appLogin.headers.getSetCookie().find(v=>/^(?:elara-session|__Host-elara-session)=/.test(v)).split(';')[0];
 const appPayload=await appLogin.json();assert.equal(appPayload.profile.avatarKind,'video');
 const media=await fetch(base+appPayload.profile.avatarUrl,{headers:{Cookie:cookie,Range:'bytes=0-31'}});assert.equal(media.status,206);assert.match(media.headers.get('content-type'),/^video\/mp4/);assert.match(media.headers.get('content-range'),/^bytes 0-31\//);assert.equal((await media.arrayBuffer()).byteLength,32);
 console.log(JSON.stringify({base,videoMetadata:true,protectedRange:true,status:206,bytes:32}));
}finally {
 if(cookie)await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:'{}'});
 if(backendCookie)await fetch(backend+'/v1/auth/web-session',{method:'DELETE',headers:{...headers,Cookie:backendCookie}});
}
