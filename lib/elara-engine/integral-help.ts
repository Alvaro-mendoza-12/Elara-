import type { EngineResult, SimpleTurn } from './engine';
import { polynomialIntegral } from './math';
import { normalizeText } from './text';

const EXERCISES = ['x^2', '3x^2 + 2x - 5', '4x^3 - 6x + 2', '2x + 7', '5x^4 - x^2 + 3'];
const COUNTS: Record<string, number> = {un:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5};
const HELP = 'Sí. Puedo ayudarte con **integrales**, proponerte ejercicios y desarrollar integrales polinómicas con pasos verificables.\n\nEnvíame el ejercicio, por ejemplo `∫ (3x^2 + 2x - 5) dx`, o pide «dame 3 ejercicios resueltos». Si una expresión supera el cálculo que puedo verificar, te lo indicaré.';
const result = (reply: string, intent = 'math_integral_help'): EngineResult => ({reply,intent,confidence:1});

export function integralHelp(turns: SimpleTurn[]): EngineResult | null {
  const raw = turns.at(-1)?.text.trim() || '';
  if (raw.includes('```')) return null;
  const norm = normalizeText(raw);
  // A website is created only when the current request actually asks for one.
  if (/\b(?:crea|creame|crear|desarrolla|disena|haz|hazme|genera|necesito|quiero)\b.*\b(?:web|pagina|sitio|app|html|index|tienda|catalogo)\b/.test(norm)) return null;
  if (/\b(?:servicios|soluciones|auditorias|mejoras|sistemas|planes) integrales\b/.test(norm) && !/\b(?:matematicas|calculo|ejercicios?|integrar)\b/.test(norm) && !raw.includes('∫')) return null;
  const previous = turns.slice(0,-1).reverse().find(turn=>turn.role==='assistant')?.text || '';
  const continuing = /^(?:Sí\. (?:Puedo ayudarte con \*\*integrales|Escribe la integral)|Ejercicios de integrales|La integral indefinida es)/.test(previous) && !previous.includes('```');
  const mentionsMath = /\bintegrales\b/.test(norm) || raw.includes('∫') || /\b(?:resolver|resuelve|calcula|calcular|desarrollar|ejercicio de|ejercicios de)\b.*\bintegral\b/.test(norm) || /^(?:la )?integral\s+(?:de|indefinida|definida)\b/.test(norm);
  if (!mentionsMath && !continuing) return null;
  if (!mentionsMath && /\b(?:cambiemos|olvida|web|pagina|sitio|app|fotosintesis|tienda)\b/.test(norm)) return null;

  const selection = continuing && norm.match(/^(?:resuelve|desarrolla|explica|haz)(?:me)?\s+(?:el\s+)?(\d{1,2}|primero|segundo|tercero|cuarto|quinto)(?:\s+(?:paso a paso|con pasos))?[.! ]*$/);
  if (selection) {
    const ordinal: Record<string,number> = {primero:1,segundo:2,tercero:3,cuarto:4,quinto:5};
    const index = ordinal[selection[1]] || Number(selection[1]);
    const expression = previous.match(new RegExp('^'+index+'\\. `∫ (.+?) dx`','m'))?.[1];
    return expression ? result(polynomialIntegral('∫ '+expression+' dx paso a paso')!, 'math_integral_exercise') : result('No encuentro ese ejercicio en la lista anterior. Indica un número de la lista o pega la integral.');
  }

  const countMatch = norm.match(/\b(\d{1,3}|un|uno|dos|tres|cuatro|cinco)\s+(?:ejercicios?|ejemplos?|integrales)\b/);
  const asksExercises = /\b(?:dame|darme|ponme|propon|proponme|genera|generame|prepara|quiero|necesito|desarrolla|resuelve|haz|hazme)\b/.test(norm) && /\b(?:ejercicios?|ejemplos?)\b/.test(norm);
  if (asksExercises) {
    const requested = countMatch ? COUNTS[countMatch[1]] || Number(countMatch[1]) : 3;
    if (requested < 1) return result('Elige entre uno y cinco ejercicios para empezar.');
    const count = Math.min(5,requested);
    const solved = /\b(?:resueltos?|respuestas?|soluciones?|desarrolla|resuelve|paso a paso|con pasos)\b/.test(norm);
    const exercises = EXERCISES.slice(0,count).map((expression,index)=>`${index+1}. \`∫ ${expression} dx\`${solved ? '\n\n'+polynomialIntegral('∫ '+expression+' dx paso a paso') : ''}`).join('\n\n');
    return result(`Ejercicios de integrales${requested>5 ? ' · primeros cinco' : ''}${solved ? ' resueltos' : ''}:\n\n${exercises}${solved ? '' : '\n\nDime «resuelve el segundo» o pega el que quieras desarrollar.'}`, 'math_integral_exercises');
  }

  if (mentionsMath && /\b(?:puedes|podrias|sabes|capaz de)\b/.test(norm) && !/[\d∫^²³]/.test(raw) && !/\bintegral\s+de\s+/.test(norm)) return result(HELP);

  const formula = raw.replace(/\s+(?:paso a paso|con (?:todos los )?pasos|por favor)[?.!\s]*$/i,'');
  const solved = polynomialIntegral(formula) || (continuing && /^[\s\d.xX^²³+*()\-]+$/.test(formula) ? polynomialIntegral('Integral de '+formula) : null);
  if (solved) return result(polynomialIntegral(raw) || solved, 'math_polynomial_integral');
  if (/^(?:si|si por favor|ok|de acuerdo)[.! ]*$/.test(norm) && continuing) return result('Envíame la integral que quieres resolver o dime cuántos ejercicios quieres practicar, de uno a cinco.');
  if (/\b(?:sin|sen|cos|tan|log|ln|definida|limites|hasta)\b/.test(norm) || raw.includes('∫') || /\bintegral de\b/.test(norm)) return result('Todavía no puedo verificar esa integral con mi calculador actual. Admite polinomios en `x`, con potencias enteras de 0 a 12 y sin límites de integración. Puedes enviar un polinomio para desarrollarlo paso a paso. No voy a inventar una solución.', 'math_integral_limit');
  if (mentionsMath) return result(HELP);
  return null;
}
