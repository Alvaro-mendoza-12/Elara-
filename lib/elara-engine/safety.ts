import { normalizeText } from './text';

// An early support gate, not a clinical assessment. Runs before all engines.
const SELF_HARM_PATTERNS = [
  /\b(?:me quiero matar|quiero matarme|me voy a matar|suicidarme|quitarme la vida|terminar con mi vida|acabar con mi vida)\b/,
  /\b(?:no quiero (?:seguir )?vivir|no vale la pena vivir|quiero morir|preferiria (?:estar muerto|morir))\b/,
  /\b(?:hacerme dano|lastimarme|cortarme las venas|pensamientos suicidas)\b/,
  /\bme (?:quiero|voy a|pienso|estoy pensando en) (?:hacer dano|lastimar)\b/,
  /\bestoy (?:haciendome dano|lastimandome)\b/,
  /\b(?:kill myself|want to die|end my life|hurt myself|i am suicidal)\b/,
  /\b(?:mi amigo|mi amiga|mi hermano|mi hermana|mi hijo|mi hija|mi pareja)\b.{0,60}\b(?:suicidarse|matarse|quiere morir|no quiere vivir|hacerse dano)\b/,
  /\b(?:dosis (?:letal|mortal)|cuantas pastillas.{0,40}(?:morir|matar)|como (?:puedo )?(?:matarme|suicidarme)|metodo (?:indoloro|para suicidarme))\b/,
];
const CRISIS_CONTINUATION = /\b(?:estoy sol[oa]|no tengo (?:a )?nadie|tengo (?:un cuchillo|las pastillas|un arma)|ya (?:me corte|tome las pastillas)|no puedo (?:mas|seguir)|nadie me quiere|lo voy a hacer|esta noche|ahora mismo|no estoy a salvo)\b/;
const TEST_CONTEXT = /\b(?:era (?:solo )?(?:un ejemplo|una prueba)|estoy probando|prueba de seguridad|solo (?:estoy )?probando|es hipotetico)\b/;

export function detectCrisisHelpResponse(rawText: string, previousUserTexts: string[] = []): string | null {
  const norm = normalizeText(rawText);
  const direct = SELF_HARM_PATTERNS.some((pattern) => pattern.test(norm));
  const recent = previousUserTexts.slice(-3);
  let lastTest = -1;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const normalized = normalizeText(recent[i]);
    if (TEST_CONTEXT.test(normalized) && !SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalized))) {
      lastTest = i;
      break;
    }
  }
  const recentRisk = recent.slice(lastTest + 1).some((text) => SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalizeText(text))));
  if (TEST_CONTEXT.test(norm) && !direct) return null;
  if (!direct && !(recentRisk && CRISIS_CONTINUATION.test(norm))) return null;
  const thirdPerson = /\b(?:mi amigo|mi amiga|mi hermano|mi hermana|mi hijo|mi hija|mi pareja)\b/.test(norm);
  const opening = TEST_CONTEXT.test(norm)
    ? 'Gracias por aclarar que es una prueba. Ante una situación real, mi prioridad es ayudar a contactar con una persona y con apoyo profesional.'
    : thirdPerson
      ? 'Es importante tomar en serio lo que te ha dicho. Si puedes hacerlo sin ponerte en riesgo, acompáñale y busca ayuda de una persona de confianza o de un profesional ahora.'
      : 'Siento que estés pasando por algo tan difícil. Gracias por decirlo. No tienes que afrontarlo a solas: intenta contactar ahora con alguien de confianza y quédate acompañado.';
  return `${opening}

Si hay peligro inmediato o alguien ya se ha hecho daño, contacta con los servicios de emergencia de tu país o acude a urgencias. Aléjate de los objetos o sustancias con los que podrías hacerte daño; si es posible, pide a otra persona que los guarde.

**Si estás en Perú:** puedes llamar a **Línea 113 Salud**, un servicio gratuito del Minsa que ofrece orientación y apoyo en salud mental, disponible las 24 horas: [113](tel:+51113?oai_link_source=model_response_hotline). Información oficial: [https://www.gob.pe/555](https://www.gob.pe/555?oai_link_source=model_response_hotline).

${thirdPerson ? '¿Esa persona está en peligro ahora y puedes acompañarla?' : '¿Estás a salvo ahora mismo? ¿Hay alguien con quien puedas estar?'} ¿En qué país estás para buscar el recurso adecuado?`;
}
