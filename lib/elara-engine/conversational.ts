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

function randomHexBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function generateStrongPassword(length: number): string {
  const safeLen = Math.min(32, Math.max(8, length));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_';
  const bytes = randomHexBytes(safeLen);
  let out = '';
  for (let i = 0; i < safeLen; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function tryConvertUnits(raw: string, norm: string): { reply: string; intent: string } | null {
  const m = norm.match(
    /(?:convierte|convertir|cuanto(?:s)?\s+(?:es|son)|pasa(?:r)?|transforma)?\s*(-?\d+(?:\.\d+)?)\s*(km|kilometros?|mi|millas?|m\b|metros?|pies?|ft\b|kg|kilogramos?|kilos?|lb|libras?|gb|gigabytes?|mb|megabytes?|kb|kilobytes?|horas?|h\b|minutos?|min|°?\s*c\b|celsius|centigrados|°?\s*f\b|fahrenheit)\s+(?:a|en)\s+(km|kilometros?|mi|millas?|m\b|metros?|pies?|ft\b|kg|kilogramos?|kilos?|lb|libras?|gb|gigabytes?|mb|megabytes?|kb|kilobytes?|horas?|h\b|minutos?|min|°?\s*c\b|celsius|centigrados|°?\s*f\b|fahrenheit)\b/,
  );
  if (!m) return null;
  const val = Number(m[1]);
  if (!Number.isFinite(val)) return null;

  const canonical = (u: string): string => {
    const x = u.replace(/°|\s+/g, '');
    if (x === 'km' || x.startsWith('kilometro')) return 'km';
    if (x === 'mi' || x.startsWith('milla')) return 'mi';
    if (x === 'm' || x.startsWith('metro')) return 'm';
    if (x === 'ft' || x.startsWith('pie')) return 'ft';
    if (x === 'kg' || x.startsWith('kilo')) return 'kg';
    if (x === 'lb' || x.startsWith('libra')) return 'lb';
    if (x === 'gb' || x.startsWith('giga')) return 'gb';
    if (x === 'mb' || x.startsWith('mega')) return 'mb';
    if (x === 'kb' || x.startsWith('kilobyte')) return 'kb';
    if (x === 'h' || x.startsWith('hora')) return 'h';
    if (x === 'min' || x.startsWith('minuto')) return 'min';
    if (x === 'c' || x.startsWith('celsius') || x.startsWith('centigrado')) return 'c';
    if (x === 'f' || x.startsWith('fahrenheit')) return 'f';
    return x;
  };

  const from = canonical(m[2]);
  const to = canonical(m[3]);
  if (from === to) return null;

  const pair = `${from}->${to}`;
  const factors: Record<string, (v: number) => number> = {
    'km->mi': (v) => v * 0.621371,
    'mi->km': (v) => v * 1.60934,
    'm->ft': (v) => v * 3.28084,
    'ft->m': (v) => v / 3.28084,
    'kg->lb': (v) => v * 2.20462,
    'lb->kg': (v) => v / 2.20462,
    'gb->mb': (v) => v * 1024,
    'mb->gb': (v) => v / 1024,
    'mb->kb': (v) => v * 1024,
    'kb->mb': (v) => v / 1024,
    'h->min': (v) => v * 60,
    'min->h': (v) => v / 60,
    'c->f': (v) => (v * 9) / 5 + 32,
    'f->c': (v) => ((v - 32) * 5) / 9,
  };

  const fn = factors[pair];
  if (!fn) return null;
  const res = Number(fn(val).toFixed(4));
  return {
    reply: `**${val} ${from.toUpperCase()}** equivalen aproximadamente a **${res} ${to.toUpperCase()}**.`,
    intent: 'unit_convert',
  };
}

function tryColorConvert(raw: string): { reply: string; intent: string } | null {
  const hexMatch = raw.match(/#([0-9a-fA-F]{6})\b/);
  if (hexMatch && /\b(rgb|color|hsl|convierte|convertir|pasa)\b/i.test(raw)) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      reply: `Conversión del color **#${hex.toUpperCase()}**:\n\n| Formato | Valor |\n| --- | --- |\n| HEX | \`#${hex.toUpperCase()}\` |\n| RGB | \`rgb(${r}, ${g}, ${b})\` |\n| CSS Alpha 20% | \`rgba(${r}, ${g}, ${b}, 0.2)\` |`,
      intent: 'dev_color_convert',
    };
  }
  const rgbMatch = raw.match(/\brgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i);
  if (rgbMatch) {
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    const [r, g, b] = [clamp(Number(rgbMatch[1])), clamp(Number(rgbMatch[2])), clamp(Number(rgbMatch[3]))];
    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    return {
      reply: `El color \`rgb(${r}, ${g}, ${b})\` equivale a **\`${hex}\`**.`,
      intent: 'dev_color_convert',
    };
  }
  return null;
}

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function tryJsonFormat(raw: string, norm: string): { reply: string; intent: string } | null {
  if (!/\b(formatea|pretty|embellece|ordena|indent)\b/.test(norm) || !/\bjson\b/.test(norm)) return null;
  const startObj = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  const start =
    startObj !== -1 && startArr !== -1
      ? Math.min(startObj, startArr)
      : Math.max(startObj, startArr);
  if (start === -1) return null;
  const candidate = raw.slice(start).replace(/```$/g, '').trim();
  try {
    const parsed = JSON.parse(candidate);
    return {
      reply: `JSON válido y formateado:\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``,
      intent: 'dev_json_format',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de sintaxis JSON';
    return {
      reply: `El JSON enviado tiene un error de sintaxis:\n\n> \`${msg}\``,
      intent: 'dev_json_format',
    };
  }
}

function tryBase64Utility(raw: string, norm: string): { reply: string; intent: string } | null {
  if (!/\bbase64\b/.test(norm)) return null;
  const quoted = raw.match(/["“]([^"”]+)["”]/);
  const trailing = raw.match(/base64\s*(?:de|:)\s*([^\n]+)$/i);
  const payload = (quoted?.[1] ?? trailing?.[1] ?? '').trim();
  if (!payload) return null;

  if (/\bdecodifica|decode\b/.test(norm)) {
    try {
      const decoded = base64ToUtf8(payload);
      return {
        reply: `Texto decodificado desde Base64:\n\n\`\`\`text\n${decoded}\n\`\`\``,
        intent: 'dev_base64',
      };
    } catch {
      return {
        reply: 'No pude decodificar esa cadena Base64 (verifica que no falten caracteres `=`).',
        intent: 'dev_base64',
      };
    }
  }

  return {
    reply: `Resultado en Base64:\n\n\`\`\`text\n${utf8ToBase64(payload)}\n\`\`\``,
    intent: 'dev_base64',
  };
}

function tryTimestampUtility(norm: string): { reply: string; intent: string } | null {
  if (!/\btimestamp\b/.test(norm)) return null;
  const numMatch = norm.match(/\b(\d{10}|\d{13})\b/);
  if (numMatch?.[1]) {
    const rawNum = Number(numMatch[1]);
    const ms = numMatch[1].length === 10 ? rawNum * 1000 : rawNum;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    const lima = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'America/Lima',
    }).format(date);
    return {
      reply: `Conversión de timestamp \`${numMatch[1]}\`:\n\n| Zona | Fecha y hora |\n| --- | --- |\n| UTC (ISO 8601) | \`${date.toISOString()}\` |\n| Lima / Perú | **${lima}** |`,
      intent: 'dev_timestamp',
    };
  }
  const now = Date.now();
  return {
    reply: `Timestamp Unix actual:\n\n- **Segundos:** \`${Math.floor(now / 1000)}\`\n- **Milisegundos:** \`${now}\`\n- **ISO 8601:** \`${new Date(now).toISOString()}\``,
    intent: 'dev_timestamp',
  };
}

