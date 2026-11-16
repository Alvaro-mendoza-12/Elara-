'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  ArrowUp,
  Code2,
  ExternalLink,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CodePreviewDrawer } from './CodePreviewDrawer';
import { ElaraLogo } from './ElaraLogo';
import { MessageMarkdown } from './MessageMarkdown';

interface StoredConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
}

interface HealthInfo {
  label: string;
  mode: string;
  model: string;
}

const STORAGE_KEY = 'elara_conversations_v1';

const STARTER_PROMPTS = [
  'Crea un index.html moderno para Novvin',
  'Haz un login en HTML con botón Continuar con Novvin',
  'Crea una calculadora web interactiva en index.html',
  '¿Qué es ELARA y cómo funciona su motor?',
];

const noopSubscribe = () => () => {};

function extractMessageText(message: UIMessage): string {
  return (message.parts || [])
    .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function findLatestHtmlBlock(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role !== 'assistant') continue;
    const text = extractMessageText(messages[i]);
    const match = text.match(/```html\n([\s\S]*?)```/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function makeTitleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nueva conversación';
  const raw = extractMessageText(firstUser).trim().replace(/\s+/g, ' ');
  return raw.length > 38 ? `${raw.slice(0, 38)}…` : raw || 'Nueva conversación';
}

function createEmptyConversation(): StoredConversation {
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'Nueva conversación',
    updatedAt: Date.now(),
    messages: [],
  };
}

function loadStoredConversations(): StoredConversation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredConversation[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore malformed localStorage safely.
  }
  return [createEmptyConversation()];
}

function writeStoredConversations(list: StoredConversation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Ignore storage quota limits gracefully.
  }
}

export function ElaraChatApp() {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#0B0E14] text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <ElaraLogo size={32} />
          <span className="text-sm font-medium tracking-wide text-white">ELARA</span>
        </div>
      </div>
    );
  }

  return <ElaraWorkspace />;
}

