import assert from 'node:assert/strict';
import test from 'node:test';
import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
import {createUIMessageStreamResponse,streamText,toUIMessageStream} from 'ai';
import {boundedModelContext} from '../lib/models';
import {runElaraCoreEngine as run,type SimpleTurn} from '../lib/elara-engine/engine';
import {groundedKnowledge} from '../lib/grounded-knowledge';
import {conversationErrorMessage,conversationFailureKind} from '../lib/chat-reliability';
const user=(text:string):SimpleTurn=>({role:'user',text});
const assistant=(text:string):SimpleTurn=>({role:'assistant',text});
const old=[user('Me llamo Elena. Mi tienda se llama Faro. Vendemos plantas.'),assistant('Borrador antiguo sobre la tienda. '.repeat(200)),user('Revisemos un documento largo'),assistant('Un documento largo requiere ordenar varios apartados. '.repeat(150))];

test('the reported short joke request does not inherit thousands of unrelated characters',()=>{
 const request='me puedes contar un chiste';
 const history=[...old,user(request)],before=JSON.stringify(history);
 assert.deepEqual(boundedModelContext(history),[{role:'user',content:request}]);
 assert.equal(JSON.stringify(history),before,'Selection cannot erase stored history');
 assert.match(run([...history,assistant('Un chiste.'),user('Cómo me llamo')]).reply,/Elena/);
});

test('creative references keep the immediate topic while independent new topics omit the old drafts',()=>{
 const root=user('Cuéntame un chiste de robots.');
 const source=assistant('¿Por qué el robot llevaba paraguas? Por la nube de datos.');
 const context=boundedModelContext([...old,root,source,user('Cuéntame otro chiste de ese mismo tema.')])!;
 assert.match(JSON.stringify(context),/robots|robot/);assert.doesNotMatch(JSON.stringify(context),/Faro|Borrador|documento largo/);
 assert.equal(context.at(-1)?.content,'Cuéntame otro chiste de ese mismo tema.');
 assert.equal(context[0].role,'user');
 assert.deepEqual(boundedModelContext([...old,user('Escribe un poema sobre el mar')]),[{role:'user',content:'Escribe un poema sobre el mar'}]);
});

test('a personalized creative request retains the user facts it explicitly refers to',()=>{
 const context=boundedModelContext([...old,user('Cuéntame un chiste sobre mi tienda')])!;
 assert.match(JSON.stringify(context),/Faro/);assert.match(JSON.stringify(context),/plantas/);
 assert.doesNotMatch(JSON.stringify(context),/Borrador|documento largo/);
});

test('educational notes cannot turn a joke about a known subject into a science lecture',()=>{
 for(const text of ['Cuéntame un chiste sobre el cielo azul','Dame una adivinanza sobre un barco','Escribe una broma sobre átomos'])assert.deepEqual(groundedKnowledge([user(text)]).sources,[]);
});

test('timeout, concurrency and account quota errors remain distinct without exposing provider content',()=>{
 const limited={statusCode:429,responseBody:JSON.stringify({error:{code:'RATE_LIMITED',message:'PRIVATE_TEST_ONLY'}})};
 assert.equal(conversationFailureKind(limited),'rate-limit');
 assert.match(conversationErrorMessage(limited),/límite temporal/);
 assert.doesNotMatch(conversationErrorMessage(limited),/otra consulta|PRIVATE_TEST_ONLY/);
 assert.equal(conversationFailureKind({statusCode:429}),'busy');
 assert.equal(conversationFailureKind({cause:{name:'TimeoutError'}}),'timeout');
 assert.equal(conversationFailureKind({statusCode:503}),'unavailable');
 assert.equal(conversationFailureKind(new Error('PRIVATE_TEST_ONLY')),'failed');
});

test('the actual SDK reports a quota failure through sanitized observers instead of default exception logging',async t=>{
 const consoleErrors:unknown[]=[];
 t.mock.method(console,'error',(...values:unknown[])=>{consoleErrors.push(values);});
 const events:string[]=[];
 const provider=createOpenAICompatible({name:'test',baseURL:'https://provider.example/v1',apiKey:'TEST_ONLY_SECRET',fetch:async()=>new Response(JSON.stringify({error:{message:'PRIVATE_TEST_ONLY',code:'RATE_LIMITED',type:'elara_runtime'}}),{status:429,headers:{'Content-Type':'application/json'}})});
 const result=streamText({model:provider.chatModel('test-only'),instructions:'Private test instruction.',messages:[{role:'user',content:'PRIVATE_USER_TEXT'}],maxRetries:0,streamRetries:0,onError:({error})=>{events.push(conversationFailureKind(error));}});
 const raw=await createUIMessageStreamResponse({stream:toUIMessageStream({stream:result.stream,sendReasoning:false,onError:conversationErrorMessage})}).text();
 assert.ok(events.includes('rate-limit'));assert.match(raw,/límite temporal/);
 assert.doesNotMatch(raw,/TEST_ONLY_SECRET|PRIVATE_TEST_ONLY|PRIVATE_USER_TEXT/);
 assert.deepEqual(consoleErrors,[]);
});
