import { normalizeText } from './text';
import type { SimpleTurn } from './engine';

export const COMMERCE_QUESTION = '¿Qué productos o servicios quieres mostrar en la tienda? Puedes decirme el nombre, el color y la moneda; por ejemplo: «venta de zapatos, tema claro y soles». Si te refieres a analizar ventas, comparte los datos que quieres revisar.';

export function commerceRequest(turns: SimpleTurn[]): { kind: 'clarify' } | { kind: 'create'; brief: string } | null {
  const raw = turns.at(-1)?.text.trim() || '';
  const norm = normalizeText(raw);
  if (raw.includes('```')) return null;
  const previousAssistant = [...turns].slice(0, -1).reverse().find((turn) => turn.role === 'assistant');
  if (previousAssistant?.text === COMMERCE_QUESTION && /^[\p{L}\d][\p{L}\d\s,.'"#€$/-]{1,130}$/u.test(raw) && !/\b(que|por que|cuanto|como|olvida|cambiemos|no|hola|gracias)\b/.test(norm)) {
    return { kind: 'create', brief: `Crea un catálogo de ${raw.replace(/^de\s+/i, '')}` };
  }
  if (/^(?:quiero |necesito |deseo |una? |crear |hacer )*(?:ventas?|vender|tienda(?: virtual| online)?)[.! ]*$/.test(norm)) return { kind: 'clarify' };
  if (!/\b(tienda|ventas?|vender|catalogo)\b/.test(norm)) return null;
  const asksCreation = /\b(crea|creame|crear|haz|hazme|hacer|disena|disename|genera|generame|quiero|necesito)\b/.test(norm);
  const nounRequest = /^(?:una? )?(?:web|pagina|tienda|catalogo|ventas?)\b/.test(norm);
  if ((!asksCreation && !nounRequest) || /^(?:como|por que|cuanto|que significa)\b/.test(norm)) return null;
  const match = raw.match(/\b(?:ventas?\s+de|vender|tienda(?:\s+(?:virtual|online))?\s+(?:de|para)|cat[aá]logo\s+de|web\s+de)\s+(.+)/i);
  const subject = match?.[1]?.replace(/^(?:(?:la\s+)?ventas?\s+de|vender)\s+/i, '').trim();
  if (!subject) return asksCreation || nounRequest ? { kind: 'clarify' } : null;
  return { kind: 'create', brief: `Crea un catálogo de ${subject}. ${raw}` };
}

export function shortArtifactEdit(raw: string): string | null {
  const norm = normalizeText(raw);
  if (/^(?:(?:y|ahora|mejor|por favor)\s+)*(?:en\s+)?(?:tema\s+)?(?:azul|verde|rojo|rosa|morado|violeta|naranja|claro|oscuro|soles|euros|dolares|#[0-9a-f]{3,6})[.! ]*$/.test(norm)) return `Cambia a ${raw}`;
  return null;
}
