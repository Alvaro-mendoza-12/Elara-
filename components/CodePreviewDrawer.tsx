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
  RotateCcw,
  Smartphone,
  Tablet,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadTextFile } from './MessageMarkdown';
import { DevicePreview } from './DevicePreview';

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
  selectedId,
  onSelectHtml,
  onUpdateHtml,
  onFixErrorPrompt,
  onClose,
  width = 520,
  onResetLayout,
}: {
  artifacts: HtmlArtifactVersion[];
  selectedHtml: string;
  selectedId: string;
  onSelectHtml: (html: string, id?: string) => void;
  onUpdateHtml?: (html: string) => void;
  onFixErrorPrompt?: (errorMsg: string) => void;
  onClose: () => void;
  width?: number;
  onResetLayout?: () => void;
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

  return (
    <aside
      style={expanded ? undefined : { width: undefined, '--preview-width': `${width}px` } as React.CSSProperties}
      className={
        expanded
          ? 'preview-drawer preview-expanded fixed inset-0 z-40 flex flex-col bg-[var(--surface-2)]'
          : 'preview-drawer fixed inset-0 z-40 flex flex-col bg-[var(--surface-2)] lg:static lg:inset-auto lg:h-full lg:w-[45%] lg:min-w-[380px] xl:w-[47%] lg:max-w-[740px] lg:border-l lg:border-[var(--surface-2)]'
      }
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-2)] bg-[var(--surface-2)] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-[var(--surface-2)] bg-[var(--surface-2)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tab === 'preview' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => setTab('code')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tab === 'code' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              index.html
            </button>
          </div>

          <label className="preview-version"><span className="sr-only">Versión del prototipo</span><select aria-label="Versión del prototipo" value={selectedId} onChange={(event) => { const artifact = artifacts.find((item) => item.id === event.target.value); if (artifact) { setLogs([]); onSelectHtml(artifact.html, artifact.id); } }}>{artifacts.map((artifact) => <option key={artifact.id} value={artifact.id}>{artifact.label}</option>)}</select></label>
        </div>

        <div className="flex items-center gap-1">
          {tab === 'preview' && (
            <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                title="Laptop (1280 × 800)" aria-label="Laptop" aria-pressed={viewport === 'desktop'}
                className={`rounded-md p-1.5 ${viewport === 'desktop' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                title="Tablet (768 × 1024)" aria-label="Tablet" aria-pressed={viewport === 'tablet'}
                className={`rounded-md p-1.5 ${viewport === 'tablet' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                title="Celular (390 × 844)" aria-label="Celular" aria-pressed={viewport === 'mobile'}
                className={`rounded-md p-1.5 ${viewport === 'mobile' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button type="button" title="Restablecer vista" aria-label="Restablecer vista" className="rounded-lg p-1.5 text-[var(--secondary)] hover:bg-[var(--hover)]" onClick={() => { setViewport('desktop'); setExpanded(false); setTab('preview'); setReloadNonce((n) => n + 1); setLogs([]); onResetLayout?.(); }}><RotateCcw size={15} /></button>
          <button
            type="button"
            onClick={() => {
              setLogs([]);
              setReloadNonce((n) => n + 1);
            }}
            title="Recargar vista previa"
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={openInNewTab}
            title="Abrir en nueva pestaña"
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={copyCode}
            aria-label={copied ? 'Código copiado' : 'Copiar código'}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--secondary)] hover:text-[var(--ink)]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile('index.html', selectedHtml)}
            title="Descargar index.html"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1.5 text-[var(--secondary)] hover:text-[var(--ink)]"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Preview or Highlighted Code Stage */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--surface-2)]">
        {tab === 'preview' ? (
          <DevicePreview key={reloadNonce} viewport={viewport} srcDoc={bridgedSrcDoc} selectedId={selectedId} reloadNonce={reloadNonce} previewRef={previewRef} />
        ) : (
          <div className="flex h-full flex-col bg-[var(--surface-2)]">
            <div className="flex items-center justify-between border-b border-[var(--surface-2)] bg-[var(--surface-2)] px-3.5 py-2 text-xs">
              <span className="font-mono text-[var(--muted)]">
                {highlightedLines.length} líneas · {selectedHtml.length.toLocaleString('es-PE')} caracteres
              </span>
              {onUpdateHtml && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingCode((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      editingCode
                        ? 'border-[var(--accent)]/60 bg-[var(--surface-2)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--secondary)] hover:text-[var(--ink)]'
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
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--on-accent)] hover:opacity-90"
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
                className="min-h-0 flex-1 resize-none bg-[var(--surface-2)] p-4 font-mono text-[12.5px] leading-6 text-[var(--ink)] focus:outline-none"
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-6">
                <table className="w-full border-collapse">
                  <tbody>
                    {highlightedLines.map((tokens, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-2)]/60">
                        <td className="w-10 select-none pr-3 text-right text-[11px] text-[var(--muted)]">{idx + 1}</td>
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
      <div className="border-t border-[var(--surface-2)] bg-[var(--surface-2)]">
        <div className="flex items-center justify-between px-3.5 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setConsoleOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <Terminal className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>Consola ({logs.length})</span>
            {errorCount > 0 && (
              <span className="rounded-full bg-[var(--danger)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)]">
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
              className="inline-flex items-center gap-1 rounded-md bg-[var(--danger)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/25"
            >
              <Wrench className="h-3 w-3" />
              Pedir a ELARA revisar
            </button>
          )}
        </div>

        {consoleOpen && (
          <div className="max-h-28 overflow-y-auto border-t border-[var(--surface-2)] bg-[var(--surface-2)] px-3.5 py-2 font-mono text-[11.5px]">
            {logs.length === 0 ? (
              <p className="text-[var(--muted)]">Sin mensajes de consola en la vista previa actual.</p>
            ) : (
              logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={
                    entry.level === 'error'
                      ? 'text-[var(--danger)]'
                      : entry.level === 'warn'
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--secondary)]'
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