export function tryConversationalResponse(raw: string): { reply: string; intent: string } | null {
  const norm = normalizeText(raw);

  const jsonFormatted = tryJsonFormat(raw, norm);
  if (jsonFormatted) return jsonFormatted;

  const b64 = tryBase64Utility(raw, norm);
  if (b64) return b64;

  const ts = tryTimestampUtility(norm);
  if (ts) return ts;

  // Developer utilities: UUID v4, secure password, color hex/rgb
  if (/\b(uuid|guid)\b/.test(norm) && /\b(genera|dame|crea|nuevo)\b/.test(norm)) {
    const countMatch = norm.match(/\b([2-5])\s+(?:uuids?|guids?)/);
    const count = countMatch ? Number(countMatch[1]) : 1;
    const ids = Array.from({ length: count }, () => globalThis.crypto.randomUUID());
    return {
      reply:
        count === 1
          ? `UUID v4 generado:\n\n\`\`\`text\n${ids[0]}\n\`\`\``
          : `Aquí tienes ${count} UUID v4 listos para usar:\n\n\`\`\`text\n${ids.join('\n')}\n\`\`\``,
      intent: 'dev_uuid_gen',
    };
  }

  if (/\b(contrasena|password|clave)\b/.test(norm) && /\b(genera|dame|crea|segura|aleatoria)\b/.test(norm)) {
    const lenMatch = norm.match(/\b(\d{1,2})\s*(?:caracteres|digitos|chars?)?\b/);
    const length = lenMatch ? Number(lenMatch[1]) : 16;
    const passwords = [generateStrongPassword(length), generateStrongPassword(length)];
    return {
      reply: `Opciones de contraseña aleatoria segura:\n\n\`\`\`text\n${passwords.join('\n')}\n\`\`\`\n\n*Generadas con \`crypto.getRandomValues\` sin almacenarse en el servidor.*`,
      intent: 'dev_password_gen',
    };
  }

  const colorConv = tryColorConvert(raw);
  if (colorConv) return colorConv;

  const unitConv = tryConvertUnits(raw, norm);
  if (unitConv) return unitConv;

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
  if (/^(gracias|muchas gracias|excelente|genial|perfecto|buen trabajo|ok gracias)[.! ]*$/.test(norm)) {
    return {
      reply: 'Con gusto. Si quieres ajustar algún código, probar otra web `index.html` o revisar un error, dime y lo hacemos.',
      intent: 'thanks',
    };
  }
  if (/^(como estas|todo bien|que haces|estas ahi|sigues ahi)[.!? ]*$/.test(norm)) {
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
