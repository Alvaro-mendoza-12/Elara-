import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { boundedModelContext, shouldUseConversationModel } = require('../.test-dist/lib/models.js');
const { conversationInstructions } = require('../.test-dist/lib/conversation-instructions.js');
const { runElaraCoreEngine } = require('../.test-dist/lib/elara-engine/engine.js');
const user = text => ({ role: 'user', text });
const assistant = text => ({ role: 'assistant', text });
const root = 'Crea una tienda de 6 laptops';
const artifact = runElaraCoreEngine([user(root)]).reply;
const cases = [
  {
    id: 'project-correction-after-twenty-turns',
    turns: [user('Mi tienda se llama Brisa. Vendemos plantas.'), assistant('Entendido.'), user('Mi tienda se llama Nube. Ahora vendemos café y pasteles.'), assistant('Anotado.'), ...Array.from({length:20}, (_, i) => i % 2 ? assistant('Anotado.') : user('Seguimos preparando la apertura.')), user('Escribe una sola frase para promocionar mi tienda: usa su nombre y lo que vendemos.')],
    must: [/Nube/i, /caf[eé]|pasteles/i], mustNot: [/Brisa|plantas/i],
  },
  {
    id: 'clarify-current-answer-after-old-website',
    turns: [user(root), assistant(artifact), user('Explícame la fotosíntesis.'), assistant('Las plantas aprovechan la energía de la luz para transformar agua y dióxido de carbono en azúcares, que usan para crecer. En este proceso liberan oxígeno.'), user('Hazlo más claro en una sola frase.')],
    must: [/plantas/i, /luz|sol/i], mustNot: [/```|laptop|cat[aá]logo|index\.html/i],
  },
  {
    id: 'shorten-previous-answer',
    turns: [user('Dame ideas de publicaciones para una tienda de plantas.'), assistant('Publica una guía breve sobre el riego. Muestra cómo cambia una habitación al agregar plantas. Presenta una planta fácil de cuidar cada semana y explica qué luz necesita.'), user('Resúmelo en una sola frase, sin lista.')],
    must: [/plantas|riego/i, /publica|publicacion|publicaciones|publicar|muestra|presenta|contenido/i], mustNot: [/```|Novvin|modelo/i], maxWords: 40,
  },
  {
    id: 'fresh-start-does-not-invent-an-old-name',
    turns: [user('Mi tienda se llama Brisa. Vendemos plantas.'), assistant('Entendido.'), user('Olvida lo anterior, empecemos de cero.'), assistant('De acuerdo, empezamos de nuevo.'), user('¿Cómo se llama mi tienda?')],
    must: [/no.*(?:dicho|nombre|informaci[oó]n)|c[oó]mo se llama|necesito.*nombre/i], mustNot: [/Brisa|plantas|mi tienda es Novvin/i],
  },
];
const publicBase = process.env.ELARA_TEST_URL?.replace(/\/+$/, '');
const runtimeBase = process.env.ELARA_UPSTREAM_URL?.trim().replace(/\/+$/, '');
const runtimeKey = process.env.ELARA_UPSTREAM_API_KEY?.trim();
const account = runtimeKey ? createHmac('sha256', runtimeKey).update('elara-conversation-evaluation').digest('hex') : '';
const results = [];
let cookie = '';
function textFromStream(raw) {
  return raw.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6))).map(part => part.type === 'text-delta' ? part.delta : part.choices?.[0]?.delta?.content || '').join('');
}
try {
  if (publicBase) {
    const fixture = JSON.parse(fs.readFileSync(process.env.ELARA_QA_FIXTURE, 'utf8'));
    const login = await fetch(publicBase + '/api/auth/login', { method:'POST', headers:{Origin:publicBase,'Content-Type':'application/json'}, body:JSON.stringify({email:fixture.email,password:fixture.password}) });
    assert.equal(login.status, 200, 'Synthetic QA login');
    cookie = login.headers.getSetCookie().find(value => /^(?:elara-session|__Host-elara-session)=/.test(value)).split(';')[0];
  } else assert.ok(runtimeBase && runtimeKey, 'Provide the existing private runtime environment or a public QA fixture.');
  for (const sample of cases) {
    const started = Date.now();
    const computed = runElaraCoreEngine(sample.turns);
    const expectedEngine = shouldUseConversationModel('auto',computed.intent) ? 'conversation' : 'core';
    const headers = {'Content-Type':'application/json', ...(publicBase ? {Origin:publicBase,Cookie:cookie} : {Authorization:'Bearer '+runtimeKey,'X-Elara-Account':account})};
    const body = publicBase
      ? {model:'auto',detail:'brief',messages:sample.turns.map((turn,index)=>({id:'context-'+index,role:turn.role,parts:[{type:'text',text:turn.text}]}))}
      : {model:'elara-conversacion-v1',messages:[{role:'system',content:conversationInstructions('brief')},...boundedModelContext(sample.turns)],max_tokens:192,stream:true};
    let text;
    if (!publicBase && expectedEngine === 'core') text = computed.reply;
    else {
      const response = await fetch((publicBase || runtimeBase) + (publicBase ? '/api/chat' : '/chat/completions'), {method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
      assert.equal(response.status, 200, sample.id + ': HTTP ' + response.status);
      if (publicBase) assert.equal(response.headers.get('x-elara-engine'), expectedEngine, sample.id);
      const raw = await response.text();
      assert.doesNotMatch(raw, /"type":"error"/);
      text = textFromStream(raw);
    }
    assert.ok(text.trim().length > 10, sample.id);
    for (const pattern of sample.must) assert.match(text, pattern, sample.id + ': ' + text);
    for (const pattern of sample.mustNot) assert.doesNotMatch(text, pattern, sample.id + ': ' + text);
    if (sample.maxWords) assert.ok(text.trim().split(/\s+/).length <= sample.maxWords, sample.id + ': ' + text);
    const result = {case:sample.id,engine:expectedEngine,elapsedMs:Date.now()-started,text};
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const report = {scope:publicBase || 'Ubuntu runtime',passed:results.length,results};
  fs.writeFileSync('.vercel/context-model-evaluation.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify({scope:report.scope,passed:results.length}));
} finally {
  if (cookie) await fetch(publicBase+'/api/auth/logout',{method:'POST',headers:{Origin:publicBase,'Content-Type':'application/json',Cookie:cookie},body:'{}'});
}
