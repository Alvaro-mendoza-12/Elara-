import { normalizeText } from './text';

const SELF_HARM_PATTERNS = [
  /\bme quiero matar\b/,
  /\bquiero matarme\b/,
  /\bme voy a matar\b/,
  /\bquitarme la vida\b/,
  /\bterminar con mi vida\b/,
  /\bacabar con mi vida\b/,
  /\bsuicidarme\b/,
  /\bpensamientos suicidas\b/,
  /\bno quiero vivir\b/,
  /\bno vale la pena vivir\b/,
  /\bquiero morir\b/,
  /\bhacerme dano\b/,
  /\bcortarme las venas\b/,
  /\bkill myself\b/,
  /\bwant to die\b/,
  /\bsuicide\b/,
];

export function detectCrisisHelpResponse(rawText: string): string | null {
  const norm = normalizeText(rawText);
  if (!norm) return null;
  if (!SELF_HARM_PATTERNS.some((pattern) => pattern.test(norm))) {
    return null;
  }

  return `Siento mucho que estés pasando por un momento así. No tienes que cargarlo solo y hay personas capacitadas listas para escucharte ahora mismo de forma **gratuita y confidencial**:

- **Perú — Línea 113 Salud (Opción 5):** Llama gratis al **113** desde cualquier celular o fijo las 24 horas (también por WhatsApp/Telegram al **955 557 000** o **952 842 623**).
- **Emergencias médicas (Perú):** Llama al **106** (SAMU) o acude al centro de salud u hospital más cercano.
- **Otros países:**
  - **EE. UU. / Canadá:** Llama o envía texto al **988**.
  - **España:** Llama al **024** o al **717 003 717**.
  - **México:** Línea de la Vida **800 911 2000**.
  - **Directorio internacional:** [findahelpline.com](https://findahelpline.com/)

Si puedes, quédate acompañado o habla ahora mismo con un familiar, amigo o profesional de salud.`;
}
