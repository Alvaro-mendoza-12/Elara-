import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {liveDialogues,validationDialogues,knowledgeDialogues} from '../evals/live-dialogues.mjs';
const require=createRequire(import.meta.url);
const {createChatFetch}=require('../.test-dist/lib/chat-reliability.js');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const base=(process.env.ELARA_TEST_URL || 'https://elara-mu-mauve.vercel.app').replace(/\/+$/,'');
const fixture=JSON.parse(fs.readFileSync(process.env.ELARA_QA_FIXTURE || '.vercel/qa-broad-v07.json','utf8'));
const samples=(args.set==='validation'?validationDialogues:args.set==='knowledge'?knowledgeDialogues:liveDialogues).filter(sample=>!args.only||args.only.split(',').includes(sample.id));
assert.ok(samples.length,'No live dialogues selected');
const label=args.label || 'live';
fs.mkdirSync('evals/results',{recursive:true});
const destination=`evals/results/${label}-live.json`;
const events=`.vercel/${label}-live-events.jsonl`;
const interrupted=new AbortController();process.once('SIGINT',()=>interrupted.abort());
const clientFetch=createChatFetch();
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const catalogSha256=createHash('sha256').update(JSON.stringify(samples)).digest('hex');
const runtimePolicySha256=createHash('sha256').update(fs.readFileSync('deployment/start-runtime.sh','utf8').replace(/\r\n/g,'\n')).digest('hex');
const runtimeSamples=[];
function sampleRuntime(){
 if(!process.env.ELARA_RUNTIME_SSH_TARGET||!process.env.ELARA_RUNTIME_SSH_KEY)return;
 try{
  const output=execFileSync('ssh',['-i',process.env.ELARA_RUNTIME_SSH_KEY,'-o','BatchMode=yes',...(process.env.ELARA_RUNTIME_SSH_ALIAS?['-o','HostKeyAlias='+process.env.ELARA_RUNTIME_SSH_ALIAS]:[]),process.env.ELARA_RUNTIME_SSH_TARGET,'docker exec elara-model cat /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.events'],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']});
  const [used,peak,limit,...events]=output.trim().split(/\r?\n/);
  const counters=Object.fromEntries(events.map(line=>line.split(/\s+/)).map(([key,value])=>[key,Number(value)]));
  assert.ok([used,peak,limit].every(value=>/^\d+$/.test(value)),'Unexpected memory counters');
  runtimeSamples.push({afterRequests:results.length,usedBytes:Number(used),peakBytes:Number(peak),limitBytes:Number(limit),maxEvents:counters.max,oomEvents:counters.oom,oomKills:counters.oom_kill});
 }catch{runtimeSamples.push({afterRequests:results.length,error:'runtime-sampling-failed'});}
}
let cookie='',lastStart=0;const results=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function save(){fs.writeFileSync(destination,JSON.stringify({label,base,sourceCommit,catalogSha256,runtimePolicySha256,runtimeSamples,scope:'actual HTTP conversations; includes Core and model turns',requests:results.length,modelTurns:results.filter(row=>row.engine==='conversation').length,rulePassed:results.filter(row=>row.rulePass).length,manualReview:'required; rule results alone are not semantic quality scores',results},null,2)+'\n');}
function grade(text,turn,html){
 const issues=[];
 if(html||/\b(?:generé|he creado|creé)\b.{0,60}(?:index\.html|archivo|una web)/i.test(text))issues.push('unsolicited-artifact');
 for(const pattern of turn.must||[])if(!new RegExp(pattern,'iu').test(text))issues.push('missing:'+pattern);
 for(const pattern of turn.mustNot||[])if(new RegExp(pattern,'iu').test(text))issues.push('unexpected:'+pattern);
 if(turn.maxWords&&text.trim().split(/\s+/).length>turn.maxWords)issues.push('word-limit');
 if(turn.lines&&text.trim().split(/\n+/).filter(Boolean).length!==turn.lines)issues.push('line-count');
 if(turn.json){try{assert.deepEqual(JSON.parse(text.trim()),turn.json)}catch{issues.push('invalid-json-or-values')}}
 if(turn.exerciseCount&&(text.match(/^\d\. `∫ /gm)||[]).length!==turn.exerciseCount)issues.push('exercise-count');
 return issues;
}
try{
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:fixture.password}),signal:AbortSignal.timeout(20000)});
 assert.equal(login.status,200,'Synthetic Novvin login');
 cookie=login.headers.getSetCookie().find(value=>/^(?:elara-session|__Host-elara-session)=/.test(value)).split(';')[0];
 for(const sample of samples){
  const history=[];let priorError=false;
  for(const [index,turn]of sample.turns.entries()){
   if(interrupted.signal.aborted)break;
   await pause(Math.max(0,lastStart+10500-Date.now()));
   let occupied=0;
   while(occupied<6){
    try{const state=await(await fetch(base+'/api/models',{signal:AbortSignal.timeout(5000)})).json();if(!state.busy)break;}catch{}
    occupied++;await pause(5000);
   }
   history.push({id:crypto.randomUUID(),role:'user',parts:[{type:'text',text:turn.text}]});
   const started=Date.now();lastStart=started;
   let text='',engine=null,status=null,finish=null,firstByteMs=null,error=null;
   try{
    const response=await clientFetch(base+'/api/chat',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({model:'auto',detail:'brief',messages:history}),signal:interrupted.signal});
    status=response.status;engine=response.headers.get('x-elara-engine');
    let raw='';const decoder=new TextDecoder();for await(const chunk of response.body){const piece=decoder.decode(chunk,{stream:true});if(firstByteMs===null&&piece.includes('text-delta'))firstByteMs=Date.now()-started;raw+=piece;}
    for(const line of raw.split('\n'))if(line.startsWith('data: {')){const part=JSON.parse(line.slice(6));if(part.type==='text-delta')text+=part.delta;if(part.type==='finish')finish=part.finishReason;if(part.type==='error')error=part.errorText;}
    if(!response.ok){let detail='';try{detail=JSON.parse(raw).error || ''}catch{}error='HTTP '+response.status+(detail?': '+String(detail).slice(0,140):'');}
    if(finish!=='stop'&&!error)error='incomplete-stream:'+finish;
   }catch(caught){error=caught instanceof Error?caught.message:'request-failed';}
   const issues=error?['transport:'+error]:grade(text,turn,text.includes('```html'));
   const row={dialogue:sample.id,category:sample.category,turn:index+1,prompt:turn.text,rubric:turn.rubric,engine,status,finish,elapsedMs:Date.now()-started,firstByteMs,rulePass:!issues.length,issues,priorError,manual:'pending',text:text.slice(0,6000),truncated:text.length>6000,sha256:createHash('sha256').update(text).digest('hex')};
   results.push(row);if(results.length%5===0)sampleRuntime();save();fs.appendFileSync(events,JSON.stringify({dialogue:row.dialogue,turn:row.turn,engine,elapsedMs:row.elapsedMs,rulePass:row.rulePass,issues})+'\n');
   console.log(JSON.stringify({dialogue:row.dialogue,turn:row.turn,engine,elapsedMs:row.elapsedMs,rulePass:row.rulePass,issues}));
   if(!error)history.push({id:crypto.randomUUID(),role:'assistant',parts:[{type:'text',text}]});
   else priorError=true;
   await pause(5000);
  }
  if(interrupted.signal.aborted)break;
 }
 console.log(JSON.stringify({file:destination,requests:results.length,modelTurns:results.filter(row=>row.engine==='conversation').length,rulePassed:results.filter(row=>row.rulePass).length}));
}finally{
 sampleRuntime();
 save();
 if(cookie)await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:'{}',signal:AbortSignal.timeout(15000)}).catch(()=>{});
}
