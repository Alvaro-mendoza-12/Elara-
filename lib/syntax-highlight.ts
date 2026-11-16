export type TokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'tag'
  | 'attr'
  | 'comment'
  | 'number'
  | 'operator';

export interface HighlightToken {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case',
  'break', 'continue', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'import',
  'from', 'export', 'default', 'type', 'interface', 'class', 'extends', 'true', 'false', 'null',
  'undefined', 'def', 'print', 'SELECT', 'FROM', 'WHERE', 'CREATE', 'TABLE', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'DELETE', 'JOIN', 'ON', 'ORDER', 'BY', 'LIMIT', 'PRIMARY', 'KEY', 'NOT',
  'NULL', 'INDEX', 'AND', 'OR', 'AS', 'select', 'from', 'where', 'create', 'table', 'join', 'order',
]);

function highlightCodeLine(line: string, lang: string): HighlightToken[] {
  const isHtml = lang === 'html' || lang === 'xml';
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Comments // or # or <!--
    if (
      (line[i] === '/' && line[i + 1] === '/') ||
      (line[i] === '#' && !isHtml && lang !== 'css') ||
      (isHtml && line.startsWith('<!--', i))
    ) {
      tokens.push({ kind: 'comment', text: line.slice(i) });
      break;
    }

    // Strings "...", '...', `...`
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ kind: 'string', text: line.slice(i, j) });
      i = j;
      continue;
    }

    // HTML tags <tag or </tag or /> or >
    if (isHtml && line[i] === '<') {
      const closeMatch = line.slice(i).match(/^<\/?([a-zA-Z0-9:-]+)|^<!DOCTYPE/i);
      if (closeMatch) {
        tokens.push({ kind: 'tag', text: closeMatch[0] });
        i += closeMatch[0].length;
        continue;
      }
    }

    if (isHtml && (line[i] === '>' || (line[i] === '/' && line[i + 1] === '>'))) {
      const tok = line[i] === '/' ? '/>' : '>';
      tokens.push({ kind: 'tag', text: tok });
      i += tok.length;
      continue;
    }

    // Numbers
    const numMatch = line.slice(i).match(/^\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|ms|s)?\b/);
    if (numMatch) {
      tokens.push({ kind: 'number', text: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // Identifiers / keywords / HTML attributes
    const wordMatch = line.slice(i).match(/^[a-zA-Z_$-][a-zA-Z0-9_$-]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const nextChar = line[i + word.length];
      let kind: TokenKind = 'plain';
      if (isHtml && nextChar === '=') {
        kind = 'attr';
      } else if (KEYWORDS.has(word)) {
        kind = 'keyword';
      }
      tokens.push({ kind, text: word });
      i += word.length;
      continue;
    }

    // Operators / punctuation
    const opMatch = line.slice(i).match(/^(?:===|!==|=>|<=|>=|&&|\|\||[=+\-*/{}()[\];:,])/);
    if (opMatch) {
      tokens.push({ kind: 'operator', text: opMatch[0] });
      i += opMatch[0].length;
      continue;
    }

    // Whitespace or fallback character
    const wsMatch = line.slice(i).match(/^\s+/);
    const chunk = wsMatch ? wsMatch[0] : line[i];
    tokens.push({ kind: 'plain', text: chunk });
    i += chunk.length;
  }

  return tokens;
}

export function tokenizeHighlightedLines(code: string, lang: string): HighlightToken[][] {
  return code.split('\n').map((line) => highlightCodeLine(line, lang.toLowerCase()));
}

export function tokenClassName(kind: TokenKind): string {
  switch (kind) {
    case 'keyword':
      return 'text-[#C084FC] font-medium';
    case 'string':
      return 'text-[#6EE7B7]';
    case 'tag':
      return 'text-[#38BDF8]';
    case 'attr':
      return 'text-[#FDBA74]';
    case 'comment':
      return 'text-[#64748B] italic';
    case 'number':
      return 'text-[#FCD34D]';
    case 'operator':
      return 'text-[#93C5FD]';
    default:
      return 'text-[#E2E8F0]';
  }
}
