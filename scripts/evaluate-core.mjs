import { createRequire } from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {runElaraCoreEngine:run}=require('../.test-dist/lib/elara-engine/engine.js');
const cases=[
 ['Una página para la venta de zapatos','html'],
 ['Quiero una web para ventas de ropa','html'],
 ['Venta de carritos en soles, moderna','html'],
 ['Me puedes hacer una tienda para vender juguetes','html'],
 ['Una web para vender postres','html'],
 ['Crea una web de ventas de laptops','html'],
 ['Ventas','clarify'],
 ['Quiero vender','clarify'],
 ['Quiero una tienda','clarify'],
 ['¿Por qué bajaron mis ventas este mes?','unknown'],
 ['¿Cuánto vendió mi negocio ayer?','unknown'],
 ['Hola, explícame la fotosíntesis','unknown'],
];
const rows=cases.map(([prompt,expected])=>{const r=run([{role:'user',text:prompt}]);const actual=r.reply.includes('```html')?'html':r.intent==='clarify_commerce'?'clarify':r.intent==='__fallback_honest__'?'unknown':'other';return {prompt,expected,actual,pass:actual===expected}});
const result={cases:rows.length,passed:rows.filter(r=>r.pass).length,rows};
if(process.env.ELARA_EVAL_REPORT) fs.writeFileSync(process.env.ELARA_EVAL_REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(rows.some(r=>!r.pass))process.exitCode=1;
