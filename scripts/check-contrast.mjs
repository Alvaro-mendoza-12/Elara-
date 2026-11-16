import fs from 'node:fs';
import assert from 'node:assert/strict';
const css=fs.readFileSync('app/globals.css','utf8');
function tokens(selector){const start=css.indexOf(selector);assert.ok(start>=0,selector);const body=css.slice(css.indexOf('{',start)+1,css.indexOf('}',start));return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[a-f0-9]{6})/gi)].map(m=>[m[1],m[2]]));}
const light=tokens(':root, :root[data-theme="light"]'), dark=tokens(':root[data-theme="dark"]');
function luminance(hex){return [.2126,.7152,.0722].reduce((sum,w,i)=>{const v=parseInt(hex.slice(i*2+1,i*2+3),16)/255;return sum+w*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)},0)}
function ratio(a,b){const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
let checks=0;
for(const mode of ['light','dark'])for(const contrast of ['normal','high']){
 const palette={...light,...(mode==='dark'?dark:{}),...(contrast==='high'?tokens(`:root[data-contrast="high"][data-theme="${mode}"]`):{})};
 const results=[];
 for(const bg of ['canvas','surface','surface-2'])for(const fg of ['ink','secondary','muted','accent','success','danger','warning']){
  const value=ratio(palette[fg],palette[bg]);assert.ok(value>=4.5,`${mode}/${contrast} ${fg}/${bg} = ${value.toFixed(2)}`);checks++;results.push(value);
 }
 for(const token of Object.keys(palette).filter(key=>key.startsWith('syntax-'))){const value=ratio(palette[token],palette['surface-2']);assert.ok(value>=4.5,`${mode}/${contrast} ${token} = ${value.toFixed(2)}`);checks++;}
 assert.ok(ratio(palette['on-accent'],palette.accent)>=4.5);checks++;
 assert.ok(ratio(palette['control-border'],palette['surface-2'])>=3);checks++;
 console.log(`${mode}/${contrast}: texto >= ${Math.min(...results).toFixed(2)}:1; controles y código aprobados`);
}
console.log(`${checks} comprobaciones de contraste aprobadas.`);

