import assert from 'node:assert/strict';
import test from 'node:test';
import { DefaultChatTransport, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from 'ai';
import { Chat } from '@ai-sdk/react';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { runElaraCoreEngine as run, type SimpleTurn } from '../lib/elara-engine/engine';
import { shouldUseConversationModel } from '../lib/models';
import { parseChatInput } from '../lib/chat-input';
import { CHAT_TIMEOUT_MESSAGE, conversationErrorMessage, createChatFetch, incompleteMessage, interruptedReply, isIncompleteMessage, modelResponseStream } from '../lib/chat-reliability';

const user = (text:string):SimpleTurn=>({role:'user',text});
const assistant = (text:string):SimpleTurn=>({role:'assistant',text});

test('the reported capability question answers directly in every mode without an invented website',()=>{
  for (const text of ['puedes desarrollar ejercicios de integrales?','¿Puedes resolver integrales?','Me ayudas con integrales','Sabes desarrollar una integral']) {
    const result=run([user(text)]);
    assert.equal(result.intent,'math_integral_help',text);
    assert.match(result.reply,/Envíame el ejercicio/);
    assert.doesNotMatch(result.reply,/index\.html|Generé|5 ejercicios|```/);
    for(const mode of ['auto','core','conversation'] as const) assert.equal(shouldUseConversationModel(mode,result.intent),false);
  }
});

test('integral help supersedes a previous website topic but actual website requests stay with the builder',()=>{
  const root='Crea una tienda de 6 laptops';
  const html=run([user(root)]).reply;
  assert.equal(run([user(root),assistant(html),user('puedes desarrollar ejercicios de integrales?')]).intent,'math_integral_help');
  assert.match(run([user('Crea una página web con ejercicios de integrales')]).reply,/```html/);
  assert.doesNotMatch(run([user('¿Puedes integrar el inicio de sesión de Novvin?')]).intent,/^math_/);
  assert.doesNotMatch(run([user('Quiero ofrecer servicios integrales de diseño')]).intent,/^math_/);
});

test('practice requests produce the requested bounded count with actual solved expressions',()=>{
  const result=run([user('Dame 3 ejercicios de integrales resueltos paso a paso')]);
  assert.equal(result.intent,'math_integral_exercises');
  assert.equal((result.reply.match(/^\d\. `∫ /gm)||[]).length,3);
  assert.match(result.reply,/\(1\/3\)x\^3 \+ C/);
  assert.match(result.reply,/x\^3 \+ x\^2 - 5x \+ C/);
  assert.match(result.reply,/Por términos/);
  assert.doesNotMatch(result.reply,/```html|index\.html/);
  assert.equal((run([user('Dame 100 ejercicios de integrales')]).reply.match(/^\d\. `∫ /gm)||[]).length,5);
});

test('an exercise reference solves that item and a bare expression follows the integral topic',()=>{
  const list=run([user('Dame tres ejercicios de integrales')]);
  const solved=run([user('Dame tres ejercicios de integrales'),assistant(list.reply),user('Resuelve el segundo paso a paso')]);
  assert.equal(solved.intent,'math_integral_exercise');
  assert.match(solved.reply,/x\^3 \+ x\^2 - 5x \+ C/);
  assert.match(solved.reply,/Por términos/);
  const help=run([user('Puedes desarrollar ejercicios de integrales?')]);
  assert.match(run([user('Puedes desarrollar ejercicios de integrales?'),assistant(help.reply),user('3x^2 + 2x - 5')]).reply,/x\^3 \+ x\^2 - 5x \+ C/);
  assert.doesNotMatch(run([user('Puedes desarrollar ejercicios de integrales?'),assistant(help.reply),user('Qué es una página web')]).intent,/^math_/);
});

test('unsupported expressions are acknowledged without a language-model guess',()=>{
  for(const text of ['integral de sin(x)','∫ x^-1 dx','integral definida de 0 hasta 1','integral de process.exit()']) {
    const result=run([user(text)]);
    assert.equal(result.intent,'math_integral_limit',text);
    assert.match(result.reply,/no puedo verificar/);
    assert.equal(shouldUseConversationModel('conversation',result.intent),false);
  }
});

test('the client deadline also interrupts a response that already sent headers and text',async()=>{
  let aborted=false;
  const slowFetch:typeof fetch=async(_input,init)=>new Response(new ReadableStream<Uint8Array>({start(controller){
    controller.enqueue(new TextEncoder().encode('partial'));
    init!.signal!.addEventListener('abort',()=>{aborted=true;controller.error(init!.signal!.reason);},{once:true});
  }}),{headers:{'Content-Type':'text/event-stream'}});
  const response=await createChatFetch(slowFetch,25)('https://elara.example/api/chat');
  const reader=response.body!.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value),'partial');
  await assert.rejects(reader.read(),error=>error instanceof Error && error.message===CHAT_TIMEOUT_MESSAGE);
  assert.equal(aborted,true);
});

test('the client deadline interrupts header waits but preserves a manual stop',async()=>{
  const waiting:typeof fetch=async(_input,init)=>new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true}));
  await assert.rejects(createChatFetch(waiting,20)('https://elara.example/api/chat'),error=>error instanceof Error&&error.message===CHAT_TIMEOUT_MESSAGE);
  const stop=new AbortController();
  const pending=createChatFetch(waiting,100)('https://elara.example/api/chat',{signal:stop.signal});
  stop.abort(new DOMException('Stopped by user','AbortError'));
  await assert.rejects(pending,error=>error instanceof Error&&error.name==='AbortError');
});

test('finished streams clean up their deadline without a later abort',async()=>{
  let signal:AbortSignal|undefined;
  const completed:typeof fetch=async(_input,init)=>{signal=init!.signal!;return new Response('done')};
  assert.equal(await(await createChatFetch(completed,20)('https://elara.example/api/chat')).text(),'done');
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(signal?.aborted,false);
});

test('failed assistant claims are preserved as incomplete and excluded from subsequent context',()=>{
  const failed=incompleteMessage({id:'failed',role:'assistant',parts:[{type:'text',text:'Generé un index.html completo ['}]} as UIMessage);
  assert.equal(isIncompleteMessage(failed),true);
  const parsed=parseChatInput({messages:[{id:'u1',role:'user',parts:[{type:'text',text:'Puedes desarrollar ejercicios de integrales?'}]},failed,{id:'u2',role:'user',parts:[{type:'text',text:'Dame tres'}]}]})!;
  assert.equal(parsed.length,2);
  assert.doesNotMatch(JSON.stringify(parsed),/Generé|index\.html/);
  assert.equal(isIncompleteMessage({role:'user',metadata:{elaraIncomplete:true}}),false);
  assert.equal(conversationErrorMessage({statusCode:429}),'Conversación está atendiendo otra consulta. Espera unos segundos y vuelve a intentarlo; Core rápido sigue disponible.');
  assert.equal(conversationErrorMessage({cause:{name:'TimeoutError'}}),CHAT_TIMEOUT_MESSAGE);
  assert.doesNotMatch(conversationErrorMessage(new Error('secret-value-provider-key')),/secret-value/);
});

test('the actual chat SDK marks a partial protocol error as incomplete before its next request',async()=>{
  const chunks=[{type:'start',messageId:'failed-sdk'},{type:'start-step'},{type:'text-start',id:'text'},{type:'text-delta',id:'text',delta:'Generé un index.html completo ['},{type:'error',errorText:CHAT_TIMEOUT_MESSAGE}];
  const fetchMock:typeof fetch=async()=>new Response(chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}});
  const client=new Chat({transport:new DefaultChatTransport({fetch:fetchMock}),onError:()=>{},onFinish:outcome=>{
    if(interruptedReply(outcome)) client.messages=client.messages.map(message=>message.id===outcome.message.id?incompleteMessage(message,outcome.isAbort):message);
  }});
  await client.sendMessage({text:'puedes desarrollar ejercicios de integrales?'});
  assert.equal(client.status,'error');
  assert.equal(isIncompleteMessage(client.messages.at(-1)!),true);
  const parsed=parseChatInput({messages:[...client.messages,{id:'next',role:'user',parts:[{type:'text',text:'Puedes resolver integrales?'}]}]})!;
  assert.doesNotMatch(JSON.stringify(parsed),/Generé|index\.html/);
});

test('the actual chat SDK distinguishes a token-limited answer from a completed answer',async()=>{
  for(const reason of ['stop','length']) {
    const chunks=[{type:'start',messageId:'answer-'+reason},{type:'start-step'},{type:'text-start',id:'text'},{type:'text-delta',id:'text',delta:'Respuesta de prueba.'},{type:'text-end',id:'text'},{type:'finish-step'},{type:'finish',finishReason:reason}];
    const fetchMock:typeof fetch=async()=>new Response(chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}});
    const client=new Chat({transport:new DefaultChatTransport({fetch:fetchMock}),onFinish:outcome=>{
      if(interruptedReply(outcome)) client.messages=client.messages.map(message=>message.id===outcome.message.id?incompleteMessage(message):message);
    }});
    await client.sendMessage({text:'Prueba'});
    assert.equal(client.status,'ready');
    assert.equal(isIncompleteMessage(client.messages.at(-1)!),reason==='length');
  }
});

test('the actual model SDK aborts a stalled provider stream and emits a readable timeout',async()=>{
  let aborted=false;
  const providerFetch:typeof fetch=async(_input,init)=>new Response(new ReadableStream<Uint8Array>({start(controller){
    controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{index:0,delta:{role:'assistant',content:'Respuesta parcial'},finish_reason:null}]})+'\n\n'));
    init!.signal!.addEventListener('abort',()=>{aborted=true;controller.error(init!.signal!.reason);},{once:true});
  }}),{headers:{'Content-Type':'text/event-stream'}});
  const provider=createOpenAICompatible({name:'test',baseURL:'https://provider.example/v1',apiKey:'test-only',fetch:providerFetch});
  const result=streamText({model:provider.chatModel('test-only'),messages:[{role:'user',content:'Prueba'}],maxRetries:0,streamRetries:0,timeout:{totalMs:100,chunkMs:20}});
  const raw=await createUIMessageStreamResponse({stream:modelResponseStream(toUIMessageStream({stream:result.stream,sendReasoning:false,onError:conversationErrorMessage}))}).text();
  assert.equal(aborted,true);
  assert.match(raw,/"type":"error"/);
  assert.match(raw,/tiempo de espera/);
});
