import { normalizeText } from './text';

export type RequestMeaning = 'default' | 'explain' | 'write' | 'web-capability';

/** Small routing aliases only. Quoted names, attachments and code are preserved. */
export function normalizeRequestSpelling(raw: string): string {
  if (/\b(?:me llamo|mi nombre es|se llama)\b/i.test(raw)) return raw;
  const aliases:Record<string,string>={integales:'integrales',intengrales:'integrales',integarles:'integrales',ejercisios:'ejercicios',ejercios:'ejercicios',pajina:'página',pagna:'página',resulve:'resuelve',aslo:'hazlo',sensillo:'sencillo',esplicas:'explicas',porke:'por qué'};
  return raw.split(/(```[\s\S]*?(?:```|$)|["“][^"”]*["”])/g).map((part,index)=>index%2?part:part.replace(/\b(?:integales|intengrales|integarles|ejercisios|ejercios|pajina|pagna|resulve|aslo|sensillo|esplicas|porke)\b/gi,word=>aliases[word.toLowerCase()] || word)).join('');
}

/** Distinguish the requested deliverable from incidental words such as “store”. */
export function requestMeaning(raw: string): RequestMeaning {
  const prose=raw.replace(/```[\s\S]*?(?:```|$)/g,'').replace(/["“][^"”]*["”]/g,'');
  const norm=normalizeText(prose).replace(/^hola(?: elara)?\s*/,'');
  if (/\b(?:tus capacidades|que puedes hacer|que sabes hacer)\b/.test(norm) || /^(?:puedes|sabes) (?:crear|hacer|desarrollar) (?:paginas(?: web)?|webs|sitios web)[.? ]*$/.test(norm)) return 'web-capability';
  const target='(?:webs?|paginas?(?: web)?|sitios?(?: web)?|tiendas?|catalogos?|landing|login|dashboard|panel|calculadora|portafolio|portfolio|pomodoro|temporizador|quiz|trivia|paleta|blog|revista|formulario|app)';
  const explicitObject=new RegExp('\\b(?:crea|creame|crear|genera|generame|haz|hazme|construye|arma|disena|disename|quiero|necesito)\\s+(?:(?:un|una|mi|nuestro|nuestra|nuevo|nueva|moderno|moderna|simple|interactivo|interactiva)\\s+){0,3}'+target+'\\b');
  let meaning:RequestMeaning='default';
  for(const clause of norm.split(/[.!?;]\s*|,?\s+pero\s+|,\s*(?=no\b|ahora\b|mejor\b)/)){
    if(!clause.trim())continue;
    if (/^(?:no|nunca|evita|sin)\b/.test(clause.trim())) {meaning='explain';continue;}
    if (/\b(?:quiero|necesito)\s+(?:entender|aprender|saber|comprender|una explicacion|un consejo|consejos|ayuda para entender)\b/.test(clause) || /^(?:explica(?:me|s)?|que es|que significa|que necesito|como |por que |cual es|cuales son|dime como|dame (?:pasos|consejos))\b/.test(clause.trim())) {meaning='explain';continue;}
    const creation=explicitObject.exec(clause);
    const deniedCreation=creation&&/\b(?:sin|evita|no(?:\s+(?:quiero|necesito|debes|vas a))?)\s*$/.test(clause.slice(0,creation.index));
    if(creation&&!deniedCreation){meaning='default';continue;}
    if (/\b(?:ideas|consejos|cuento|poema|eslogan|descripcion|correo|titulo|resumen|traduce|traducelo|traduccion|redacta|reescribe|resume|resumelo)\b/.test(clause) || /\b(?:explica(?:me|s)?|entender|comprender)\b/.test(clause)) meaning='write';
  }
  return meaning;
}
