'use client';

import { tokenClassName, tokenizeHighlightedLines } from '@/lib/syntax-highlight';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Maximize2,
  Minimize2,
  Monitor,
  Pencil,
  RotateCw,
  Smartphone,
  Tablet,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadTextFile } from './MessageMarkdown';

export interface HtmlArtifactVersion {
  id: string;
  label: string;
  html: string;
}

interface ConsoleEntry {
  level: 'log' | 'warn' | 'error';
  text: string;
}

const CONSOLE_BRIDGE_SCRIPT = `<script>(function(){function s(l,a){try{parent.postMessage({source:'elara-preview',level:l,text:Array.prototype.slice.call(a).map(function(x){return typeof x==='string'?x:JSON.stringify(x)}).join(' ')},'*')}catch(e){}}var ol=console.log,ow=console.warn,oe=console.error;console.log=function(){s('log',arguments);ol.apply(console,arguments)};console.warn=function(){s('warn',arguments);ow.apply(console,arguments)};console.error=function(){s('error',arguments);oe.apply(console,arguments)};window.addEventListener('error',function(ev){s('error',[ev.message||'Error de script'])})})();<\/script>`;

function injectConsoleBridge(html: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${CONSOLE_BRIDGE_SCRIPT}</body>`);
  }
  return `${html}${CONSOLE_BRIDGE_SCRIPT}`;
}

export function CodePreviewDrawer({
  artifacts,
  selectedHtml,
  onSelectHtml,
  onUpdateHtml,
  onFixErrorPrompt,
  onClose,
}: {
  artifacts: HtmlArtifactVersion[];
  selectedHtml: string;
  onSelectHtml: (html: string) => void;
  onUpdateHtml?: (html: string) => void;
  onFixErrorPrompt?: (errorMsg: string) => void;
  onClose: () => void;
}) {
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [editingCode, setEditingCode] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);

  const bridgedSrcDoc = useMemo(() => injectConsoleBridge(selectedHtml), [selectedHtml]);
  const highlightedLines = useMemo(() => tokenizeHighlightedLines(selectedHtml, 'html'), [selectedHtml]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { source?: string; level?: ConsoleEntry['level']; text?: string } | null;
      if (event.source !== previewRef.current?.contentWindow) return;
      if (!data || data.source !== 'elara-preview' || !data.text) return;
      const entry: ConsoleEntry = { level: data.level || 'log', text: String(data.text).slice(0, 240) };
      setLogs((prev) => [...prev.slice(-24), entry]);
      if (entry.level === 'error') setConsoleOpen(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(selectedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures cleanly.
    }
  };

  const openInNewTab = () => {
    const blob = new Blob([selectedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const stageWidthClass =
    viewport === 'mobile' ? 'w-[375px] max-w-full' : viewport === 'tablet' ? 'w-[768px] max-w-full' : 'w-full';

  return (
    <aside
      className={
        expanded
          ? 'fixed inset-0 z-40 flex flex-col bg-[#EEEAF7]'
          : 'fixed inset-0 z-40 flex flex-col bg-[#EEEAF7] lg:static lg:inset-auto lg:h-full lg:w-[45%] lg:min-w-[380px] xl:w-[47%] lg:max-w-[740px] lg:border-l lg:border-[#EEEAF7]'
      }
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEEAF7] bg-[#EEEAF7] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-[#EEEAF7] bg-[#EEEAF7] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tab === 'preview' ? 'bg-[#EEEAF7] text-[#6654D9]' : 'text-[#66697F] hover:text-[#292D47]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => setTab('code')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tab === 'code' ? 'bg-[#EEEAF7] text-[#6654D9]' : 'text-[#66697F] hover:text-[#292D47]'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              index.html
            </button>
          </div>

          {artifacts.length > 1 && (
            <div className="hidden items-center gap-1 sm:flex">
              {artifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => {
                    setLogs([]);
                    onSelectHtml(art.html);
                  }}
                  className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
                    art.html === selectedHtml
                      ? 'bg-[#6654D9]/20 text-[#6654D9]'
                      : 'bg-[#F1EFF9] text-[#74758B] hover:text-[#292D47]'
                  }`}
                >
                  {art.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {tab === 'preview' && (
            <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-[#DED8EB] bg-[#EEEAF7] p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                title="Escritorio"
                className={`rounded-md p-1.5 ${viewport === 'desktop' ? 'bg-[#EEEAF7] text-[#6654D9]' : 'text-[#74758B] hover:text-[#292D47]'}`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                title="Tablet (768px)"
                className={`rounded-md p-1.5 ${viewport === 'tablet' ? 'bg-[#EEEAF7] text-[#6654D9]' : 'text-[#74758B] hover:text-[#292D47]'}`}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                title="Móvil (375px)"
                className={`rounded-md p-1.5 ${viewport === 'mobile' ? 'bg-[#EEEAF7] text-[#6654D9]' : 'text-[#74758B] hover:text-[#292D47]'}`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setLogs([]);
              setReloadNonce((n) => n + 1);
            }}
            title="Recargar vista previa"
            className="rounded-lg p-1.5 text-[#66697F] transition-colors hover:bg-[#EEEAF7] hover:text-[#292D47]"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={openInNewTab}
            title="Abrir en nueva pestaña"
            className="rounded-lg p-1.5 text-[#66697F] transition-colors hover:bg-[#EEEAF7] hover:text-[#292D47]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-lg border border-[#DDD7ED] bg-[#F1EFF9] px-2.5 py-1 text-xs text-[#494D66] hover:text-[#292D47]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile('index.html', selectedHtml)}
            title="Descargar index.html"
            className="rounded-lg border border-[#DDD7ED] bg-[#F1EFF9] p-1.5 text-[#494D66] hover:text-[#292D47]"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="hidden rounded-lg p-1.5 text-[#66697F] hover:bg-[#EEEAF7] hover:text-[#292D47] lg:inline-flex"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="rounded-lg p-1.5 text-[#66697F] hover:bg-[#EEEAF7] hover:text-[#292D47]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Preview or Highlighted Code Stage */}
      <div className="min-h-0 flex-1 overflow-auto bg-[#EEEAF7]">
        {tab === 'preview' ? (
          <div className="flex h-full w-full items-stretch justify-center p-2 sm:p-3">
            <div
              className={`${stageWidthClass} flex h-full flex-col overflow-hidden rounded-xl border border-[#EEEAF7] bg-white shadow-2xl transition-all duration-200`}
            >
              <iframe
                ref={previewRef}
                key={reloadNonce}
                title="Vista previa en vivo de ELARA"
                srcDoc={bridgedSrcDoc}
                sandbox="allow-scripts"
                className="h-full w-full flex-1 bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col bg-[#EEEAF7]">
            <div className="flex items-center justify-between border-b border-[#EEEAF7] bg-[#EFEDF7] px-3.5 py-2 text-xs">
              <span className="font-mono text-[#74758B]">
                {highlightedLines.length} líneas · {selectedHtml.length.toLocaleString('es-PE')} caracteres
              </span>
              {onUpdateHtml && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingCode((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      editingCode
                        ? 'border-[#6654D9]/60 bg-[#EEEAF7] text-[#6654D9]'
                        : 'border-[#DDD7ED] bg-[#F1EFF9] text-[#494D66] hover:text-[#292D47]'
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    {editingCode ? 'Ver resaltado' : 'Editar en vivo'}
                  </button>
                  {editingCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogs([]);
                        setTab('preview');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#6654D9] px-2.5 py-1 text-xs font-semibold text-[#FFFFFF] hover:opacity-90"
                    >
                      <Eye className="h-3 w-3" />
                      Ver resultado
                    </button>
                  )}
                </div>
              )}
            </div>

            {editingCode && onUpdateHtml ? (
              <textarea
                aria-label="Editor HTML en vivo"
                spellCheck={false}
                value={selectedHtml}
                onChange={(e) => onUpdateHtml(e.target.value)}
                className="min-h-0 flex-1 resize-none bg-[#EEEAF7] p-4 font-mono text-[12.5px] leading-6 text-[#3E425C] focus:outline-none"
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-6">
                <table className="w-full border-collapse">
                  <tbody>
                    {highlightedLines.map((tokens, idx) => (
                      <tr key={idx} className="hover:bg-[#EEEAF7]/60">
                        <td className="w-10 select-none pr-3 text-right text-[11px] text-[#475569]">{idx + 1}</td>
                        <td className="whitespace-pre pr-4">
                          {tokens.map((tok, ti) => (
                            <span key={ti} className={tokenClassName(tok.kind)}>
                              {tok.text}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Sandbox Console Bar */}
      <div className="border-t border-[#EEEAF7] bg-[#EFEDF7]">
        <div className="flex items-center justify-between px-3.5 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setConsoleOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-[#66697F] hover:text-[#292D47]"
          >
            <Terminal className="h-3.5 w-3.5 text-[#6654D9]" />
            <span>Consola ({logs.length})</span>
            {errorCount > 0 && (
              <span className="rounded-full bg-[#EF4444]/20 px-2 py-0.5 text-[11px] font-medium text-[#FCA5A5]">
                {errorCount} error
              </span>
            )}
          </button>

          {errorCount > 0 && onFixErrorPrompt && (
            <button
              type="button"
              onClick={() => {
                const lastErr = logs.filter((l) => l.level === 'error').pop()?.text || '';
                onFixErrorPrompt(`El visor reportó este error en index.html: ${lastErr}. Revísalo.`);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-[#EF4444]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#FCA5A5] hover:bg-[#EF4444]/25"
            >
              <Wrench className="h-3 w-3" />
              Pedir a ELARA revisar
            </button>
          )}
        </div>

        {consoleOpen && (
          <div className="max-h-28 overflow-y-auto border-t border-[#EEEAF7] bg-[#EEEAF7] px-3.5 py-2 font-mono text-[11.5px]">
            {logs.length === 0 ? (
              <p className="text-[#74758B]">Sin mensajes de consola en la vista previa actual.</p>
            ) : (
              logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={
                    entry.level === 'error'
                      ? 'text-[#FCA5A5]'
                      : entry.level === 'warn'
                        ? 'text-[#FCD34D]'
                        : 'text-[#494D66]'
                  }
                >
                  [{entry.level}] {entry.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
