import assert from 'node:assert/strict';
const base=process.env.ELARA_UPSTREAM_URL?.trim().replace(/\/+$/,'');
const key=process.env.ELARA_UPSTREAM_API_KEY?.trim();
assert.ok(base&&key,'Provide the existing private runtime environment.');
const account='elara-resource-check-'+Date.now();
const headers={'Content-Type':'application/json',Authorization:'Bearer '+key,'X-Elara-Account':account};
const body=JSON.stringify({model:'elara-conversacion-v1',messages:[{role:'system',content:'Responde en español en un máximo de 40 palabras.'},{role:'user',content:'Explica por qué conviene comprobar la información generada por una IA.'}],max_tokens:96});
assert.equal((await fetch(base+'/models')).status,401,'Public runtime must reject anonymous callers');
const started=Date.now();const generation=fetch(base+'/chat/completions',{method:'POST',headers,body,signal:AbortSignal.timeout(55000)});
let status;
for(let i=0;i<15;i++){status=await(await fetch(base+'/models',{headers})).json();if(status.busy)break;await new Promise(resolve=>setTimeout(resolve,100));}
assert.equal(status.busy,true,'One generation must reserve the runtime');
const second=await fetch(base+'/chat/completions',{method:'POST',headers,body});assert.equal(second.status,429,'Additional generation must be rejected with backpressure');assert.equal(second.headers.get('retry-after'),'8');
const response=await generation;assert.equal(response.status,200);const streamed=await response.text();assert.match(streamed,/choices/);
const speech=await(await fetch(base+'/audio/status',{headers})).json();assert.equal(speech.ready,true);assert.equal(speech.busy,false);
// Invalid model selections never run inference, but still test the account
// quota. A distinct synthetic account avoids consuming a real user's budget.
const quotaHeaders={...headers,'X-Elara-Account':'elara-quota-check-'+Date.now()};
for(let i=0;i<6;i++)assert.equal((await fetch(base+'/chat/completions',{method:'POST',headers:quotaHeaders,body:JSON.stringify({model:'invalid-test-only',messages:[]})})).status,400);
const limited=await fetch(base+'/chat/completions',{method:'POST',headers:quotaHeaders,body:JSON.stringify({model:'invalid-test-only',messages:[]})});
assert.equal(limited.status,429);assert.equal((await limited.json()).error.code,'RATE_LIMITED');assert.ok(Number(limited.headers.get('retry-after'))>=1&&Number(limited.headers.get('retry-after'))<=60);
console.log(JSON.stringify({publicAnonymous:401,oneActiveGeneration:true,secondRequest:429,retryAfter:8,quotaRequestsWithoutInference:7,quotaCode:'RATE_LIMITED',speechReady:true,elapsedMs:Date.now()-started}));
