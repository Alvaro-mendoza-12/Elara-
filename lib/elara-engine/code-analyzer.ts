export interface StaticFinding {
  severity: 'error' | 'warning' | 'tip';
  message: string;
}

export interface CodeInspectionResult {
  detectedKind: 'json' | 'html' | 'js' | 'sql' | 'unknown';
  findings: StaticFinding[];
}

function checkBalancedDelimiters(code: string): StaticFinding[] {
  const findings: StaticFinding[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closing = new Set([')', ']', '}']);
  const stack: Array<{ ch: string; line: number }> = [];

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;
  let line = 1;

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '\n') {
      line += 1;
      escaped = false;
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inSingle || inDouble || inTemplate)) {
      escaped = true;
      continue;
    }
    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      inTemplate = !inTemplate;
      continue;
    }
    if (inSingle || inDouble || inTemplate) continue;

    if (pairs[ch]) {
      stack.push({ ch, line });
    } else if (closing.has(ch)) {
      const top = stack.pop();
      if (!top || pairs[top.ch] !== ch) {
        findings.push({
          severity: 'error',
          message: `Línea ${line}: carácter de cierre '${ch}' sin apertura correspondiente.`,
        });
        break;
      }
    }
  }

  if (inSingle || inDouble || inTemplate) {
    findings.push({
      severity: 'error',
      message: 'Hay una cadena de texto o comilla sin cerrar.',
    });
  }
  if (stack.length > 0) {
    const last = stack[stack.length - 1];
    findings.push({
      severity: 'error',
      message: `Línea ${last.line}: '${last.ch}' quedó abierto sin su cierre '${pairs[last.ch]}'.`,
    });
  }
  return findings;
}

function checkHtmlStructure(code: string): StaticFinding[] {
  const findings: StaticFinding[] = [];
  const voidTags = new Set([
    'meta', 'link', 'img', 'input', 'br', 'hr', 'source', 'track', 'area', 'base', 'col', 'embed', 'param', 'wbr',
  ]);
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\/?>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(code)) !== null) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    if (voidTags.has(tag) || full.endsWith('/>')) continue;

    if (full.startsWith('</')) {
      const top = stack.pop();
      if (top !== tag) {
        findings.push({
          severity: 'error',
          message: top
            ? `Se cerró </${tag}> pero la etiqueta abierta más reciente era <${top}>.`
            : `Etiqueta de cierre </${tag}> sin apertura previa.`,
        });
        break;
      }
    } else {
      stack.push(tag);
    }
  }

  if (stack.length > 0) {
    findings.push({
      severity: 'warning',
      message: `Quedaron etiquetas HTML sin cerrar: ${stack.map((t) => `<${t}>`).join(', ')}.`,
    });
  }
  if (!/<!doctype\s+html>/i.test(code) && /<html/i.test(code)) {
    findings.push({
      severity: 'tip',
      message: 'Agrega `<!DOCTYPE html>` al inicio para asegurar el modo estándar en navegadores.',
    });
  }
  return findings;
}

export function inspectCodeSnippet(lang: string, code: string): CodeInspectionResult {
  const trimmed = code.trim();
  const isJson = lang === 'json' || ((trimmed.startsWith('{') || trimmed.startsWith('[')) && !trimmed.includes('function') && !trimmed.includes('=>'));
  if (isJson) {
    try {
      JSON.parse(trimmed);
      return {
        detectedKind: 'json',
        findings: [{ severity: 'tip', message: 'El JSON es sintácticamente válido según `JSON.parse`.' }],
      };
    } catch (err) {
      return {
        detectedKind: 'json',
        findings: [
          {
            severity: 'error',
            message: `Error de sintaxis JSON: ${err instanceof Error ? err.message : 'formato inválido'}.`,
          },
        ],
      };
    }
  }

  const isHtml = lang === 'html' || /<(?:!doctype|html|head|body|div|section|form|main)\b/i.test(trimmed);
  if (isHtml) {
    return {
      detectedKind: 'html',
      findings: [...checkHtmlStructure(trimmed), ...checkBalancedDelimiters(trimmed)],
    };
  }

  const isSql = lang === 'sql' || /\b(?:select|insert|update|delete|create\s+table)\b/i.test(trimmed);
  if (isSql) {
    const findings = checkBalancedDelimiters(trimmed);
    if (/\b(?:update|delete\s+from)\b/i.test(trimmed) && !/\bwhere\b/i.test(trimmed)) {
      findings.push({
        severity: 'warning',
        message: 'Detectado `UPDATE`/`DELETE` sin cláusula `WHERE`: afectaría todas las filas.',
      });
    }
    return { detectedKind: 'sql', findings };
  }

  const findings = checkBalancedDelimiters(trimmed);
  if (/\binnerHTML\s*=/.test(trimmed)) {
    findings.push({
      severity: 'warning',
      message: 'Uso de `innerHTML = ...`: si el texto viene del usuario puede abrir XSS; prefiere `textContent`.',
    });
  }
  if (/\bvar\s+/.test(trimmed)) {
    findings.push({
      severity: 'tip',
      message: 'Reemplaza `var` por `const` o `let` para evitar fugas de alcance.',
    });
  }
  if (/\bfetch\s*\(/.test(trimmed) && !/\.ok\b/.test(trimmed)) {
    findings.push({
      severity: 'tip',
      message: 'Comprueba `if (!response.ok)` después de `fetch(...)` porque HTTP 4xx/5xx no lanzan excepción por sí solos.',
    });
  }

  return { detectedKind: 'js', findings };
}
