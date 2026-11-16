import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {responseCases} from '../evals/response-cases.mjs';
const require=createRequire(import.meta.url);
const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,'').split('=')));
const moduleRoot=path.resolve(args.modules || '.test-dist');
const {runElaraCoreEngine:run}=require(path.join(moduleRoot,'lib/elara-engine/engine.js'));
const {shouldUseConversationModel,boundedModelContext}=require(path.join(moduleRoot,'lib/models.js'));
const {unavailableDataReply}=require(path.join(moduleRoot,'lib/elara-engine/data-boundaries.js'));
const {readWebSpec}=require(path.join(moduleRoot,'lib/elara-engine/web-spec.js'));
const all=responseCases();
if(all.length!==1200)throw new Error('Expected exactly 1,200 defined cases');
const fingerprints=all.map(sample=>createHash('sha256').update(JSON.stringify(sample.turns)).digest('hex'));
if(new Set(fingerprints).size!==all.length)throw new Error('Duplicate histories in the evaluation catalog');
const selected=all.filter(sample=>!args.split||args.split==='all'||sample.split===args.split);
if(!selected.length)throw new Error('Empty evaluation split');
const results=[];const started=performance.now();
for(const sample of selected){
 const result=run(sample.turns),expect=sample.expect,issues=[];
 const html=result.reply.includes('```html');
 if(expect.html!==undefined&&html!==expect.html)issues.push(expect.html?'missing-html':'unsolicited-html');
 if(expect.intent&&result.intent!==expect.intent)issues.push('intent:'+result.intent);
 if(expect.notIntents?.includes(result.intent))issues.push('inappropriate-intent:'+result.intent);
 if(expect.math&&!result.intent.startsWith('math_'))issues.push('math-not-recognized');
 if(expect.model&&!shouldUseConversationModel('auto',result.intent))issues.push('not-routed-to-model');
 for(const pattern of expect.must||[])if(!new RegExp(pattern,'iu').test(result.reply))issues.push('missing:'+pattern);
 for(const pattern of expect.mustNot||[])if(new RegExp(pattern,'iu').test(result.reply))issues.push('unexpected:'+pattern);
 if(expect.count){const items=result.reply.match(/const ITEMS = (\[[\s\S]*?\]);/);let count;try{count=JSON.parse(items?.[1]).length}catch{}if(count!==expect.count)issues.push('item-count:'+count);}
 if(expect.brand){const code=result.reply.match(/```html\n([\s\S]*?)```/)?.[1]||'';if(readWebSpec(code).brandName!==expect.brand)issues.push('brand-not-preserved');}
 if(expect.exerciseCount&&(result.reply.match(/^\d\. `∫ /gm)||[]).length!==expect.exerciseCount)issues.push('exercise-count');
 if(Object.hasOwn(expect,'boundary')){const boundary=unavailableDataReply(sample.turns);if(expect.boundary===null?boundary!==null:!boundary?.includes('datos privados'))issues.push('data-boundary');}
 if(expect.notRewrite&&boundedModelContext(sample.turns)?.at(-1)?.content!==sample.turns.at(-1).text)issues.push('follow-up-misread-as-rewrite');
 results.push({id:sample.id,category:sample.category,split:sample.split,pass:!issues.length,intent:result.intent,issues,...(issues.length?{turns:sample.turns.map(turn=>({...turn,text:turn.text.slice(0,700)})),reply:result.reply.slice(0,650)}:{})});
}
const categories={};for(const row of results){const group=categories[row.category]||{total:0,passed:0};group.total++;if(row.pass)group.passed++;categories[row.category]=group;}
const report={label:args.label||'current',scope:'routing-tools-and-context; not language-model generations',cases:results.length,passed:results.filter(row=>row.pass).length,elapsedMs:Math.round(performance.now()-started),catalogSha256:createHash('sha256').update(JSON.stringify(all)).digest('hex'),graderSha256:createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),categories,results};
fs.mkdirSync('evals/results',{recursive:true});
const destination=path.join('evals/results',`${report.label}-${args.split||'all'}.json`);fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file:destination,cases:report.cases,passed:report.passed,categories,failures:results.filter(row=>!row.pass&&row.split==='development').slice(0,24).map(({id,issues,turns,reply})=>({id,issues,prompt:turns.at(-1).text,reply:reply.slice(0,130)}))},null,2));
if(report.passed!==report.cases&&!process.argv.includes('--record-only'))process.exitCode=1;
