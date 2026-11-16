import { normalizeText } from './text';
import type { EngineResult, SimpleTurn } from './engine';
import { conversationFacts, introducedName } from '../conversation-context';

export function contextualReply(turns: SimpleTurn[]): EngineResult | null {
  const latest = turns.at(-1)?.text || '';
  const norm = normalizeText(latest);
  if (/^(quien eres|como te llamas|que es elara|eres un modelo local|usas un modelo local|funcionas en mi laptop)[.? ]*$/.test(norm)) {
    return { reply: 'Soy **Elara**, una asistente para crear prototipos web, revisar fragmentos de código y resolver utilidades. Ahora uso **Elara Core 0.7**, un motor de reglas, plantillas y un pequeño clasificador de intenciones. Funciono en el servidor de Vercel y no necesito que tu portátil esté encendido. Todavía no soy un modelo de lenguaje general ni navego por internet.', intent: 'identity_elara', confidence: 1 };
  }
  if (/\b(como me llamo|recuerdas mi nombre|cual es mi nombre)\b/.test(norm)) {
    const facts=conversationFacts(turns),name = facts.nombre;
    if(/\b(?:que vendo|que vendemos|a que me dedico)\b/.test(norm)) return {reply:`${name?`Te llamas **${name}**.`:'Todavía no conozco tu nombre.'} ${facts.oferta?`Me dijiste que vendes **${facts.oferta}**.`:'Todavía no me has dicho qué vendes.'}`,intent:'context_name_and_offering',confidence:1};
    if(!/^(?:como me llamo|recuerdas mi nombre|cual es mi nombre)[.? ]*$/.test(norm)) return null;
    return { reply: name ? `Me dijiste que te llamas **${name}**.` : 'Todavía no me has dicho tu nombre en esta conversación. ¿Cómo te llamas?', intent: 'context_name', confidence: 1 };
  }
  const projectQuestion = norm.match(/^(?:como se llama|cual es el nombre de|recuerdas el nombre de) (?:mi|nuestr[ao]) (tienda|negocio|proyecto|marca|empresa|app|aplicacion|cafeteria)[.? ]*$/);
  if (projectQuestion) {
    const name = conversationFacts(turns).proyecto;
    return { reply: name ? `Me dijiste que el nombre de tu ${projectQuestion[1]} es **${name}**.` : `Todavía no me has dicho el nombre de tu ${projectQuestion[1]} en este contexto. ¿Cómo se llama?`, intent: 'context_project_name', confidence: 1 };
  }
  const introduced = introducedName(latest);
  if (introduced && /^(?:hola[,!]?\s*)?(?:me llamo|mi nombre es)\b/iu.test(latest.trim()) && !/\b(?:y|pero|quiero|necesito|puedes|explica)\b/.test(norm)) return { reply: `Hola, **${introduced}**. ¿Qué necesitas crear o resolver hoy?`, intent: 'context_introduction', confidence: 1 };
  const percentFollowUp = /^(?:y\s+)?(?:el\s+)?(\d+(?:[.,]\d+)?)\s*(?:por ciento|%)\s*[.?]?$/i;
  const followPercent = latest.trim().match(percentFollowUp);
  if (followPercent) {
    const previous = [...turns].slice(0, -1).reverse().find((t) => t.role === 'user' && !percentFollowUp.test(t.text.trim()));
    const base = previous?.text.match(/(?:%|por ciento)\s*de\s*(-?\d+(?:[.,]\d+)?)/i)?.[1];
    if (base) {
      const amount = Number(base.replace(',', '.')); const pct = Number(followPercent[1].replace(',', '.'));
      if (Number.isFinite(amount * pct)) return { reply: `El **${pct}%** de **${amount}** es **${Number((pct * amount / 100).toFixed(6))}**.`, intent: 'context_percentage', confidence: 1 };
    }
    return { reply: `¿Sobre qué cantidad quieres calcular el ${followPercent[1]}%?`, intent: 'clarify_percentage', confidence: 1 };
  }
  if (/^(que es|explica|explicame) (una? )?(pagina web|sitio web|html)[.? ]*$/.test(norm)) {
    return { reply: 'Una **página web** es un documento que abre el navegador. **HTML** organiza su contenido, **CSS** define el diseño y **JavaScript** añade interacción. Un sitio reúne varias páginas.\n\nPuedo ayudarte a crear un prototipo: dime de qué tratará y qué debe permitir hacer.', intent: 'concept_web', confidence: 1 };
  }
  return null;
}
