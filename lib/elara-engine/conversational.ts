import { normalizeText } from './text';

function evaluateSafeArithmetic(exprRaw: string): number | null {
  const clean = exprRaw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');
  if (!/^[0-9+\-*/().]{1,80}$/.test(clean) || !/[+\-*/]/.test(clean)) return null;

  let pos = 0;
  function parseExpr(): number {
    let val = parseTerm();
    while (pos < clean.length && (clean[pos] === '+' || clean[pos] === '-')) {
      const op = clean[pos++];
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }
  function parseTerm(): number {
    let val = parseFactor();
    while (pos < clean.length && (clean[pos] === '*' || clean[pos] === '/')) {
      const op = clean[pos++];
      const right = parseFactor();
      if (op === '/' && right === 0) throw new Error('DIV_ZERO');
      val = op === '*' ? val * right : val / right;
    }
    return val;
  }
  function parseFactor(): number {
    if (clean[pos] === '+') {
      pos += 1;
      return parseFactor();
    }
    if (clean[pos] === '-') {
      pos += 1;
      return -parseFactor();
    }
    if (clean[pos] === '(') {
      pos += 1;
      const inner = parseExpr();
      if (clean[pos] !== ')') throw new Error('PAREN');
      pos += 1;
      return inner;
    }
    const start = pos;
    while (pos < clean.length && /[0-9.]/.test(clean[pos])) pos += 1;
    if (start === pos) throw new Error('TOKEN');
    const num = Number(clean.slice(start, pos));
    if (!Number.isFinite(num)) throw new Error('NAN');
    return num;
  }

  try {
    const result = parseExpr();
    if (pos !== clean.length || !Number.isFinite(result)) return null;
    return Number(result.toFixed(6));
  } catch {
    return null;
  }
}

export function tryConversationalResponse(raw: string): { reply: string; intent: string } | null {
  const norm = normalizeText(raw);

  // Percentage queries: "15% de 800" or "15 por ciento de 800"
  const pctMatch = raw.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(?:%|por\s*ciento)\s*de\s*(\d+(?:[.,]\d+)?)/);
  if (pctMatch) {
    const pct = Number(pctMatch[1].replace(',', '.'));
    const base = Number(pctMatch[2].replace(',', '.'));
    const val = Number(((pct / 100) * base).toFixed(4));
    return {
      reply: `El **${pct}%** de **${base}** es **${val}**.`,
      intent: 'math_percent',
    };
  }

  // Square root: "raiz cuadrada de 144"
  const sqrtMatch = norm.match(/raiz\s*(?:cuadrada\s*)?de\s*(\d+(?:\.\d+)?)/);
  if (sqrtMatch) {
    const n = Number(sqrtMatch[1]);
    return {
      reply: `La raíz cuadrada de **${n}** es **${Number(Math.sqrt(n).toFixed(6))}**.`,
      intent: 'math_sqrt',
    };
  }

  // Direct math expressions
  const mathExprMatch = raw.match(/(?:cu[aá]nto\s+es|calcula|resuelve)?\s*([0-9+\-*/().×÷,\s]{3,60})/i);
  if (mathExprMatch?.[1] && /\d/.test(mathExprMatch[1]) && /[+\-*/×÷]/.test(mathExprMatch[1])) {
    const value = evaluateSafeArithmetic(mathExprMatch[1]);
    if (value !== null) {
      return {
        reply: `El resultado es **${value}**.`,
        intent: 'math_eval',
      };
    }
  }

  // HTTP codes lookup
  const httpCodeMatch = norm.match(/\b(?:error|codigo|status|http)\s*(400|401|403|404|429|500|502|503)\b/);
  if (httpCodeMatch?.[1]) {
    const meanings: Record<string, string> = {
      '400': '**HTTP 400 (Bad Request)**: el servidor rechazó la petición porque el JSON, parámetro o longitud de la solicitud no cumple las reglas esperadas.',
      '401': '**HTTP 401 (Unauthorized)**: falta un token válido o la sesión expiró.',
      '403': '**HTTP 403 (Forbidden)**: estás autenticado pero no tienes permisos sobre ese recurso.',
      '404': '**HTTP 404 (Not Found)**: la ruta o el recurso solicitado no existe.',
      '429': '**HTTP 429 (Too Many Requests)**: se superó el límite de peticiones por minuto.',
      '500': '**HTTP 500 (Internal Server Error)**: ocurrió una excepción no controlada dentro del servidor.',
      '502': '**HTTP 502 (Bad Gateway)**: el proxy recibió una respuesta inválida del servidor interno.',
      '503': '**HTTP 503 (Service Unavailable)**: el servicio o modelo de destino está apagado o saturado.',
    };
    return {
      reply: meanings[httpCodeMatch[1]],
      intent: 'http_status_help',
    };
  }

  // Polite conversational turns
  if (/^(gracias|muchas gracias|excelente|genial|perfecto|buen trabajo|ok gracias)\b/.test(norm)) {
    return {
      reply: 'Con gusto. Si quieres ajustar algún código, probar otra web `index.html` o revisar un error, dime y lo hacemos.',
      intent: 'thanks',
    };
  }
  if (/^(como estas|todo bien|que haces|estas ahi|sigues ahi)\b/.test(norm)) {
    return {
      reply: 'Aquí estoy, lista para ayudarte. ¿Quieres que armemos un `index.html`, revisar un código o resolver alguna duda técnica?',
      intent: 'smalltalk_status',
    };
  }
  if (/\b(fecha de hoy|que dia es|que hora es)\b/.test(norm)) {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Lima',
    }).format(now);
    return {
      reply: `Según el reloj del servidor (hora de Lima/Perú), es **${formatted}**.`,
      intent: 'current_time',
    };
  }

  return null;
}
