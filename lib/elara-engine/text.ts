export interface PromptParams {
  normalized: string;
  brandName: string | null;
  preferredTheme: 'dark' | 'light';
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
    const word = rawTokens[i];
    tokens.push(word);
    if (i + 1 < rawTokens.length) {
      tokens.push(`${word}_${rawTokens[i + 1]}`);
    }
  }
  return tokens;
}

export function vectorize(tokens: string[], vocabularyIndex: Map<string, number>): number[] {
  const vec = new Array<number>(vocabularyIndex.size).fill(0);
  for (const token of tokens) {
    const idx = vocabularyIndex.get(token);
    if (idx !== undefined) {
      vec[idx] += 1;
    }
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

export function extractBrandName(raw: string): string | null {
  const quoted = raw.match(/["“]([^"”]{2,40})["”]/);
  if (quoted?.[1]) return quoted[1].trim();

  const called = raw.match(
    /(?:llamad[ao]|nombre|titulo|título|para|marca|empresa|tienda|app|web|pagina|página|proyecto)\s+(?:de\s+|la\s+|el\s+|mi\s+)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9_-]{2,28}(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9_-]{2,20})?)/,
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

export function extractPromptParams(raw: string): PromptParams {
  const normalized = normalizeText(raw);
  const preferredTheme: 'dark' | 'light' =
    /\b(clar[ao]|blanc[ao]|light|minimalista blanco)\b/.test(normalized) ? 'light' : 'dark';
  const wantsCodeOnly = /\b(solo\s+(?:el\s+)?codigo|sin\s+explicacion|only\s+code)\b/.test(normalized);
  return {
    normalized,
    brandName: extractBrandName(raw),
    preferredTheme,
    codeBlocks: extractFencedCodeBlocks(raw),
    wantsCodeOnly,
  };
}
