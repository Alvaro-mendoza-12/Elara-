import type { SimpleTurn } from './elara-engine/engine';
import { extractBrandName, normalizeText } from './elara-engine/text';
import { normalizeRequestSpelling } from './elara-engine/request-meaning';

function prose(text: string): string {
  return text.replace(/```[\s\S]*?(?:```|$)/g, '').trim();
}

/** A requested fresh start affects this chat's context, never stored history. */
export function activeConversationTurns(turns: SimpleTurn[]): SimpleTurn[] {
  let start = 0;
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role !== 'user') continue;
    const norm = normalizeText(prose(turns[i].text));
    if (/^(?:(?:bueno|ahora|ok|por favor)\s+)*(?:olvida (?:todo|lo anterior|eso)|empecemos de (?:cero|nuevo)|comencemos de cero|cambiemos de tema|hablemos de otra cosa)\b/.test(norm)) start = i;
  }
  return turns.slice(start);
}

export function introducedName(text: string): string | null {
  const matches = [...prose(text).matchAll(/(?:^|[,.!?;\n]\s*|\b(?:en realidad|perd[oó]n|correcci[oó]n)[,:]?\s+)(?:hola[,!]?\s*)?(?:me llamo|mi nombre es)\s+([\p{L}][\p{L} '’\-]{0,55})/giu)];
  const raw = matches.at(-1)?.[1];
  const name = raw?.split(/\s+(?:y|pero|porque|aunque|tengo|vendo|quiero|prefiero|soy|vivo|necesito)\b/iu)[0].trim();
  return name || null;
}

/** Small, explicit user facts. No assistant guesses, cross-chat data or extra inference. */
export function conversationFacts(turns: SimpleTurn[]): Record<string, string> {
  const facts: Record<string, string> = {};
  for (const turn of activeConversationTurns(turns)) {
    if (turn.role !== 'user') continue;
    if (/^(?:por ejemplo|como ejemplo|supongamos|imagina que|traduce el texto)\b/.test(normalizeText(prose(turn.text)))) continue;
    if (/\b(?:no me llamo|mi nombre no es)\b/.test(normalizeText(prose(turn.text)))) delete facts.nombre;
    const name = introducedName(turn.text);
    if (name) facts.nombre = name;
    for (const sentence of prose(turn.text).split(/(?<=[.!?;])\s+|\n+/u)) {
      if (/[¿?]/.test(sentence)) continue;
      const norm = normalizeText(sentence);
      if (/\b(?:por ejemplo|supongamos que|traduce el texto)\b/.test(norm)) continue;
      const value = sentence.trim().slice(0, 190);
      if (/\b(?:(?:mi|nuestr[ao]|la) (?:tienda|negocio|proyecto|marca|empresa|app|aplicacion|cafeteria))\b.*\b(?:se llama|se llamara|nombre es)\b/.test(norm)) {
        const names = [...sentence.matchAll(/\b(?:se llama|se llamar[aá]|nombre es)\s+["“]?([^,.!?;\n"”]{1,100})/giu)].filter(match => !/\bno\s*$/iu.test(sentence.slice(0, match.index)));
        const name = names.at(-1)?.[1]?.split(/\s+(?:y|pero|para|vende|vendemos|ofrece|ofrecemos)\b/iu)[0].trim();
        if (name) facts.proyecto = name.slice(0, 60);
        else if (/\bno se llama\b/.test(norm)) delete facts.proyecto;
      } else if (/\b(?:crea|creame|crear|haz|hazme|genera|generame|disena)\b.*\b(?:tienda|negocio|proyecto|marca|empresa|app|aplicacion|cafeteria|web|pagina|sitio)\b/.test(norm) && /\b(?:llamad[ao]|nombre|marca)\b/.test(norm)) {
        const brand = extractBrandName(sentence);
        if (brand) facts.proyecto = brand;
      }
      if (/\b(?:vendo|vendemos|ofrecemos|mi tienda vende|mi negocio vende)\b/.test(norm) && !/\bno (?:vendo|vendemos|ofrecemos)\b/.test(norm)) {
        const offering = sentence.match(/\b(?:vendo|vendemos|ofrecemos|mi tienda vende|mi negocio vende)\s+([^.!?;\n]{1,140})/iu)?.[1]?.trim();
        if (offering) facts.oferta = offering;
      }
      if (/\b(?:publico objetivo|mis clientes son|nuestros clientes son|esta dirigido a|esta dirigida a)\b/.test(norm)) facts.publico = value;
      if (/^(?:prefiero (?:respuestas|que respondas)|responde(?:me)? (?:en|con)|quiero que (?:respondas|me respondas))\b/.test(norm)) facts.preferencia = value;
    }
  }
  return facts;
}

export function isConversationFollowUp(text: string): boolean {
  const norm = normalizeText(normalizeRequestSpelling(text));
  return /^(?:(?:y|ahora|por favor)\s+)*(?:resum(?:e|elo|emelo|eme eso)|sintetiza(?:lo)?|hazl[oa]s? mas (?:breves?|cort[oa]s?|sencill[oa]s?|clar[oa]s?|simples?|detallad[oa]s?)|explica(?:lo|melo)(?:\b|$)|explica(?:me)? (?:eso|lo anterior)|(?:dame|ponme|pon) (?:otro |un )?ejemplo|continua(?: con eso)?|sigue con eso|traducelo|en (?:ingles|espanol|portugues|frances)|(?:dilo|escribelo) (?:en|con|mas)|por que(?: eso)?$)/.test(norm);
}

export function isRewriteRequest(text:string):boolean {
  const norm=normalizeText(normalizeRequestSpelling(text)).replace(/^(?:(?:y|ahora|por favor)\s+)*/,'');
  return isConversationFollowUp(text) && !/^(?:por que|dame|ponme|pon|continua|sigue)\b/.test(norm);
}
