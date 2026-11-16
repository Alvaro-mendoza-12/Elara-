import http from 'node:http';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { once } from 'node:events';
import os from 'node:os';

const secret=fs.readFileSync('/run/secrets/api-key','utf8').trim();
const upstream=process.env.MODEL_URL || 'http://elara-model:8080';
const speechUpstream=process.env.SPEECH_URL || 'http://elara-speech:8081';
let active=false; const buckets=new Map();
function reply(res,status,message){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':'8'}:{})});res.end(JSON.stringify({error:{message,type:'elara_runtime',code:status===429?'MODEL_BUSY':'MODEL_UNAVAILABLE'}}));}
function resourceReady(){const text=fs.readFileSync('/proc/meminfo','utf8');const available=Number(text.match(/MemAvailable:\s+(\d+)/)?.[1]||0);return available>2500*1024 && os.loadavg()[0]<6;}
function allowed(header){const received=Buffer.from(String(header||'').replace(/^Bearer /,'')),expected=Buffer.from(secret);return received.length===expected.length&&timingSafeEqual(received,expected);}
async function isReady(){try{const response=await fetch(upstream+'/health',{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(1500)});return response.ok;}catch{return false}}
async function speechReady(){try{return (await fetch(speechUpstream+'/health',{signal:AbortSignal.timeout(1500)})).ok}catch{return false}}
http.createServer(async(req,res)=>{
 if(!allowed(req.headers.authorization))return reply(res,401,'Autenticación requerida.');
 const path=(req.url||'').replace(/^\/elara-inference(?=\/|$)/,'');
 if(req.method==='GET'&&path==='/v1/models'){
  const ready=resourceReady()&&await isReady();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({object:'list',data:ready?[{id:'elara-conversacion-v1',object:'model',owned_by:'elara',base_model:'Qwen3.5-2B',busy:active}]:[],ready,busy:active}));
 }
 if(req.method==='GET'&&path==='/v1/audio/status'){
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ready:resourceReady()&&await speechReady(),busy:active}));
 }
 const isSpeech=path==='/v1/audio/transcriptions';
 if(req.method!=='POST'||(!isSpeech&&path!=='/v1/chat/completions'))return reply(res,404,'Ruta no disponible.');
 if(active)return reply(res,429,'El modelo está atendiendo otra solicitud. Prueba Core o espera unos segundos.');
 if(!resourceReady())return reply(res,503,'El servidor reserva recursos para Novvin. Usa Core e inténtalo después.');
 active=true;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),48000);
 res.on('close',()=>{if(!res.writableEnded)controller.abort()});req.on('aborted',()=>controller.abort());
 try{
  const account=String(req.headers['x-elara-account']||'').slice(0,100);if(!/^[a-z0-9-]{12,100}$/i.test(account)){return reply(res,403,'Cuenta de Elara requerida.');}
  const now=Date.now();for(const [key,value]of buckets)if(value.until<now)buckets.delete(key);
  const bucket=buckets.get(account)||{count:0,until:now+60000};if(bucket.count>=6)return reply(res,429,'Espera un momento antes de volver a consultar el modelo.');bucket.count++;buckets.set(account,bucket);
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>(isSpeech?2000000:100000))return reply(res,413,isSpeech?'Graba como máximo 30 segundos.':'Reduce la conversación.');chunks.push(chunk)}
  if(isSpeech){
   const type=String(req.headers['content-type']||'').split(';')[0];
   if(!/^audio\/(webm|ogg|wav|x-wav|mp4|mpeg)$/.test(type)||size<100)return reply(res,400,'Envía una grabación de audio válida.');
   const form=new FormData();const extension={'audio/mp4':'mp4','audio/webm':'webm','audio/ogg':'ogg','audio/mpeg':'mp3'}[type]||'wav';
   form.append('file',new Blob(chunks,{type}),'dictado.'+extension);form.append('response_format','json');form.append('language','es');form.append('temperature','0');
   const response=await fetch(speechUpstream+'/inference',{method:'POST',body:form,signal:controller.signal});
   if(!response.ok)return reply(res,503,'No se pudo transcribir el audio. Inténtalo otra vez.');
   const data=await response.json();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({text:typeof data.text==='string'?data.text.trim().slice(0,6000):''}));
  }
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return reply(res,400,'JSON inválido.')}
  if(body.model!=='elara-conversacion-v1'||!Array.isArray(body.messages)||body.messages.length>24||body.messages.some(m=>!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'))return reply(res,400,'Solicitud no válida.');
  if(body.messages.reduce((n,m)=>n+m.content.length,0)>10000)return reply(res,413,'Contexto demasiado largo para este modelo.');
  const response=await fetch(upstream+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify({model:'elara-conversacion-v1',messages:body.messages,stream:true,max_tokens:Math.min(256,Math.max(32,Number(body.max_tokens)||192)),temperature:.5,top_p:.9,repeat_penalty:1.08,chat_template_kwargs:{enable_thinking:false},reasoning_budget:0}),signal:controller.signal});
  if(!response.ok)return reply(res,response.status===429?429:503,'El modelo no pudo procesar la petición. Usa Core o reintenta.');
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});
  for await(const chunk of response.body){if(controller.signal.aborted)break;if(!res.write(chunk))await once(res,'drain',{signal:controller.signal})}
  res.end();
 }catch{if(!res.headersSent)reply(res,503,'Se agotó el tiempo del modelo. Usa Core o envía una petición más corta.');else res.end()}
 finally{clearTimeout(timer);active=false;}
}).listen(3091,'0.0.0.0',()=>console.log('Elara inference gateway ready'));
