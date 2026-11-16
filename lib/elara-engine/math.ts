import { normalizeText } from './text';

function numberText(n: number) { return String(Number(n.toFixed(8))); }
function termText(coefficient: number, power: number): string {
  if (power === 0) return numberText(coefficient);
  const prefix = coefficient === 1 ? '' : numberText(coefficient);
  return `${prefix}x${power === 1 ? '' : `^${power}`}`;
}

/** Explicit bounded polynomial grammar. Never evaluates user JavaScript. */
export function polynomialIntegral(raw: string): string | null {
  const normalized = normalizeText(raw);
  if (!/integral|integrar/.test(normalized) && !raw.includes('∫')) return null;
  if (/\b(?:definida|entre|desde|hasta|limites)\b/.test(normalized)) return null;
  let expression = raw.toLowerCase().replace(/²/g, '^2').replace(/³/g, '^3').replace(/−/g, '-');
  const extracted = expression.match(/∫\s*(.+?)\s*d\s*x(?:\b|$)/)?.[1] || expression.match(/integr(?:al(?:\s+indefinida)?|ar)\s*(?:de\s+)?(.+?)(?:\s*d\s*x\b|[?¿]|$)/)?.[1];
  const candidate = extracted?.replace(/[¿?.!]/g, '').trim();
  if (!extracted || !candidate || /^(?:una|la|una integral|puedes|por favor)[. ]*$/.test(candidate)) {
    return 'Sí. Escribe la integral que quieres resolver, por ejemplo `∫ (3x^2 + 2x - 5) dx`. Si es definida, incluye también sus límites.';
  }
  expression = extracted.trim().replace(/[?.!]+$/, '').replace(/^\(([^()]+)\)$/, '$1').replace(/\s+/g, '').replace(/(\d)\*(?=x)/g, '$1');
  if (expression.length > 180 || !/^[+\-\d.x^]+$/.test(expression)) return null;
  const terms = expression.match(/[+-]?[^+-]+/g);
  if (!terms?.length || terms.length > 20 || terms.join('') !== expression) return null;
  const coefficients = new Map<number, number>();
  for (const term of terms) {
    const match = term.match(/^([+-]?)(?:(\d+(?:\.\d+)?)?(x)(?:\^(\d{1,2}))?|(\d+(?:\.\d+)?))$/);
    if (!match) return null;
    const coefficient = (match[1] === '-' ? -1 : 1) * Number(match[3] ? match[2] || 1 : match[5]);
    const power = match[3] ? Number(match[4] || 1) : 0;
    if (power > 12 || !Number.isFinite(coefficient) || Math.abs(coefficient) > 1e8) return null;
    coefficients.set(power, (coefficients.get(power) || 0) + coefficient);
  }
  const ordered = [...coefficients].filter(([, c]) => c !== 0).sort(([a], [b]) => b - a);
  const pieces = ordered.map(([power, coefficient], i) => {
    const magnitude = Math.abs(coefficient); const divisor = power + 1;
    const quotient = magnitude / divisor;
    const value = Number.isInteger(quotient) ? termText(quotient, divisor) : `(${numberText(magnitude)}/${divisor})x${divisor === 1 ? '' : `^${divisor}`}`;
    return `${coefficient < 0 ? (i ? ' - ' : '-') : i ? ' + ' : ''}${value}`;
  });
  const result = pieces.join('') || '0';
  return `La integral indefinida es **\`${result} + C\`**, donde \`C\` es una constante.\n\nApliqué la regla de la potencia a cada término: \`∫ ax^n dx = (a/(n+1))x^(n+1) + C\`. Al derivar el resultado se recupera \`${expression}\`.`;
}
