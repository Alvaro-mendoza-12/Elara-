import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {runElaraCoreEngine as run,type SimpleTurn} from '../lib/elara-engine/engine';
import {addThemeToggle,hasThemeToggle} from '../lib/elara-engine/theme-toggle';
const user=(text:string):SimpleTurn=>({role:'user',text});
const assistant=(text:string):SimpleTurn=>({role:'assistant',text});
const html=(text:string)=>text.match(/```html\n([\s\S]*?)```/)?.[1]||'';
const root='Crea una tienda de 4 plantas llamada Faro';
const request='a esa web que acavas de crear puedes agregarle un boton en la parte superior derecha para cambiar de tema osea tema claro y tema oscuro';

test('the exact screenshot request edits the existing HTML instead of refusing or rebuilding it',()=>{
 const reply=run([user(root)]).reply;
 const original=html(reply).replace('</body>','<div data-custom-content="preserved">Contenido único</div></body>');
 const result=run([user(root),assistant('```html\n'+original+'\n```'),user(request)]);
 assert.equal(result.intent,'code_index_followup');
 const updated=html(result.reply);assert.ok(hasThemeToggle(updated));
 assert.match(updated,/data-custom-content="preserved"/);
 assert.equal(updated.match(/const ITEMS = (\[[\s\S]*?\]);/)?.[1],original.match(/const ITEMS = (\[[\s\S]*?\]);/)?.[1]);
 assert.match(updated,/right:16px/);assert.match(updated,/min-height:44px/);
});

test('an explicit return after an earlier refusal still finds the original artifact',()=>{
 const reply=run([user(root)]).reply;
 const result=run([user(root),assistant(reply),user('No pude añadir el botón'),assistant('No tengo una respuesta fiable.'),user(request)]);
 assert.ok(hasThemeToggle(html(result.reply)));
});

test('the actual generated control toggles both themes even when sandbox storage throws',()=>{
 const output=addThemeToggle(html(run([user(root)]).reply));
 const script=output.match(/<script id="elara-theme-toggle-script">([\s\S]*?)<\/script>/)?.[1];assert.ok(script);
 const rootAttrs:Record<string,string>={},buttonAttrs:Record<string,string>={},handlers:Record<string,()=>void>={};
 const button={textContent:'',setAttribute:(key:string,value:string)=>{buttonAttrs[key]=value;},addEventListener:(key:string,handler:()=>void)=>{handlers[key]=handler;}};
 vm.runInNewContext(script,{document:{getElementById:()=>button,documentElement:{setAttribute:(key:string,value:string)=>{rootAttrs[key]=value;}}},localStorage:{getItem(){throw new Error('Opaque sandbox origin')},setItem(){throw new Error('Opaque sandbox origin')}}},{timeout:100});
 assert.equal(rootAttrs['data-elara-theme'],'dark');assert.match(buttonAttrs['aria-label'],/modo claro/);
 handlers.click();assert.equal(rootAttrs['data-elara-theme'],'light');assert.match(buttonAttrs['aria-label'],/modo oscuro/);
 handlers.click();assert.equal(rootAttrs['data-elara-theme'],'dark');
});

test('the theme control is idempotent and survives a subsequent catalog color edit',()=>{
 const original=html(run([user(root)]).reply),updated=addThemeToggle(original);
 assert.equal(addThemeToggle(updated),updated);
 const next=run([user(root),assistant('```html\n'+updated+'\n```'),user('Cambia el color a verde')]);
 assert.ok(hasThemeToggle(html(next.reply)));assert.match(html(next.reply),/#10b981/);
 assert.equal((html(next.reply).match(/<button[^>]*id="elara-theme-toggle"/g)||[]).length,1);
});

test('a conceptual explanation or a denied request cannot add a control',()=>{
 const first=run([user(root)]).reply;
 assert.doesNotMatch(run([user(root),assistant(first),user('Quiero entender cómo agregar un botón de tema claro y oscuro')]).reply,/```html/);
 assert.doesNotMatch(run([user(root),assistant(first),user('No agregues un botón de tema claro y oscuro')]).reply,/id="elara-theme-toggle"/);
});
