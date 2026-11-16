'use client';

import { Check, Code2, Copy, Download, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { downloadTextFile } from './MessageMarkdown';

export function CodePreviewDrawer({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures cleanly.
    }
  };

  return (
    <aside className="fixed inset-0 z-40 flex flex-col bg-[#0E131D] lg:static lg:inset-auto lg:h-full lg:w-[46%] lg:min-w-[380px] lg:max-w-[660px] lg:border-l lg:border-[#1F2737]">
      <div className="flex items-center justify-between border-b border-[#1F2737] bg-[#121722] px-3.5 py-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-[#222B3D] bg-[#0B0E14] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
              tab === 'preview' ? 'bg-[#1D273B] text-[#38BDF8]' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Vista previa
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
              tab === 'code' ? 'bg-[#1D273B] text-[#38BDF8]' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            index.html
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-lg border border-[#222B3D] px-2.5 py-1.5 text-xs text-[#CBD5E1] transition-colors hover:bg-[#192131] hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile('index.html', html)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#222B3D] px-2.5 py-1.5 text-xs text-[#CBD5E1] transition-colors hover:bg-[#192131] hover:text-white"
            title="Descargar index.html"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-[#192131] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'preview' ? (
          <iframe
            title="Vista previa en vivo de ELARA"
            srcDoc={html}
            sandbox="allow-scripts"
            className="h-full w-full bg-white"
          />
        ) : (
          <pre className="h-full overflow-auto bg-[#090C12] p-4 font-mono text-[13px] leading-6 text-[#E2E8F0]">
            <code>{html}</code>
          </pre>
        )}
      </div>
    </aside>
  );
}
