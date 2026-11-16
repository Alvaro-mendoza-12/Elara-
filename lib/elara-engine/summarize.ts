import type { SimpleTurn } from './engine';
import { normalizeText } from './text';

/** Extract a short answer faithfully; leave long or structured rewriting to the model. */
export function extractiveSummary(turns: SimpleTurn[]): string | null {
  const request = normalizeText(turns.at(-1)?.text || '');
  if (!/^(?:por favor )?(?:resumelo|resumemelo|resume eso|resume lo anterior)(?: en una(?: sola)? frase)?(?: (?:y )?sin lista)?[.! ]*$/.test(request)) return null;
  const source = turns.slice(0, -1).reverse().find(turn => turn.role === 'assistant')?.text.trim();
  if (!source || source.length > 1600 || /```|^\s*(?:[-*#]|\d+\.)\s|\[[^\]]+\]\(/m.test(source)) return null;
  const sentences = source.replace(/\*\*|`/g, '').split(/(?<=[.!?])\s+/u).filter(Boolean);
  if (sentences.length < 2) return null;
  const chosen: string[] = [];
  let words = 0;
  for (const sentence of sentences.slice(0, 2)) {
    const count = sentence.trim().split(/\s+/).length;
    if (words + count > 40) break;
    chosen.push(sentence.replace(/[.!?]+$/, '')); words += count;
  }
  if (!chosen.length) return null;
  return chosen.join('; ') + '.';
}
