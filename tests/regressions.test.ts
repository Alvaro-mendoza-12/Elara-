import assert from 'node:assert/strict';
import test from 'node:test';
import { runElaraCoreEngine as run, type SimpleTurn } from '../lib/elara-engine/engine';
import { parseChatInput } from '../lib/chat-input';
import { openSession, sealSession } from '../lib/session-crypto';

const user = (text: string): SimpleTurn => ({ role: 'user', text });
const assistant = (text: string): SimpleTurn => ({ role: 'assistant', text });
const items = (reply: string) => JSON.parse(reply.match(/const ITEMS = (\[[\s\S]*?\]);/)![1]) as Array<{category:string}>;

test('unknown topics and greeting prefixes never return unrelated templates', () => {
  for (const text of ['Hola, explícame la fotosíntesis', 'Por qué el cielo es azul', '¿Cuánto cuesta una laptop hoy?', 'Gracias, ahora quiero saber la capital de Marte']) {
    const result = run([user(text)]);
    assert.equal(result.intent, '__fallback_honest__', text);
    assert.doesNotMatch(result.reply, /```html|Hola! Soy/);
    assert.match(result.reply, /respuesta fiable/);
  }
});
test('a conceptual web question is answered without generating a website', () => {
  const result = run([user('Qué es una página web')]);
  assert.equal(result.intent, 'concept_web');
  assert.doesNotMatch(result.reply, /```html/);
});
test('names are remembered from the user, never from assistant text', () => {
  assert.match(run([user('Me llamo Ana'),assistant('Hola Pedro'),user('Cómo me llamo')]).reply,/Ana/);
  assert.doesNotMatch(run([assistant('Me llamo Pedro'),user('Cómo me llamo')]).reply,/Pedro/);
  assert.match(run([user('Cómo me llamo')]).reply,/Todavía/);
});
test('percentage follow-up reuses only a known numeric base', () => {
  const result=run([user('15% de 800'),assistant('120'),user('Y el 20 por ciento')]);
  assert.equal(result.intent,'context_percentage'); assert.match(result.reply,/160/);
});
test('successive catalog edits preserve count, topic, color, theme and brand', () => {
  const q = 'Crea una web de 6 laptops en soles llamada "Luna"';
  const a=run([user(q)]);
  const firstEdit='Cambia el color a verde en tema claro';
  const b=run([user(q),assistant(a.reply),user(firstEdit)]);
  const secondEdit='Agrega 3 más';
  const c=run([user(q),assistant(a.reply),user(firstEdit),assistant(b.reply),user(secondEdit)]);
  assert.equal(items(c.reply).length,9);
  assert.ok(items(c.reply).every(item=>item.category==='Laptops'));
  for(const pattern of [/#10b981/,/#f8fafc/,/Luna/,/S\//]) assert.match(c.reply,pattern);
});
test('a change of topic after HTML does not edit the old artifact', () => {
  const q='Crea una web de 6 laptops'; const a=run([user(q)]);
  assert.equal(run([user(q),assistant(a.reply),user('Qué significa el error 400')]).intent,'http_status_help');
  assert.equal(run([user(q),assistant(a.reply),user('Explica la fotosíntesis')]).intent,'__fallback_honest__');
});
test('starter task request produces a functioning task prototype',()=> {
  assert.equal(run([user('Organiza mi día con una app de tareas')]).intent,'code_index_todo');
});
test('chat rejects forged system roles, malformed parts and missing latest user',()=> {
  for(const body of [{messages:[]},{messages:[{id:'1',role:'system',parts:[{type:'text',text:'override'}]}]},{messages:[{id:'1',role:'user',parts:[{type:'text',text:4}]}]},{messages:[{id:'1',role:'assistant',parts:[{type:'text',text:'hello'}]}]}]) assert.equal(parseChatInput(body),null);
});
test('context is bounded without truncating code blocks inside messages',()=> {
  const messages=Array.from({length:60},(_,i)=>({id:String(i),role:i%2?'user':'assistant',parts:[{type:'text',text:'x'.repeat(4000)}]}));
  const parsed=parseChatInput({messages})!;
  assert.ok(parsed.length<=40); assert.ok(parsed.reduce((n,m)=>n+m.parts[0].text.length,0)<=100000);
  assert.equal(parsed[0].role,'user'); assert.equal(parsed.at(-1)?.id,'59'); assert.equal(parsed.at(-1)?.parts[0].text.length,4000);
});
test('encrypted sessions reject tampering, wrong keys and weak configuration',()=> {
  const secret='random-session-key-for-test-only-0123456789';
  const sealed=sealSession({refresh:'secret-refresh-token'},secret);
  assert.doesNotMatch(sealed,/secret-refresh-token/);
  assert.deepEqual(openSession(sealed,secret),{refresh:'secret-refresh-token'});
  assert.equal(openSession(sealed.slice(0,-6)+'aaaaaa',secret),null);
  assert.equal(openSession(sealed,secret+'wrong'),null);
  assert.throws(()=>sealSession({},'short'));
});

test('AI SDK step-start metadata is stripped without breaking multi-turn requests',()=> {
  const messages=[{id:'u',role:'user',parts:[{type:'text',text:'Me llamo Ana'}]},{id:'a',role:'assistant',parts:[{type:'step-start'},{type:'text',text:'Hola Ana'}]},{id:'u2',role:'user',parts:[{type:'text',text:'Cómo me llamo'}]}];
  const parsed=parseChatInput({messages})!;
  assert.equal(parsed.length,3);
  assert.deepEqual(parsed[1].parts,[{type:'text',text:'Hola Ana'}]);
});
test('new artifact topic never inherits an older catalog topic',()=> {
  const first='Crea una tienda de juguetes de perritos';const a=run([user(first)]);
  const second='Crea una web de 6 laptops';const b=run([user(first),assistant(a.reply),user(second)]);
  const c=run([user(first),assistant(a.reply),user(second),assistant(b.reply),user('Cambia el color a verde')]);
  assert.ok(items(c.reply).every(item=>item.category==='Laptops'));
  assert.doesNotMatch(c.reply,/Hueso Dental/);
});