function ElaraWorkspace() {
  const [savedConversations, setSavedConversations] = useState<StoredConversation[]>(() => loadStoredConversations());
  const [activeId, setActiveId] = useState<string>(() => savedConversations[0]?.id ?? 'conv-default');
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [novvinModalOpen, setNovvinModalOpen] = useState(false);
  const [health, setHealth] = useState<HealthInfo>({
    label: 'Elara Core v0.1',
    mode: 'elara-core',
    model: 'elara-core-v0.1',
  });

  const endRef = useRef<HTMLDivElement | null>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), []);
  const initialMessages = useMemo(
    () => savedConversations.find((c) => c.id === activeId)?.messages ?? [],
    [savedConversations, activeId],
  );

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id: activeId,
    messages: initialMessages,
    transport,
  });

  const displayConversations = useMemo(() => {
    const existing = savedConversations.find((c) => c.id === activeId);
    const updatedActive: StoredConversation = {
      id: activeId,
      title: makeTitleFromMessages(messages),
      updatedAt: existing?.updatedAt ?? 0,
      messages,
    };
    const merged = existing
      ? savedConversations.map((c) => (c.id === activeId ? updatedActive : c))
      : [updatedActive, ...savedConversations];
    return merged.slice(0, 30);
  }, [savedConversations, activeId, messages]);

  useEffect(() => {
    writeStoredConversations(displayConversations);
  }, [displayConversations]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.label) {
          setHealth({ label: data.label, mode: data.mode, model: data.model });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const busy = status === 'submitted' || status === 'streaming';
  const latestHtml = useMemo(() => findLatestHtmlBlock(messages), [messages]);

  function startNewChat() {
    if (busy) stop();
    clearError();
    const fresh = createEmptyConversation();
    setSavedConversations([fresh, ...displayConversations].slice(0, 30));
    setActiveId(fresh.id);
    setPreviewHtml(null);
    setSidebarOpen(false);
  }

  function selectConversation(conv: StoredConversation) {
    if (busy) stop();
    if (conv.id === activeId) {
      setSidebarOpen(false);
      return;
    }
    clearError();
    setSavedConversations(displayConversations);
    setActiveId(conv.id);
    setPreviewHtml(null);
    setSidebarOpen(false);
  }

  function deleteConversation(id: string) {
    const remaining = displayConversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createEmptyConversation();
      setSavedConversations([fresh]);
      setActiveId(fresh.id);
      setPreviewHtml(null);
      writeStoredConversations([fresh]);
      return;
    }
    setSavedConversations(remaining);
    if (id === activeId) {
      setActiveId(remaining[0].id);
      setPreviewHtml(null);
    }
    writeStoredConversations(remaining);
  }

  function submitPrompt(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    clearError();
    sendMessage({ text: clean });
    setInput('');
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0B0E14] text-[#F1F5F9]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] shrink-0 flex-col border-r border-[#1C2333] bg-[#0F141E] transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#1C2333] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <ElaraLogo size={26} />
            <span className="text-base font-semibold tracking-wide text-white">ELARA</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#192131] hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-xl border border-[#242F44] bg-[#151C2B] px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#38BDF8]/50 hover:bg-[#1A2336]"
          >
            <Plus className="h-4 w-4 text-[#38BDF8]" />
            Nuevo chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-1">
          <p className="px-2 pb-1.5 text-xs font-medium text-[#64748B]">Historial local</p>
          <div className="space-y-1">
            {displayConversations.map((conv) => {
              const selected = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    selected
                      ? 'bg-[#192234] text-white'
                      : 'text-[#94A3B8] hover:bg-[#141B29] hover:text-[#E2E8F0]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(conv)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conv.id)}
                    aria-label={`Eliminar ${conv.title}`}
                    className="rounded p-1 text-[#64748B] opacity-0 transition-opacity hover:text-[#F87171] group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#1C2333] p-3">
          <div className="rounded-xl border border-[#1E2738] bg-[#121825] p-2.5 text-xs text-[#94A3B8]">
            <div className="flex items-center gap-2 font-medium text-[#E2E8F0]">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Acceso libre (sin login)
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
              Tus chats se guardan solo en este navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNovvinModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-[#242F44] bg-[#131926] px-3 py-2 text-xs font-medium text-[#CBD5E1] transition-colors hover:border-[#38BDF8]/40 hover:text-white"
          >
            <span>Continuar con Novvin</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#38BDF8]" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#1C2333] bg-[#0B0E14]/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir conversaciones"
              className="rounded-lg border border-[#1F2737] p-1.5 text-[#94A3B8] hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white lg:hidden">ELARA</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#222B3D] bg-[#121722] px-3 py-1 text-xs text-[#CBD5E1]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                {health.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {latestHtml && (
              <button
                type="button"
                onClick={() => setPreviewHtml(previewHtml ? null : latestHtml)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#243047] bg-[#121928] px-3 py-1.5 text-xs font-medium text-[#38BDF8] transition-colors hover:bg-[#192338]"
              >
                <Code2 className="h-3.5 w-3.5" />
                {previewHtml ? 'Ocultar visor' : 'Abrir visor index'}
              </button>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-8 text-center">
              <ElaraLogo size={46} />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                ¿Qué construimos hoy con ELARA?
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#94A3B8]">
                Prueba consultas técnicas básicas o pídeme generar un{' '}
                <code className="font-mono text-[#7DD3FC]">index.html</code> listo para copiar, descargar y ver en vivo.
              </p>

              <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="rounded-xl border border-[#1E2738] bg-[#111622] px-4 py-3 text-left text-sm text-[#CBD5E1] transition-colors hover:border-[#38BDF8]/50 hover:bg-[#161E2E] hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((message) => {
                const text = extractMessageText(message);
                const isUser = message.role === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && <ElaraLogo size={28} />}
                    <div
                      className={
                        isUser
                          ? 'max-w-[85%] rounded-2xl border border-[#24324A] bg-[#162033] px-4 py-2.5 text-[15px] leading-relaxed text-white'
                          : 'min-w-0 flex-1 pt-0.5'
                      }
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{text}</p>
                      ) : (
                        <MessageMarkdown content={text} onOpenPreview={(code) => setPreviewHtml(code)} />
                      )}
                    </div>
                  </div>
                );
              })}

              {status === 'submitted' && (
                <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
                  <ElaraLogo size={28} />
                  <span>ELARA está pensando…</span>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-between rounded-xl border border-[#4C1D24] bg-[#241217] px-4 py-3 text-sm text-[#FCA5A5]">
                  <span>Ocurrió un problema al responder. Puedes reintentar.</span>
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#7F1D1D] px-3 py-1 text-xs font-medium text-white hover:bg-[#7F1D1D]/40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reintentar
                  </button>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </main>

        <footer className="border-t border-[#1C2333] bg-[#0B0E14] px-4 py-3.5 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPrompt(input);
            }}
            className="mx-auto max-w-3xl"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-[#232D42] bg-[#121722] p-2 focus-within:border-[#38BDF8]/60">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt(input);
                  }
                }}
                rows={1}
                placeholder="Escribe tu mensaje o pide un index.html..."
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-white placeholder-[#64748B] focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Detener generación"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E293B] text-white transition-colors hover:bg-[#334155]"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Enviar mensaje"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#38BDF8] text-[#081018] transition-colors hover:bg-[#7DD3FC] disabled:cursor-not-allowed disabled:bg-[#1E2738] disabled:text-[#64748B]"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-[#64748B]">
              {health.label} · Verifica el código generado antes de llevarlo a producción.
            </p>
          </form>
        </footer>
      </div>

      {previewHtml && <CodePreviewDrawer html={previewHtml} onClose={() => setPreviewHtml(null)} />}

      {novvinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#242F44] bg-[#121722] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Continuar con Novvin</h2>
              <button
                type="button"
                onClick={() => setNovvinModalOpen(false)}
                className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#1D2538] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
              Esta primera versión de <strong className="text-white">ELARA</strong> funciona sin login para que puedas probarla de inmediato.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
              En la siguiente fase, al pulsar <strong className="text-[#38BDF8]">Continuar con Novvin</strong>, la app móvil o web de{' '}
              <span className="text-[#E2E8F0]">novvinapp.com</span> detectará tu sesión activa y autorizará la entrada con un clic mediante OAuth.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setNovvinModalOpen(false)}
                className="rounded-xl bg-[#38BDF8] px-4 py-2 text-sm font-semibold text-[#081018] hover:bg-[#7DD3FC]"
              >
                Seguir en acceso libre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
