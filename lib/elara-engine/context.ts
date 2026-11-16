import { normalizeText } from './text';
import type { EngineResult, SimpleTurn } from './engine';

export function contextualReply(turns: SimpleTurn[]): EngineResult | null {
  const latest = turns.at(-1)?.text || '';
  const norm = normalizeText(latest);
  if (/\b(como me llamo|recuerdas mi nombre|cual es mi nombre)\b/.test(norm)) {
    const name = [...turns].reverse().filter((t) => t.role === 'user')
      .map((t) => t.text.match(/\b(?:me llamo|mi nombre es)\s+([\p{L}][\p{L} '-]{1,45}?)(?=[,.!?\n]|$)/iu)?.[1]?.trim()).find(Boolean);
    return { reply: name ? `Me dijiste que te llamas **${name}**.` : 'Todavía no me has dicho tu nombre en esta conversación. ¿Cómo te llamas?', intent: 'context_name', confidence: 1 };
  }
  const introduced = latest.match(/^\s*(?:hola[,!]?\s*)?(?:me llamo|mi nombre es)\s+([\p{L}][\p{L} '-]{1,45})[.!]?\s*$/iu)?.[1]?.trim();
  if (introduced) return { reply: `Hola, **${introduced}**. ¿Qué necesitas crear o resolver hoy?`, intent: 'context_introduction', confidence: 1 };
  const followPercent = norm.match(/^(?:y\s+)?(?:el\s+)?(\d+(?:\.\d+)?)\s*(?:por ciento|%)\s*$/);
  if (followPercent) {
    const previous = [...turns].slice(0, -1).reverse().find((t) => t.role === 'user' && /(?:%|por ciento)\s*de\s*\d/.test(t.text));
    const base = previous?.text.match(/(?:%|por ciento)\s*de\s*(\d+(?:[.,]\d+)?)/)?.[1];
    if (base) {
      const amount = Number(base.replace(',', '.')); const pct = Number(followPercent[1]);
      return { reply: `El **${pct}%** de **${amount}** es **${Number((pct * amount / 100).toFixed(6))}**.`, intent: 'context_percentage', confidence: 1 };
    }
  }
  if (/^(que es|explica|explicame) (una? )?(pagina web|sitio web|html)[.? ]*$/.test(norm)) {
    return { reply: 'Una **página web** es un documento que abre el navegador. **HTML** organiza su contenido, **CSS** define el diseño y **JavaScript** añade interacción. Un sitio reúne varias páginas.\n\nPuedo ayudarte a crear un prototipo: dime de qué tratará y qué debe permitir hacer.', intent: 'concept_web', confidence: 1 };
  }
  return null;
}
