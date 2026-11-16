'use client';

import { tokenClassName, tokenizeHighlightedLines } from '@/lib/syntax-highlight';
import { Check, ChevronDown, ChevronUp, Copy, Download, Play } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'code'; lang: string; value: string };

function splitCodeSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const lines = raw.split('\n');
  let inCode = false;
  let lang = 'text';
  let buffer: string[] = [];

  for (const line of lines) {
    if (!inCode && line.trimStart().startsWith('```')) {
      if (buffer.length > 0) {
        segments.push({ kind: 'text', value: buffer.join('\n') });
        buffer = [];
      }
      inCode = true;
      lang = line.trim().slice(3).trim().toLowerCase() || 'text';
      continue;
    }

    if (inCode && line.trim() === '```') {
      segments.push({ kind: 'code', lang, value: buffer.join('\n') });
      buffer = [];
      inCode = false;
      lang = 'text';
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    segments.push(
      inCode
        ? { kind: 'code', lang, value: buffer.join('\n') }
        : { kind: 'text', value: buffer.join('\n') },
    );
  }
  return segments;
}

/**
 * Recursively parses inline formatting (**bold**, `code`, [label](https://url))
 * so nested combinations like **`index.html`** never leak raw backticks.
 */
function renderInline(line: string, keyPrefix = 'in'): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-[#292D47]">
          {renderInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-[#26324B] bg-[#F0EDF8] px-1.5 py-0.5 font-mono text-[0.84em] text-[#6654B8]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6654D9] underline decoration-[#6654D9]/40 underline-offset-4 hover:text-[#6654B8]"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

function parseTableRow(line: string): string[] {
  const clean = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return clean.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') && !trimmed.includes('-')) return false;
  const cells = parseTableRow(trimmed);
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function ProseBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (listOrdered) {
      elements.push(
        <ol key={keyCounter++} className="my-2.5 list-decimal space-y-1.5 pl-5 text-[#3E425C]">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item, `ol-${keyCounter}-${i}`)}
            </li>
          ))}
        </ol>,
      );
    } else {
      elements.push(
        <ul key={keyCounter++} className="my-2.5 list-disc space-y-1.5 pl-5 text-[#3E425C]">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item, `ul-${keyCounter}-${i}`)}
            </li>
          ))}
        </ul>,
      );
    }
    listItems = [];
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const trimmed = lines[idx].trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    // Markdown table block: header line + separator line (`| --- | --- |`) + body rows
    if (
      trimmed.includes('|') &&
      idx + 1 < lines.length &&
      isTableSeparator(lines[idx + 1])
    ) {
      flushList();
      const headers = parseTableRow(trimmed);
      const rows: string[][] = [];
      idx += 2;
      while (idx < lines.length && lines[idx].trim().includes('|')) {
        rows.push(parseTableRow(lines[idx]));
        idx += 1;
      }
      idx -= 1;
      elements.push(
        <div
          key={keyCounter++}
          className="my-3 overflow-x-auto rounded-xl border border-[#DFDBED] bg-[#EEEAF7]"
        >
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="border-b border-[#DFDBED] bg-[#EEEAF7] text-[#3E425C]">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3.5 py-2.5 font-semibold">
                    {renderInline(h, `th-${keyCounter}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAF7] text-[#494D66]">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-[#EEEAF7]">
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3.5 py-2 align-top">
                      {renderInline(row[ci] ?? '', `td-${keyCounter}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={keyCounter++} className="my-4 border-[#DCD7E8]" />);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet) {
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(bullet[1]);
      continue;
    }
    if (ordered) {
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(ordered[1]);
      continue;
    }

    flushList();
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={keyCounter++} className="mt-4 mb-1 text-base font-semibold text-[#292D47]">
          {renderInline(trimmed.slice(4), `h3-${keyCounter}`)}
        </h3>,
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={keyCounter++} className="mt-4 mb-1.5 text-lg font-semibold text-[#292D47]">
          {renderInline(trimmed.slice(3), `h2-${keyCounter}`)}
        </h2>,
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={keyCounter++} className="mt-4 mb-2 text-xl font-bold text-[#292D47]">
          {renderInline(trimmed.slice(2), `h1-${keyCounter}`)}
        </h1>,
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={keyCounter++}
          className="my-2.5 border-l-2 border-[#6654D9]/60 bg-[#EEEAF7] px-3.5 py-2 text-sm text-[#494D66]"
        >
          {renderInline(trimmed.slice(2), `bq-${keyCounter}`)}
        </blockquote>,
      );
    } else {
      elements.push(
        <p key={keyCounter++} className="my-1.5 leading-relaxed text-[#3E425C]">
          {renderInline(trimmed, `p-${keyCounter}`)}
        </p>,
      );
    }
  }
  flushList();

  return <Fragment>{elements}</Fragment>;
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CodeBlock({
  lang,
  code,
  onOpenPreview,
}: {
  lang: string;
  code: string;
  onOpenPreview?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isHtml = lang === 'html' || /^\s*<(?:!doctype\s+html|html)\b/i.test(code);
  const highlighted = useMemo(() => tokenizeHighlightedLines(code, lang), [code, lang]);
  const isLong = highlighted.length > 22;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may fail in unprivileged contexts.
    }
  };

  const ext =
    lang === 'html'
      ? 'html'
      : lang === 'python' || lang === 'py'
        ? 'py'
        : lang === 'tsx' || lang === 'ts' || lang === 'typescript'
          ? 'ts'
          : lang === 'sql'
            ? 'sql'
            : 'txt';

  return (
    <div className="my-3.5 overflow-hidden rounded-2xl border border-[#233049] bg-[#EEEAF7] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEEAF7] bg-[#EEEAF7] px-3.5 py-2.5 text-xs text-[#66697F]">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-[#25334D] bg-[#EEEAF7] px-2 py-0.5 font-mono text-[11px] font-medium text-[#6654B8]">
            {lang || 'código'}
          </span>
          <span className="text-[11px] text-[#74758B]">{highlighted.length} líneas</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isHtml && onOpenPreview && (
            <button
              type="button"
              onClick={() => onOpenPreview(code)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#6654D9] px-2.5 py-1 text-xs font-semibold text-[#EEEAF7] transition-colors hover:bg-[#6654B8]"
            >
              <Play className="h-3 w-3 fill-current" />
              Vista previa
            </button>
          )}
          <button
            type="button"
            onClick={() => downloadTextFile(isHtml ? 'index.html' : `elara-snippet.${ext}`, code)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#DDD7ED] bg-[#EEEAF7] px-2 py-1 text-xs text-[#494D66] transition-colors hover:border-[#6654D9]/40 hover:text-[#292D47]"
            title="Descargar archivo"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[#DDD7ED] bg-[#EEEAF7] px-2.5 py-1 text-xs font-medium text-[#494D66] transition-colors hover:border-[#6654D9]/40 hover:text-[#292D47]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {isLong && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs text-[#66697F] hover:bg-[#EEEAF7] hover:text-[#292D47]"
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {collapsed ? 'Expandir' : 'Contraer'}
            </button>
          )}
        </div>
      </div>

      {!collapsed ? (
        <div className="max-h-[420px] overflow-auto px-2 py-3 font-mono text-[12.5px] leading-6">
          <table className="w-full border-collapse">
            <tbody>
              {highlighted.map((tokens, lineIdx) => (
                <tr key={lineIdx} className="hover:bg-[#EEEAF7]/60">
                  <td className="w-10 select-none pr-3 text-right text-[11px] text-[#475569]">
                    {lineIdx + 1}
                  </td>
                  <td className="whitespace-pre pr-3">
                    {tokens.map((tok, tokIdx) => (
                      <span key={tokIdx} className={tokenClassName(tok.kind)}>
                        {tok.text}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-2.5 text-xs text-[#74758B]">
          Bloque contraído ({highlighted.length} líneas). Pulsa Expandir o Vista previa para verlo.
        </div>
      )}
    </div>
  );
}

export function MessageMarkdown({
  content,
  onOpenPreview,
}: {
  content: string;
  onOpenPreview?: (html: string) => void;
}) {
  const segments = splitCodeSegments(content);
  return (
    <div className="max-w-[76ch] text-[15px]">
      {segments.map((segment, index) =>
        segment.kind === 'code' ? (
          <CodeBlock key={index} lang={segment.lang} code={segment.value} onOpenPreview={onOpenPreview} />
        ) : (
          <ProseBlock key={index} text={segment.value} />
        ),
      )}
    </div>
  );
}
