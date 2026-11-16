import assert from 'node:assert/strict';
import test from 'node:test';
import { activeConversationTurns, conversationFacts } from '../lib/conversation-context';
import { boundedModelContext, shouldUseConversationModel } from '../lib/models';
import { runElaraCoreEngine as run, type SimpleTurn } from '../lib/elara-engine/engine';
import { conversationInstructions } from '../lib/conversation-instructions';
import { parseChatInput } from '../lib/chat-input';

const user = (text: string): SimpleTurn => ({ role: 'user', text });
const assistant = (text: string): SimpleTurn => ({ role: 'assistant', text });

test('a request to clarify the current explanation does not modify an older website', () => {
  const root = 'Crea una tienda de 6 laptops';
  const html = run([user(root)]).reply;
  for (const follow of ['Hazlo más claro', 'Explícamelo con un ejemplo', 'Resúmelo en una frase']) {
    const result = run([user(root), assistant(html), user('Explícame la fotosíntesis'), assistant('Las plantas usan la luz para producir azúcares.'), user(follow)]);
    assert.doesNotMatch(result.reply, /```html|Actualicé/);
    assert.equal(shouldUseConversationModel('auto', result.intent), true, follow);
  }
});

test('an explicit reference can return to an earlier artifact after a different topic', () => {
  const root = 'Crea una tienda de 6 laptops';
  const html = run([user(root)]).reply;
  const result = run([user(root), assistant(html), user('Qué es una página web'), assistant('Es un documento que abre el navegador.'), user('En la web anterior, cambia el color a verde')]);
  assert.equal(result.intent, 'code_index_followup');
  assert.match(result.reply, /```html/);
  assert.match(result.reply, /#10b981/);
  assert.match(result.reply, /Laptops/);
});

test('an ambiguous follow-up without a prior answer asks for its referent', () => {
  const result = run([user('Hazlo más claro')]);
  assert.equal(result.intent, 'clarify_reference');
  assert.equal(shouldUseConversationModel('auto', result.intent), false);
  assert.match(result.reply, /Qué texto o idea/);
});

test('a requested fresh start cannot reactivate old facts or an old artifact', () => {
  const root = 'Crea una tienda de 6 laptops';
  const html = run([user(root)]).reply;
  const turns = [user('Me llamo Ana'), assistant('Hola'), user(root), assistant(html), user('Olvida lo anterior, empecemos de cero'), assistant('Empezamos de nuevo.'), user('Hazlo más claro')];
  assert.doesNotMatch(run(turns).reply, /```html/);
  assert.doesNotMatch(JSON.stringify(boundedModelContext(turns)), /Ana|laptops|Laptops/);
  assert.equal(activeConversationTurns(turns)[0].text, 'Olvida lo anterior, empecemos de cero');
  assert.match(run([...turns, assistant('De acuerdo'), user('Cómo me llamo')]).reply, /Todavía/);
});

test('explicit project facts survive beyond the recent sixteen turns and corrections win', () => {
  const turns = [user('Mi tienda se llama Brisa. Vendemos plantas y macetas.'), assistant('Entendido.'), user('Mi tienda se llama Nube. Ahora vendemos café y pasteles.'), assistant('Anotado.'), ...Array.from({length:20}, (_, i) => i % 2 ? assistant('Anotado.') : user('Seguimos preparando la apertura.')), user('Escribe una frase para mi tienda con su nombre y sus productos.')];
  const context = boundedModelContext(turns)!;
  const content = JSON.stringify(context);
  assert.match(content, /Nube/);
  assert.match(content, /café y pasteles/);
  assert.doesNotMatch(content, /Brisa|plantas/);
  assert.equal(context.at(-1)?.content, turns.at(-1)?.text);
  assert.ok(context.reduce((n, turn) => n + turn.content.length, 0) <= 7500);
});

test('user facts cannot be invented by an assistant or extracted from attached code', () => {
  assert.deepEqual(conversationFacts([assistant('Mi tienda se llama Falsa. Vendemos oro.'), user('```txt\nMe llamo Pedro. Mi tienda se llama Oculta.\n```')]), {});
});

test('name recall handles a correction and does not include an unrelated clause', () => {
  const turns = [user('Me llamo Ana y vendo plantas'), assistant('Entendido'), user('En realidad me llamo Lucía.'), assistant('Gracias'), user('Cómo me llamo')];
  assert.match(run(turns).reply, /Lucía/);
  assert.doesNotMatch(run(turns).reply, /Ana|vendo/);
  assert.match(run([user('Me llamo Ana y vendo plantas'), assistant('Hola'), user('Cómo me llamo')]).reply, /\*\*Ana\*\*/);
});

test('large earlier answers do not erase the project facts or the latest request', () => {
  const turns = [user('Mi proyecto se llama Faro.'), assistant('Respuesta larga. '.repeat(2000)), user('Dame un eslogan con su nombre.')];
  const context = boundedModelContext(turns)!;
  assert.match(JSON.stringify(context), /Faro/);
  assert.equal(context.at(-1)?.content, turns.at(-1)?.text);
  assert.ok(context.reduce((n, turn) => n + turn.content.length, 0) <= 7500);
});

test('the safety check retains priority even when the user asks to change topics', () => {
  const result = run([user('me quiero matar'), assistant('Busca compañía'), user('Olvida eso, estoy solo y tengo las pastillas')]);
  assert.equal(result.intent, 'safety_crisis_support');
});

test('a chain of percentage edits uses the same base but a new topic requires clarification', () => {
  const turns = [user('15% de 800'), assistant('120'), user('Y el 20%'), assistant('160'), user('Y el 2,5%')];
  assert.match(run(turns).reply, /\*\*20\*\*/);
  const unrelated = run([...turns, assistant('20'), user('Qué es una página web'), assistant('Es un documento.'), user('Y el 30%')]);
  assert.equal(unrelated.intent, 'clarify_percentage');
  assert.doesNotMatch(unrelated.reply, /800|240/);
});

test('the compact context and instructions fit the existing runtime limits', () => {
  const turns = [user('Me llamo Lucía. Mi tienda se llama Nube. Vendemos café y pasteles. Mi público objetivo son estudiantes. Prefiero respuestas en español.'), assistant('Entendido.'), user('x'.repeat(6000))];
  const context = boundedModelContext(turns)!;
  assert.ok(context.length + 1 <= 24);
  assert.ok(context.reduce((n, turn) => n + turn.content.length, 0) + conversationInstructions('explain').length < 10000);
  assert.equal(context.at(-1)?.content, turns.at(-1)?.text);
});

test('escaping unusual input cannot exceed the context budget or replace the latest request', () => {
  const unusual = '\u0001'.repeat(190);
  const facts = user('Mi tienda se llama '+unusual+'. Vendemos '+unusual+'. Mi público objetivo '+unusual+'. Prefiero respuestas '+unusual+'.');
  const latest = user('x'.repeat(6000));
  const context = boundedModelContext([facts,assistant('Entendido.'),latest])!;
  assert.equal(context.at(-1)?.content,latest.text);
  assert.ok(context.reduce((n,turn)=>n+turn.content.length,0)<=7500);
  const rewrite = boundedModelContext([facts,assistant(unusual.repeat(10)),user('Resúmelo')])!;
  assert.ok(rewrite.at(-1)?.content.endsWith('Resúmelo'));
  assert.ok(rewrite.reduce((n,turn)=>n+turn.content.length,0)<=7500);
});

test('a reformulation receives the actual text to edit and keeps the user request', () => {
  const answer = 'Publica una guía de riego y presenta una planta fácil de cuidar cada semana.';
  const request = 'Resúmelo en una sola frase';
  const context = boundedModelContext([user('Dame ideas para publicaciones'),assistant(answer),user(request)])!;
  assert.match(context.at(-1)!.content, /Publica una guía de riego/);
  assert.ok(context.at(-1)!.content.endsWith(request));
  assert.equal(context.filter(turn => turn.role === 'assistant').length, 0);
  const withoutOldTopics = boundedModelContext([user('Crea una tienda de laptops'),assistant('HTML creado'),user('Qué es el riego'),assistant(answer),user(request)])!;
  assert.doesNotMatch(JSON.stringify(withoutOldTopics), /laptops|HTML creado/);
});

test('project name recall uses corrected user data or asks instead of inventing a name', () => {
  const turns = [user('Mi tienda se llama Brisa'),assistant('Anotado'),user('Mi tienda se llama Nube'),assistant('Entendido'),user('Cómo se llama mi tienda')];
  const result = run(turns);
  assert.equal(result.intent,'context_project_name');
  assert.match(result.reply,/Nube/);
  assert.doesNotMatch(result.reply,/Brisa/);
  assert.match(run([assistant('Mi tienda se llama Novvin'),user('Cómo se llama mi tienda')]).reply,/Todavía no/);
});

test('explicit denials do not leave a rejected name in memory', () => {
  assert.equal(conversationFacts([user('Me llamo Ana'),user('No me llamo Ana')]).nombre, undefined);
  assert.equal(conversationFacts([user('Mi tienda se llama Brisa'),user('Mi tienda no se llama Brisa')]).proyecto, undefined);
  assert.equal(conversationFacts([user('Mi tienda se llama Brisa'),user('Mi tienda no se llama Brisa, se llama Faro')]).proyecto, 'Faro');
  assert.match(run([user('Me llamo Ana'),assistant('Hola'),user('No me llamo Ana'),assistant('Entendido'),user('Cómo me llamo')]).reply, /Todavía/);
  assert.deepEqual(conversationFacts([user('Como ejemplo, me llamo Pedro. Mi tienda se llama Oculta.')]), {});
});

test('a name explicitly provided in a website brief is available for recall', () => {
  const root = 'Crea una tienda de 6 laptops llamada "Luna"';
  const result = run([user(root),assistant(run([user(root)]).reply),user('Cómo se llama mi tienda')]);
  assert.match(result.reply,/Luna/);
});

test('a short summary preserves actual publication ideas instead of restating the editing task', () => {
  const turns = [user('Dame ideas de publicaciones para una tienda de plantas.'),assistant('Publica una guía breve sobre el riego. Muestra cómo cambia una habitación al agregar plantas. Presenta una planta fácil de cuidar cada semana.'),user('Resúmelo en una sola frase, sin lista.')];
  const result = run(turns);
  assert.equal(result.intent, 'context_summary');
  assert.match(result.reply, /Publica.*riego/);
  assert.match(result.reply, /plantas/);
  assert.doesNotMatch(result.reply, /Reformula|Reforma|Resumido a|resume tu/);
  assert.equal(result.reply.split(/(?<=[.!?])\s+/).length, 1);
  assert.ok(result.reply.split(/\s+/).length <= 40);
  assert.equal(shouldUseConversationModel('auto',result.intent),false);
  assert.equal(run([...turns.slice(0,-1),user('Resúmelo en inglés')]).intent,'__fallback_honest__');
});

test('request parsing retains user facts around a large older answer and never drops the latest request', () => {
  const message = (id: string, role: 'user' | 'assistant', parts: string[]) => ({id,role,parts:parts.map(text => ({type:'text',text}))});
  const parsed = parseChatInput({messages:[message('1','user',['Mi tienda se llama Faro.']),message('2','assistant',['x'.repeat(50000),'y'.repeat(50000)]),message('3','user',['Cómo se llama mi tienda'])]})!;
  assert.equal(parsed.at(-1)?.id, '3');
  assert.match(parsed[0].parts[0].text, /Faro/);
  assert.equal(parseChatInput({messages:[message('too-large','user',['x'.repeat(50000),'y'.repeat(50000),'z'])]}), null);
});
