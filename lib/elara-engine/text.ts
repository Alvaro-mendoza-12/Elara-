const SINGULAR_TOKENS: Record<string, string> = { ventas: 'venta', tiendas: 'tienda', catalogos: 'catalogo', paginas: 'pagina', sitios: 'sitio', productos: 'producto' };

export interface PromptParams {
  raw: string;
  normalized: string;
  brandName: string | null;
  requestedCount: number | null;
  topicSubject: string | null;
  preferredTheme: 'dark' | 'light';
  accentColor: string | null;
  currencySymbol: string;
  codeBlocks: Array<{ lang: string; code: string }>;
  wantsCodeOnly: boolean;
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en',
  'con', 'por', 'para', 'sobre', 'que', 'como', 'cual', 'quien', 'cuando', 'donde',
  'y', 'o', 'u', 'pero', 'si', 'no', 'me', 'te', 'se', 'lo', 'le', 'nos', 'mi', 'tu',
  'su', 'es', 'son', 'soy', 'eres', 'esta', 'este', 'esto', 'esa', 'ese', 'eso',
  'the', 'is', 'are', 'a', 'an', 'to', 'of', 'in', 'for', 'on', 'with', 'and', 'or',
]);

export function normalizeText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_+#./:<>{}=()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const clean = normalizeText(input)
    .replace(/[<>{}()=;:"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];

  const rawTokens = clean.split(' ').filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i += 1) {
    const word = SINGULAR_TOKENS[rawTokens[i]] || rawTokens[i];
    tokens.push(word);
    if (i + 1 < rawTokens.length) {
      tokens.push(`${word}_${SINGULAR_TOKENS[rawTokens[i + 1]] || rawTokens[i + 1]}`);
    }
  }
  return tokens;
}

export function vectorize(tokens: string[], vocabularyIndex: Map<string, number>): number[] {
  const vec = new Array<number>(vocabularyIndex.size).fill(0);
  for (const token of tokens) {
    const idx = vocabularyIndex.get(token);
    if (idx !== undefined) vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i += 1) vec[i] /= norm;
  }
  return vec;
}

export function extractFencedCodeBlocks(raw: string): Array<{ lang: string; code: string }> {
  const blocks: Array<{ lang: string; code: string }> = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    blocks.push({
      lang: (match[1] || 'text').toLowerCase(),
      code: match[2].trim(),
    });
  }
  return blocks;
}

export function extractRequestedCount(raw: string): number | null {
  const match = raw.match(/\b(\d{1,2})\s+(?!px\b|em\b|rem\b|ms\b|s\b|%\b)[a-záéíóúñ]{3,}/i);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 2 || parsed > 40) return null;
  return parsed;
}

export function extractTopicSubject(raw: string): string | null {
  const match = raw.match(
    /(?:web|pagina|página|sitio|index(?:\.html)?|tienda|catalogo|catálogo|galeria|galería|landing|app|lista|panel)\s+(?:sobre|acerca de|para|de)\s+(?:\d{1,2}\s+)?([^.,;!?]{3,75})/i,
  );
  if (match?.[1]) {
    return match[1]
      .replace(
        /\b(en\s+html.*|con\s+carrito.*|tema\s+(?:claro|oscuro).*|modo\s+(?:claro|oscuro).*|en\s+color\s+[a-z0-9#]+.*|color\s+[a-z0-9#]+.*|en\s+(?:soles|euros|dolares|dólares).*)$/i,
        '',
      )
      .trim();
  }
  return null;
}

export function extractBrandName(raw: string): string | null {
  const quoted = [...raw.matchAll(/["“]([^"”]{2,40})["”]/g)].at(-1);
  if (quoted?.[1]) return quoted[1].trim();

  const called = raw.match(
    /(?:llamad[ao]|nombre|titulo|título|marca|empresa)\s+(?:de\s+|la\s+|el\s+)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9_-]{2,28}(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9_-]{2,20})?)/,
  );
  if (called?.[1]) {
    const candidate = called[1].trim();
    if (!/^(HTML|CSS|JS|JavaScript|TypeScript|React|Python|SQL|Elara|ChatGPT|Claude|Gemini)$/i.test(candidate)) {
      return candidate;
    }
  }

  if (/\bnovv?in\b/i.test(raw)) return 'Novvin';
  return null;
}

const COLOR_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(morad[oa]|violeta|purpura|púrpura|lila|indigo)\b/, '#a855f7'],
  [/\b(roj[oa]|carmesi|escarlata)\b/, '#f43f5e'],
  [/\b(verde|esmeralda|menta|lima)\b/, '#10b981'],
  [/\b(azul|celeste|cian|cyan|turquesa|sky)\b/, '#38bdf8'],
  [/\b(naranja|ambar|ámbar|coral)\b/, '#f59e0b'],
  [/\b(rosa|rosad[oa]|fucsia|magenta)\b/, '#ec4899'],
  [/\b(dorad[oa]|amarill[oa]|oro)\b/, '#eab308'],
];

export function extractAccentColor(raw: string): string | null {
  const hex = raw.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hex?.[0]) return hex[0];
  const norm = normalizeText(raw);
  for (const [pattern, color] of COLOR_KEYWORDS) {
    if (pattern.test(norm)) return color;
  }
  return null;
}

export function extractCurrencySymbol(raw: string): string {
  const norm = normalizeText(raw);
  if (/\b(soles|sol\s+peruano|pen)\b/.test(norm) || /\bs\/\s*\d?/i.test(raw)) return 'S/';
  if (/\b(euros?|eur)\b/.test(norm) || raw.includes('€')) return '€';
  return '$';
}

export function extractPromptParams(raw: string): PromptParams {
  const normalized = normalizeText(raw);
  const preferredTheme: 'dark' | 'light' =
    /\b(clar[ao]|blanc[ao]|light|dia)\b/.test(normalized) ? 'light' : 'dark';
  const wantsCodeOnly = /\b(solo\s+(?:el\s+)?codigo|sin\s+explicacion|only\s+code)\b/.test(normalized);
  return {
    raw,
    normalized,
    brandName: extractBrandName(raw),
    requestedCount: extractRequestedCount(raw),
    topicSubject: extractTopicSubject(raw),
    preferredTheme,
    accentColor: extractAccentColor(raw),
    currencySymbol: extractCurrencySymbol(raw),
    codeBlocks: extractFencedCodeBlocks(raw),
    wantsCodeOnly,
  };
}
