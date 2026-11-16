import type { SimpleTurn } from './elara-engine/engine';
import { activeConversationTurns, conversationFacts, isRewriteRequest } from './conversation-context';
import { readWebSpec } from './elara-engine/web-spec';
import { normalizeText } from './elara-engine/text';

export type ModelChoice = 'auto' | 'core' | 'conversation';
export type ResponseDetail = 'brief' | 'explain';
export interface ModelPreferences { model: ModelChoice; detail: ResponseDetail }
export interface ModelAvailability { configured: boolean; ready: boolean; busy: boolean; base: string | null }
export const DEFAULT_MODEL_PREFERENCES: ModelPreferences = { model: 'auto', detail: 'brief' };
export const MODEL_LABELS: Record<ModelChoice, string> = { auto: 'Automático', core: 'Core rápido', conversation: 'Conversación' };

export function parseModelPreferences(body: unknown): ModelPreferences | null {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const model = value.model ?? 'auto'; const detail = value.detail ?? 'brief';
  if (typeof model !== 'string' || typeof detail !== 'string' || !['auto', 'core', 'conversation'].includes(model) || !['brief', 'explain'].includes(detail)) return null;
  return { model: model as ModelChoice, detail: detail as ResponseDetail };
}

export function shouldUseConversationModel(choice: ModelChoice, intent: string): boolean {
  if (choice === 'core' || intent.startsWith('safety_') || intent.startsWith('math_') || intent.startsWith('code_index') || intent.startsWith('clarify_')) return false;
  if (intent === '__fallback_honest__') return true;
  // Keep deterministic calculations, conversions and current-conversation facts.
  return choice === 'conversation' && /^(?:greeting_help|kb_|guide_|concept_)/.test(intent);
}

