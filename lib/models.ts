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
  const selected: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const priorAnswer = active.slice(0, -1).reverse().find(turn => turn.role === 'assistant')?.text;
  let source = priorAnswer?.slice(0, 1600) || '';
  while (JSON.stringify(source).length > 2000) source = source.slice(0, Math.floor(source.length * 0.75));
  const rewrite = latest.text.length <= 2000 && isRewriteRequest(latest.text) && priorAnswer && !/```html\b/i.test(priorAnswer)
    ? `Aplica mi petición al texto anterior. Conserva los datos y lo que no he pedido cambiar; entrega el texto resultante.\nTexto anterior: ${JSON.stringify(source)}${priorAnswer.length > source.length ? '\n[Texto anterior abreviado.]' : ''}\nMi petición: ${latest.text}`
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
  if (rewrite) {
    // A rewrite needs its source and the user's facts, not old unrelated topics.
    return [...(memory ? [{role:'user' as const,content:memory}] : []), {role:'user',content:rewrite}];
  }
  const normalized=normalizeText(latest.text);
  const independentTopic=/^(?:ahora|otra pregunta|cambiando de tema)\b/.test(normalized)&&
    /\b(?:explicame|explica|dime|cual es|que es|por que|hablame)\b/.test(normalized)&&
    !/\b(?:eso|ese|esa|estos|estas|este|esta|anterior|mismo|misma|mi|mis|nuestro|nuestra|tu|tus|su|sus|lo que|texto|documento|codigo|funcion|poema|json|plan)\b/.test(normalized);
  if(independentTopic)return [...(memory?[{role:'user' as const,content:memory}]:[]),{role:'user',content:latest.text}];
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
