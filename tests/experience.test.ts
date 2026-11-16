import assert from 'node:assert/strict';
import test from 'node:test';
import { readAppearance } from '../lib/appearance';
import { deviceScale, PREVIEW_DEVICES } from '../lib/device-preview';
import { avatarStoragePath, publicProfile, NOVVIN_REGISTER_URL } from '../lib/novvin-profile';
import { runElaraCoreEngine as run, type SimpleTurn } from '../lib/elara-engine/engine';
import { COMMERCE_QUESTION } from '../lib/elara-engine/request';
import { buildTrainedIntentNetwork } from '../lib/elara-engine/neural-net';
import { ELARA_INTENTS } from '../lib/elara-engine/dataset';
import { tokenize } from '../lib/elara-engine/text';

const user=(text:string):SimpleTurn=>({role:'user',text});
const assistant=(text:string):SimpleTurn=>({role:'assistant',text});

test('appearance accepts only explicit modes and a boolean contrast preference',()=>{
  assert.deepEqual(readAppearance('{"mode":"dark","contrast":true}'),{mode:'dark',contrast:true});
  assert.deepEqual(readAppearance('{"mode":"light","contrast":false}'),{mode:'light',contrast:false});
  for(const raw of [null,'null','broken','{"mode":"evil","contrast":"true"}']) assert.deepEqual(readAppearance(raw),{mode:'system',contrast:false});
});
test('device fitting scales the shell while keeping actual viewport dimensions',()=>{
  assert.deepEqual(PREVIEW_DEVICES.mobile,{name:'Celular',width:390,height:844});
  assert.equal(PREVIEW_DEVICES.desktop.width,1280);
  const scale=deviceScale(1304,862,640,700);
  assert.ok(scale<.5); assert.ok(1304*scale<=608);assert.ok(862*scale<=668);
  assert.equal(deviceScale(414,906,1200,1200),1);
  assert.ok(deviceScale(414,906,0,0)>0);
});
test('profile uses a protected own-avatar endpoint and official identity links',()=>{
  const profile=publicProfile({id:'user-1',email:'qa@example.invalid',displayName:'QA',username:'qa',avatarUrl:'https://legacy.example/storage/v1/object/public/avatars/user-1/photo.png'});
  assert.match(profile.avatarUrl!,/^\/api\/auth\/avatar\?owner=user-1&v=[a-z0-9]+$/);
  assert.equal(profile.email,'qa@example.invalid');assert.equal(profile.novvinProfileUrl,'https://novvinapp.com/u/user-1');
  assert.equal(NOVVIN_REGISTER_URL,'https://novvinapp.com/register');
  assert.equal(publicProfile({id:'user-2'}).avatarUrl,null);
});
test('avatar proxy never accepts arbitrary endpoints, buckets or traversal',()=>{
  for(const raw of ['https://evil.example/admin','data:image/svg+xml,hi','/storage/v1/object/public/private/photo.png','/storage/v1/object/public/avatars/%2e%2e/private.png','https://u:password@evil.example/storage/v1/object/public/avatars/test.png']) assert.equal(avatarStoragePath(raw),null,raw);
  assert.equal(avatarStoragePath('https://old.example/storage/v1/object/sign/avatars/a.png?token=secret'),'/storage/v1/object/public/avatars/a.png');
});
test('ambiguous sale requests ask for a product instead of inventing a store',()=>{
  for(const prompt of ['venta','ventas','Quiero vender','Quiero una tienda']) {
    const result=run([user(prompt)]);assert.equal(result.intent,'clarify_commerce');assert.equal(result.reply,COMMERCE_QUESTION);
  }
});
test('a product answer completes the commerce brief in the current conversation',()=>{
  const result=run([user('Quiero una tienda'),assistant(COMMERCE_QUESTION),user('zapatos en soles, tema claro')]);
  assert.match(result.reply,/```html/);assert.match(result.reply,/S\//);assert.match(result.reply,/#f8fafc/);
});
test('sales singular and plural plus natural creation requests produce prototypes',()=>{
  for(const prompt of ['Venta de carritos en soles, moderna','Una página para la venta de zapatos','Me puedes hacer una tienda para vender juguetes','Una web para vender postres']) assert.match(run([user(prompt)]).reply,/```html/,prompt);
  assert.deepEqual(tokenize('venta de producto'),tokenize('ventas de productos'));
});
test('commerce questions about unknown real data do not invent figures',()=>{
  for(const prompt of ['¿Por qué bajaron mis ventas este mes?','¿Cuánto vendió mi negocio ayer?']){
    const result=run([user(prompt)]);assert.equal(result.intent,'__fallback_honest__');assert.doesNotMatch(result.reply,/```html/);
  }
});
test('a short color follow-up keeps the previous artifact and topic',()=>{
  const q='Crea una web de 6 laptops';const first=run([user(q)]);
  const result=run([user(q),assistant(first.reply),user('y ahora en verde')]);
  assert.equal(result.intent,'code_index_followup');assert.match(result.reply,/#10b981/);assert.match(result.reply,/Laptop/);
});
test('catalog prototypes contain vector product icons and no external icon service',()=>{
  const result=run([user('Crea una tienda de 6 laptops')]);
  assert.match(result.reply,/const ICON_PATHS/);assert.match(result.reply,/createElementNS/);assert.match(result.reply,/"icon":"laptop"/);
});
test('identity questions explain the actual server engine rather than claiming a local LLM',()=>{
  for(const prompt of ['Quién eres','Cómo te llamas','Eres un modelo local']){
    const result=run([user(prompt)]);assert.equal(result.intent,'identity_elara');assert.match(result.reply,/Vercel/);assert.match(result.reply,/Todavía no soy un modelo de lenguaje general/);
  }
});
test('expanded intent classifier recognizes held-out commerce phrases after training',()=>{
  const net=buildTrainedIntentNetwork(ELARA_INTENTS);
  for(const prompt of ['necesito una tienda online de zapatillas','quiero vender mis productos por internet','catalogo de venta con carrito de compras','diseñar una web de comercio electronico']) assert.equal(net.predict(prompt).label,'commerce_create',prompt);
});

test('implicit commerce briefs survive follow-up edits without losing the topic',()=>{
  const q='Venta de carritos en soles, moderna';const a=run([user(q)]);
  const b=run([user(q),assistant(a.reply),user('y ahora en verde')]);
  assert.match(b.reply,/<h1>Carritos<\/h1>/);assert.match(b.reply,/#10b981/);assert.match(b.reply,/S\//);
  assert.doesNotMatch(b.reply,/<h1>Venta de/);
});