export function boundedModelContext(turns: SimpleTurn[]): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  const active = activeConversationTurns(turns);
  const latest = active.at(-1);
  if (!latest || latest.role !== 'user' || latest.text.length > 6000) return null;
  const normalized=normalizeText(latest.text);
  const creative=/\b(?:cuenta(?:me|s)?|contar(?:me)?|escribe(?:me)?|dime|dame|redacta|crea)\b/.test(normalized)&&/\b(?:chistes?|bromas?|cuentos?|historias?|poemas?|adivinanzas?)\b/.test(normalized);
  const creativeReference=creative&&/\b(?:otro|otra|otros|otras|mismo|misma|anterior|eso|esa|ese|estos|estas|continua|sigue|basado|basada)\b/.test(normalized);
  const personalCreative=creative&&/\b(?:mi|mis|nuestro|nuestra|nuestros|nuestras)\b/.test(normalized);
  // A complete new creative request supplies its own topic. Old plans, drafts
  // and account facts would add prefill latency and can distract a small model.
  if(creative&&!creativeReference&&!personalCreative)return [{role:'user',content:latest.text}];
  const selected: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const priorAnswer = active.slice(0, -1).reverse().find(turn => turn.role === 'assistant')?.text;
  let source = priorAnswer?.slice(0, 1600) || '';
  while (JSON.stringify(source).length > 2000) source = source.slice(0, Math.floor(source.length * 0.75));
  const rewriteRequest=normalizeText(latest.text);
  const language=rewriteRequest.match(/\b(?:al|en) (ingles|espanol|portugues|frances)\b/)?.[1];
  const languages:Record<string,string>={ingles:'inglés',espanol:'español',portugues:'portugués',frances:'francés'};
  const translation=language&&/^(?:(?:y|ahora|por favor)\s+)*(?:traducelo|en\b)/.test(rewriteRequest);
  const shortening=/\b(?:mas (?:breve|breves|corto|corta|cortos|cortas)|resumelo|resume|sintetiza)\b/.test(rewriteRequest);
  const instruction=translation?`Traduce al ${languages[language]} únicamente el texto indicado. Conserva nombres y cifras. Entrega solo la traducción, sin traducir instrucciones ni añadir comentarios.`:shortening?`Acorta únicamente el texto indicado a un máximo de ${Math.max(8,Math.floor(source.trim().split(/\s+/).length*.6))} palabras. Conserva nombres y cifras; entrega el resultado sin comentarios sobre instrucciones.`:'Aplica mi petición únicamente al texto indicado. Conserva los datos que no he pedido cambiar y entrega el resultado sin comentarios sobre instrucciones.';
  const rewrite = latest.text.length <= 2000 && isRewriteRequest(latest.text) && priorAnswer && !/```html\b/i.test(priorAnswer)
    ? `${instruction}\nTexto indicado: ${JSON.stringify(source)}${priorAnswer.length > source.length ? '\n[Texto abreviado por el límite de contexto.]' : ''}\nMi petición: ${latest.text}`
    : null;
  const facts = conversationFacts(active);
  const compactFacts: Record<string, string> = {};
  for (const key of ['nombre','proyecto','oferta','publico','preferencia']) {
    let value = facts[key];
    if (!value) continue;
    while (value && JSON.stringify({...compactFacts,[key]:value}).length > 850) value = value.slice(0, Math.floor(value.length * 0.75));
    if (value) compactFacts[key] = value;
  }
  const memory = Object.keys(compactFacts).length ? `Datos del usuario en este chat, con sus últimas correcciones:\n${JSON.stringify(compactFacts)}` : '';
  if(creativeReference){
    const previous=active.slice(0,-1);
    const reverseIndex=[...previous].reverse().findIndex(turn=>turn.role==='user');
    const lastUserIndex=reverseIndex<0?-1:previous.length-1-reverseIndex;
    if(lastUserIndex>=0){
      const previousAssistant=previous.slice(lastUserIndex+1).reverse().find(turn=>turn.role==='assistant');
      const recent=[previous[lastUserIndex],...(previousAssistant?[previousAssistant]:[])].map(turn=>({role:turn.role as 'user'|'assistant',content:turn.text.replace(/```html[\s\S]*?(?:```|$)/gi,'[Prototipo web anterior.]').slice(0,turn.role==='user'?1000:800)}));
      return [...(personalCreative&&memory?[{role:'user' as const,content:memory}]:[]),...recent,{role:'user',content:latest.text}];
    }
  }
  if(creative&&!creativeReference&&personalCreative)return [...(memory?[{role:'user' as const,content:memory}]:[]),{role:'user',content:latest.text}];
  if (rewrite) {
    // A rewrite needs its source and the user's facts, not old unrelated topics.
    return [...(memory ? [{role:'user' as const,content:memory}] : []), {role:'user',content:rewrite}];
  }
  const independentTopic=/^(?:ahora|otra pregunta|cambiando de tema)\b/.test(normalized)&&
    /\b(?:explicame|explica|dime|cual es|que es|por que|hablame)\b/.test(normalized)&&
    !/\b(?:eso|ese|esa|estos|estas|este|esta|anterior|mismo|misma|mi|mis|nuestro|nuestra|tu|tus|su|sus|lo que|texto|documento|codigo|funcion|poema|json|plan)\b/.test(normalized);
  if(independentTopic)return [...(memory?[{role:'user' as const,content:memory}]:[]),{role:'user',content:latest.text}];
  // A new short piece for a known business needs its corrected facts, rather
  // than all the earlier drafts. Referential edits still take the path above.
  const freshBusinessText=compactFacts.proyecto&&compactFacts.oferta&&
    /\b(?:escribe|redacta|dame)\s+(?:(?:una?|dos|tres|\d+)\s+)?(?:frase|eslogan|anuncio|ideas?|publicaciones|correo|titulo)\b/.test(normalized)&&
    !/\b(?:anterior|mismo|misma|otro|otra|traducelo|resume|resumelo|conserva|hazlo|hazla|hazlas)\b/.test(normalized);
  if(freshBusinessText)return [{role:'user',content:memory},{role:'user',content:latest.text}];
  const budget = Math.max(3600,latest.text.length+memory.length) - memory.length;
  let size = 0;
  for (const [index, turn] of active.slice(-8).reverse().entries()) {
    if (turn.role !== 'user' && turn.role !== 'assistant') continue;
    let content = turn.text;
    if (index > 0) {
      if (turn.role === 'assistant' && /^(?:ok|vale|anotado|entendido|de acuerdo|gracias|perfecto)[.! ]*$/i.test(content.trim())) continue;
      content = content.replace(/```html\s*([\s\S]*?)```/gi, (_, html: string) => `[Prototipo HTML creado en el visor de Elara. Configuración: ${JSON.stringify(readWebSpec(html))}]`);
      const limit = turn.role === 'assistant' ? 1200 : 1000;
      if (content.length > limit) content = content.slice(0, limit) + '\n[Mensaje anterior abreviado por el límite de contexto.]';
    }
    if (size + content.length > budget) break;
    selected.unshift({ role: turn.role, content }); size += content.length;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  if (!selected.length) return null;
  if (memory) selected.unshift({ role: 'user', content: memory });
  return selected.length ? selected : null;
}

export function conversationStorageKey(userId: string | null): string {
  return `elara_conversations_v2:${userId ? `account:${userId}` : 'guest'}`;
}
