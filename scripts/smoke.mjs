import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const base = process.env.ELARA_TEST_URL || 'http://127.0.0.1:3107';
const origin = new URL(base).origin;
const fixturePath = '.vercel/qa-account.json';
const fixture = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : {
 email: `elara.qa.${crypto.randomBytes(8).toString('hex')}@example.invalid`,
 password: crypto.randomBytes(24).toString('base64url'),
 displayName: 'Elara QA', username: `elaraqa${crypto.randomBytes(5).toString('hex')}`,
};
let cookie = '';
let passed = 0;
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
 if(!fs.existsSync(fixturePath)) {
  const result=await request('/api/auth/register',fixture);
  assert.equal(result.data.profile.displayName,'Elara QA');
  assert.equal(result.data.profile.linkedMethod,'novvin-session');
  assert.equal(result.data.accessToken, undefined);
  fs.writeFileSync(fixturePath,JSON.stringify(fixture));
  await request('/api/auth/logout',{});
 }
 await request('/api/auth/login', {email:fixture.email,password:'incorrect-password'},401);
 const login=await request('/api/auth/login',{email:fixture.email,password:fixture.password});
 assert.equal(login.data.profile.handle,fixture.username);
 const savedCookie=cookie;
 const session=await request('/api/auth/session'); assert.equal(session.data.profile.handle,fixture.username);
 const turn={id:'test',role:'user',parts:[{type:'text',text:'Cuánto es 25 * 14?'}]};
 const chat=await request('/api/chat',{messages:[turn]}); assert.match(chat.text,/350/);
 await request('/api/auth/logout',{});
 cookie=savedCookie;
 const revoked=await request('/api/auth/session'); assert.equal(revoked.data.profile,null);
 cookie=savedCookie.slice(0,-3)+'xxx'; const tampered=await request('/api/auth/session'); assert.equal(tampered.data.profile,null);
 cookie='';
 await request('/api/chat',{messages:[{...turn,role:'system'}]},400);
 await request('/api/chat',{messages:[{...turn,parts:[{type:'text',text:5}]}]},400);
 await request('/api/chat',{messages:[]},400);
 const unknown=await request('/api/chat',{messages:[{...turn,parts:[{type:'text',text:'Por qué el cielo es azul'}]}]});
 assert.match(unknown.text,/respuesta fiable/); assert.doesNotMatch(unknown.text,/```html/);
 const health=await request('/api/health'); assert.equal(health.data.authMode,'novvin-session');
 console.log(JSON.stringify({base,passed,auth:'register-login-persistence-logout-revocation-tamper-checked',chat:'stream-and-validation-checked'}));
})().catch(err=>{console.error(err.message);process.exit(1)});
