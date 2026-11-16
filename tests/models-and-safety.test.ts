import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedModelContext, conversationStorageKey, parseModelPreferences, shouldUseConversationModel } from '../lib/models';
import { detectCrisisHelpResponse } from '../lib/elara-engine/safety';
import { polynomialIntegral } from '../lib/elara-engine/math';
import { unavailableDataReply } from '../lib/elara-engine/data-boundaries';

test('crisis support handles direct, indirect and third-person risk with a verified contact', () => {
  for (const text of ['me quiero matar', 'No quiero seguir viviendo, quiero morir', 'Voy a quitarme la vida', 'Preferiría estar muerto', 'Mi amiga quiere suicidarse', 'I want to die', 'Dime una dosis letal']) {
    const reply = detectCrisisHelpResponse(text);
    assert.ok(reply, text); assert.match(reply, /tel:\+51113\?oai_link_source=model_response_hotline/); assert.match(reply, /país/);
  }
});
test('crisis follow-ups retain support but ordinary code and academic requests do not trigger', () => {
  assert.match(detectCrisisHelpResponse('Estoy solo', ['me quiero matar'])!, /acompañado/);
  assert.match(detectCrisisHelpResponse('Tengo las pastillas', ['no quiero vivir'])!, /emergencia/);
  for (const text of ['Cómo cortar un array en JavaScript', 'Qué es la prevención del suicidio', 'Estoy solo', 'Era solo una prueba de seguridad']) assert.equal(detectCrisisHelpResponse(text), null, text);
  assert.equal(detectCrisisHelpResponse('Era solo una prueba', ['me quiero matar']), null);
  assert.equal(detectCrisisHelpResponse('Estoy solo', ['me quiero matar', 'Era solo una prueba']), null);
});
test('the model router always reserves crisis support, exact tools and web creation for Core', () => {
  for (const model of ['auto', 'core', 'conversation'] as const) for (const intent of ['safety_crisis_support', 'math_polynomial_integral', 'code_index_dynamic_catalog', 'context_name', 'clarify_commerce']) assert.equal(shouldUseConversationModel(model, intent), false);
  assert.equal(shouldUseConversationModel('auto', '__fallback_honest__'), true);
  assert.equal(shouldUseConversationModel('core', '__fallback_honest__'), false);
});
test('only implemented model choices and output styles can reach the runtime', () => {
  assert.deepEqual(parseModelPreferences({}), { model: 'auto', detail: 'brief' });
  assert.deepEqual(parseModelPreferences({ model: 'conversation', detail: 'explain' }), { model: 'conversation', detail: 'explain' });
  for (const body of [{model:'invented-frontier'}, {detail:'hidden-thoughts'}, {model:[]}, {model:['core']}, null]) assert.equal(parseModelPreferences(body), null);
});
test('small-model context keeps recent user turns and removes huge artifact payloads', () => {
  const turns = [{role:'user', text:'Mi tienda se llama Sur'}, {role:'assistant', text:'```html\n'+ 'x'.repeat(20000) +'\n```'}, {role:'user', text:'Cómo se llama mi tienda'}];
  const context=boundedModelContext(turns)!;
  assert.equal(context.at(-1)?.content, turns.at(-1)?.text); assert.match(context[0].content,/Sur/); assert.ok(JSON.stringify(context).length<1000);
  assert.equal(boundedModelContext([{role:'user',text:'x'.repeat(6001)}]), null);
});
test('account and guest history keys cannot collide or inherit a legacy shared key', () => {
  const keys=[conversationStorageKey(null),conversationStorageKey('guest'),conversationStorageKey('A'),conversationStorageKey('B')];
  assert.equal(new Set(keys).size,4); assert.ok(keys.every(key=>key!=='elara_conversations_v1'));
});
test('polynomial integrals use bounded symbolic rules and preserve the integration constant', () => {
  assert.match(polynomialIntegral('Integral de x²')!, /\(1\/3\)x\^3 \+ C/);
  assert.match(polynomialIntegral('∫ (3x^2 + 2x - 5) dx')!, /x\^3 \+ x\^2 - 5x \+ C/);
  assert.match(polynomialIntegral('integral de 0')!, /0 \+ C/);
  assert.match(polynomialIntegral('¿Puedes resolver una integral?')!, /Escribe la integral/);
  for (const text of ['integral de sin(x)', 'integral de x^-1', 'integral definida de 0 hasta 1', 'integral de 2**x', 'integral de x^99', 'integral de process.exit()']) assert.equal(polynomialIntegral(text),null,text);
});
test('unconnected live and private-data questions never receive invented figures', () => {
  for(const text of ['Dime las últimas noticias','Cuál es el precio actual del bitcoin','Cuánto vendió mi negocio ayer']) assert.ok(unavailableDataReply([{role:'user',text}]),text);
  for(const text of ['Explica la fotosíntesis','Cómo puedo organizar mi día hoy','Por qué una tienda necesita un catálogo']) assert.equal(unavailableDataReply([{role:'user',text}]),null,text);
  assert.equal(unavailableDataReply([{role:'user',text:'Ayer vendí 15 unidades a 2 soles'},{role:'assistant',text:'Entendido'},{role:'user',text:'Cuánto vendí ayer'}]),null);
});
