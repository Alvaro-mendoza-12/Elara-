import { normalizeText } from './text';
import type { SimpleTurn } from './engine';

/** Explicit capability checks for data this deployment cannot retrieve. */
export function unavailableDataReply(turns: SimpleTurn[]): string | null {
  const latest=normalizeText(turns.at(-1)?.text || '');
  if (/\b(?:ultimas noticias|noticias de hoy|que paso hoy|precio actual|cotizacion actual|clima (?:en|de)|tiempo (?:en|de)|resultados? de hoy|presidente actual|actual presidente|latest news|current (?:price|weather))\b/.test(latest) || /\b(?:quien (?:es|gano)|cuanto (?:cuesta|vale))\b.{0,90}\b(?:hoy|actualmente|ahora mismo)\b/.test(latest)) {
    return 'No tengo acceso a noticias ni datos en tiempo real. No sería fiable inventar una respuesta actual. Consulta una fuente oficial y, si compartes el texto o los datos aquí, puedo ayudarte a interpretarlos.';
  }
  if (/\b(?:cuanto (?:vendio|vendieron|vendi|vendimos|facturo|gano)|cuantas? (?:ventas|visitas|clientes|pedidos) (?:tengo|tuve|hubo))\b/.test(latest)) {
    const supplied=turns.filter(t=>t.role==='user').slice(-5,-1).some(t=>/\d/.test(t.text));
    if (!supplied) return 'No tengo acceso a las ventas, visitas ni datos privados de tu negocio. Comparte las cifras o una tabla del período que quieres revisar y te ayudo a analizarlas.';
  }
  return null;
}
