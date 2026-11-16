'use client';

import { Check, Copy, Download, Play } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';

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
    segments.push(inCode ? { kind: 'code', lang, value: buffer.join('\n') } : { kind: 'text', value: buffer.join('\n') });
  }
  return segments;
}

function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={keyIdx++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={keyIdx++}
          className="rounded border border-[#253047] bg-[#161D2C] px-1.5 py-0.5 font-mono text-[0.85em] text-[#7DD3FC]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
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
        <ol key={keyCounter++} className="my-2 list-decimal space-y-1.5 pl-5 text-[#E2E8F0]">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
    } else {
      elements.push(
        <ul key={keyCounter++} className="my-2 list-disc space-y-1.5 pl-5 text-[#E2E8F0]">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
    }
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
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
        <h3 key={keyCounter++} className="mt-3 mb-1 text-base font-semibold text-white">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={keyCounter++} className="mt-4 mb-1.5 text-lg font-semibold text-white">
          {renderInline(trimmed.slice(3))}
        </h2>,
      );
    } else {
      elements.push(
        <p key={keyCounter++} className="my-1.5 leading-relaxed text-[#E2E8F0]">
          {renderInline(trimmed)}
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
  const isHtml = lang === 'html' || /^\s*<(?:!doctype\s+html|html)\b/i.test(code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may fail in restricted frames; ignore gracefully.
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
    <div className="my-3 overflow-hidden rounded-xl border border-[#242F44] bg-[#090C12]">
      <div className="flex items-center justify-between border-b border-[#1E2738] bg-[#131926] px-3.5 py-2 text-xs text-[#94A3B8]">
        <span className="font-mono font-medium text-[#CBD5E1]">{lang || 'código'}</span>
        <div className="flex items-center gap-1.5">
          {isHtml && onOpenPreview && (
            <button
              type="button"
              onClick={() => onOpenPreview(code)}
              className="inline-flex items-center gap-1 rounded-md bg-[#38BDF8]/15 px-2.5 py-1 text-xs font-medium text-[#38BDF8] transition-colors hover:bg-[#38BDF8]/25"
            >
              <Play className="h-3 w-3" />
              Vista previa
            </button>
          )}
          <button
            type="button"
            onClick={() => downloadTextFile(isHtml ? 'index.html' : `elara-snippet.${ext}`, code)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#94A3B8] transition-colors hover:bg-[#1E2738] hover:text-white"
            title="Descargar archivo"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-[#CBD5E1] transition-colors hover:bg-[#1E2738] hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-6 text-[#E2E8F0]">
        <code>{code}</code>
      </pre>
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
    <div className="max-w-[74ch] text-[15px]">
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
