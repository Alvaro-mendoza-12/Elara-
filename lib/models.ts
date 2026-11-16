import type { SimpleTurn } from './elara-engine/engine';

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
  if (!['auto', 'core', 'conversation'].includes(String(model)) || !['brief', 'explain'].includes(String(detail))) return null;
  return { model: model as ModelChoice, detail: detail as ResponseDetail };
}

export function shouldUseConversationModel(choice: ModelChoice, intent: string): boolean {
  if (choice === 'core' || intent.startsWith('safety_') || intent.startsWith('math_') || intent.startsWith('code_index') || intent === 'clarify_commerce') return false;
  if (intent === '__fallback_honest__') return true;
  // Keep deterministic calculations, conversions and current-conversation facts.
  return choice === 'conversation' && /^(?:greeting_help|kb_|guide_|concept_)/.test(intent);
}

export function boundedModelContext(turns: SimpleTurn[]): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  const latest = turns.at(-1);
  if (!latest || latest.role !== 'user' || latest.text.length > 6000) return null;
  const selected: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let size = 0;
  for (const turn of turns.slice(-16).reverse()) {
    if (turn.role !== 'user' && turn.role !== 'assistant') continue;
    const content = turn.text.replace(/```html[\s\S]*?```/g, '[Prototipo HTML creado en el visor de Elara.]');
    if (size + content.length > 7500) break;
    selected.unshift({ role: turn.role, content }); size += content.length;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  return selected.length ? selected : null;
}

export function conversationStorageKey(userId: string | null): string {
  return `elara_conversations_v2:${userId ? `account:${userId}` : 'guest'}`;
}
