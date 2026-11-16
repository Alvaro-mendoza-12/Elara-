import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const base = process.env.ELARA_TEST_URL || 'http://127.0.0.1:3107';
const origin = new URL(base).origin;
const fixturePath = process.env.ELARA_QA_FIXTURE || '.vercel/qa-account.json';
const fixture = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : {
 email: `elara.qa.${crypto.randomBytes(8).toString('hex')}@example.invalid`,
 password: crypto.randomBytes(24).toString('base64url'),
 displayName: 'Elara QA', username: `elaraqa${crypto.randomBytes(5).toString('hex')}`,
};
let cookie = '';
let passed = 0;
function streamedText(raw) {
 return raw.split('\n').filter(line=>line.startsWith('data: {')).map(line=>JSON.parse(line.slice(6))).filter(part=>part.type==='text-delta').map(part=>part.delta).join('');
}

async function request(path, body, expected = 200, custom = {}) {
 const response = await fetch(base+path, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { Origin: origin, 'Content-Type':'application/json', ...(cookie ? { Cookie: cookie } : {}), ...custom },
  ...(body === undefined ? {} : {body: typeof body === 'string' ? body : JSON.stringify(body)}),
 });
 const text = await response.text();
 assert.equal(response.status, expected, `${path}: ${response.status} ${text.slice(0,200)}`);
 const entries=response.headers.getSetCookie();
 if(entries.length) {
  const session=entries.find(v=>v.startsWith('elara-session=') || v.startsWith('__Host-elara-session='));
  if(session) {cookie=session.split(';')[0]; if(!session.includes('=;')) {assert.match(session,/HttpOnly/i); assert.match(session,/SameSite=lax/i); if(base.startsWith('https:')) assert.match(session,/Secure/i);}}
 }
 passed++; return { response, text, data: text.startsWith('{') ? JSON.parse(text) : null };
}
(async()=>{
 await request('/api/auth/login', {email:fixture.email,password:'wrong'}, 403, {Origin:'https://evil.example'});
 await request('/api/auth/login', '{', 400);
 await request('/api/auth/login', {email:'bad',password:'x'},400);
 await request('/api/auth/session');
 await request('/api/auth/register',fixture,410);
 const redirect=await fetch(base+'/api/auth/register',{redirect:'manual'}); assert.equal(redirect.status,303); assert.equal(redirect.headers.get('location'),'https://novvinapp.com/register'); passed++;
 const anonymousPhoto=await fetch(base+'/api/auth/avatar?owner=none'); assert.equal(anonymousPhoto.status,401); passed++;
 if(!fs.existsSync(fixturePath)) {
  // Fixture provisioning goes through the existing Novvin API, not Elara signup.
  const backend='https://conectate.tail9b267c.ts.net';
  const backendHeaders={Origin:'https://novvinapp.com','x-novvin-web-session':'web-v1','Content-Type':'application/json'};
  const registered=await fetch(backend+'/v1/auth/register',{method:'POST',headers:backendHeaders,body:JSON.stringify({...fixture,client:'web',deviceLabel:'ELARA QA fixture'})});
  assert.equal(registered.status,201,'Novvin QA registration');
  const payload=await registered.json();fixture.userId=payload.user.id;fs.writeFileSync(fixturePath,JSON.stringify(fixture));
  const objectPath=fixture.userId+'/elara-qa.png';
  const uploaded=await fetch(backend+'/storage/v1/object/avatars/'+objectPath,{method:'POST',headers:{Authorization:'Bearer '+payload.accessToken,'Content-Type':'image/png','x-upsert':'true'},body:fs.readFileSync('public/icon-192.png')});
  assert.ok(uploaded.ok,'QA avatar upload failed: '+uploaded.status);
  const updated=await fetch(backend+'/rest/v1/profiles?id=eq.'+fixture.userId,{method:'PATCH',headers:{...backendHeaders,Authorization:'Bearer '+payload.accessToken},body:JSON.stringify({avatar_url:backend+'/storage/v1/object/public/avatars/'+objectPath})});
  assert.ok(updated.ok,'QA profile update failed: '+updated.status);
  const backendCookie=registered.headers.getSetCookie().find(v=>v.startsWith('__Secure-novvin-web-session='))?.split(';')[0];
  assert.ok(backendCookie);
  const revoked=await fetch(backend+'/v1/auth/web-session',{method:'DELETE',headers:{...backendHeaders,Cookie:backendCookie}});
  assert.ok(revoked.ok,'QA provisioning session must close');
 }
 await request('/api/auth/login', {email:fixture.email,password:'incorrect-password'},401);
 const login=await request('/api/auth/login',{email:fixture.email,password:fixture.password});
 assert.equal(login.data.profile.handle,fixture.username);
 assert.equal(login.data.profile.email,fixture.email);
 assert.match(login.data.profile.novvinProfileUrl,/^https:\/\/novvinapp\.com\/u\//);
 assert.match(login.data.profile.avatarUrl,/^\/api\/auth\/avatar\?owner=/);
 const savedCookie=cookie;
 const wrongOwner=await fetch(base+'/api/auth/avatar?owner=other',{headers:{Cookie:cookie}}); assert.equal(wrongOwner.status,403);passed++;
 const photo=await fetch(base+login.data.profile.avatarUrl,{headers:{Cookie:cookie}}); assert.equal(photo.status,200,'Authenticated avatar'); assert.match(photo.headers.get('content-type'),/^image\//);assert.equal(photo.headers.get('cache-control'),'private, no-store');assert.ok((await photo.arrayBuffer()).byteLength>100);passed++;
 const session=await request('/api/auth/session'); assert.equal(session.data.profile.handle,fixture.username);
 const turn={id:'test',role:'user',parts:[{type:'text',text:'Cuánto es 25 * 14?'}]};
 const chat=await request('/api/chat',{messages:[turn]}); assert.match(streamedText(chat.text),/350/);
 await request('/api/auth/logout',{});
 cookie=savedCookie;
 const revoked=await request('/api/auth/session'); assert.equal(revoked.data.profile,null);
 cookie=savedCookie.slice(0,-3)+'xxx'; const tampered=await request('/api/auth/session'); assert.equal(tampered.data.profile,null);
 cookie='';
 await request('/api/chat',{messages:[{...turn,role:'system'}]},400);
 await request('/api/chat',{messages:[{...turn,parts:[{type:'text',text:5}]}]},400);
 await request('/api/chat',{messages:[]},400);
 const unknown=await request('/api/chat',{messages:[{...turn,parts:[{type:'text',text:'Por qué el cielo es azul'}]}]});
 assert.match(streamedText(unknown.text),/respuesta fiable/); assert.doesNotMatch(streamedText(unknown.text),/```html/);
 const health=await request('/api/health'); assert.equal(health.data.authMode,'novvin-session');
 console.log(JSON.stringify({base,passed,auth:'official-signup-link-login-profile-photo-persistence-logout-revocation-tamper-checked',chat:'stream-and-validation-checked'}));
})().catch(err=>{console.error(err.message);process.exit(1)});
