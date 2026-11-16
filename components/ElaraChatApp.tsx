'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Menu,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CodePreviewDrawer, type HtmlArtifactVersion } from './CodePreviewDrawer';
import { ElaraLogo } from './ElaraLogo';
import { MessageMarkdown } from './MessageMarkdown';
import { NovvinAuthModal, type ElaraUserProfile } from './NovvinAuthModal';

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
const PROFILE_KEY = 'elara_user_profile_v1';
const GUEST_COUNT_KEY = 'elara_guest_count_v1';
const GUEST_MESSAGE_LIMIT = 20;

const STARTER_PROMPTS = [
  'Genera una web de 20 juguetes de perritos',
  'Haz un login moderno en HTML con botón Continuar con Novvin',
  'Crea una calculadora web interactiva en index.html',
  'Ejemplo de fetch seguro con async/await en TypeScript',
];

const noopSubscribe = () => () => {};

function extractMessageText(message: UIMessage): string {
  return (message.parts || [])
    .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function extractAllHtmlArtifacts(messages: UIMessage[]): HtmlArtifactVersion[] {
  const list: HtmlArtifactVersion[] = [];
  let version = 1;
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const text = extractMessageText(msg);
    const regex = /```html\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]?.trim()) {
        list.push({
          id: `${msg.id}-v${version}`,
          label: `v${version}`,
          html: match[1],
        });
        version += 1;
      }
    }
  }
  return list;
}

function makeTitleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Nueva conversación';
  const raw = extractMessageText(firstUser).trim().replace(/\s+/g, ' ');
  return raw.length > 36 ? `${raw.slice(0, 36)}…` : raw || 'Nueva conversación';
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
    // Ignore malformed storage gracefully.
  }
  return [createEmptyConversation()];
}

function writeStoredConversations(list: StoredConversation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Ignore storage quota limits.
  }
}

function loadStoredProfile(): ElaraUserProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ElaraUserProfile;
    return parsed?.displayName ? parsed : null;
  } catch {
    return null;
  }
}

function loadGuestCount(): number {
  try {
    const n = Number(window.localStorage.getItem(GUEST_COUNT_KEY) || '0');
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function formatReadableError(error: Error): string {
  const raw = error.message || '';
  if (!raw) return 'Error de conexión desconocido.';
  try {
    const parsed = JSON.parse(raw) as { error?: string; code?: string };
    if (parsed?.error) {
      return parsed.code ? `${parsed.error} (${parsed.code})` : parsed.error;
    }
  } catch {
    // Not raw JSON — show message directly.
  }
  return raw;
}

export function ElaraChatApp() {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <div className="elara-ambient flex h-dvh w-full items-center justify-center bg-[#06080E] text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <ElaraLogo size={32} />
          <span className="text-sm font-semibold tracking-wider text-white">ELARA</span>
        </div>
      </div>
    );
  }

  return <ElaraWorkspace />;
}

function ElaraWorkspace() {
  const [savedConversations, setSavedConversations] = useState<StoredConversation[]>(() => loadStoredConversations());
  const [activeId, setActiveId] = useState<string>(() => savedConversations[0]?.id ?? 'conv-default');
  const [userProfile, setUserProfile] = useState<ElaraUserProfile | null>(() => loadStoredProfile());
  const [guestUsed, setGuestUsed] = useState<number>(() => loadGuestCount());
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalKey, setAuthModalKey] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [health, setHealth] = useState<HealthInfo>({
    label: 'Elara Core v0.2',
    mode: 'elara-core',
    model: 'elara-core-v0.2',
  });

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoFollowRef = useRef(true);

  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), []);
  const initialMessages = useMemo(
    () => savedConversations.find((c) => c.id === activeId)?.messages ?? [],
    [savedConversations, activeId],
  );

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id: activeId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      const text = extractMessageText(message);
      const match = text.match(/```html\n([\s\S]*?)```/);
      if (match?.[1] && typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setPreviewHtml(match[1]);
      }
    },
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
    if (autoFollowRef.current) {
      endRef.current?.scrollIntoView({ behavior: status === 'streaming' ? 'auto' : 'smooth' });
    }
  }, [messages, status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (busy) stop();
        clearError();
        const fresh = createEmptyConversation();
        setSavedConversations((prev) => [fresh, ...prev].slice(0, 30));
        setActiveId(fresh.id);
        setPreviewHtml(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const busy = status === 'submitted' || status === 'streaming';
  const htmlArtifacts = useMemo(() => extractAllHtmlArtifacts(messages), [messages]);
  const latestHtml = htmlArtifacts[htmlArtifacts.length - 1]?.html ?? null;
  const guestLimitReached = !userProfile && guestUsed >= GUEST_MESSAGE_LIMIT;

  function openAuthModal() {
    setAuthModalKey((k) => k + 1);
    setAuthModalOpen(true);
  }

  function startNewChat() {
    if (busy) stop();
    clearError();
    const fresh = createEmptyConversation();
    setSavedConversations([fresh, ...displayConversations].slice(0, 30));
    setActiveId(fresh.id);
    setPreviewHtml(null);
    setSidebarOpen(false);
    autoFollowRef.current = true;
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
    autoFollowRef.current = true;
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
    if (!userProfile && guestUsed >= GUEST_MESSAGE_LIMIT) {
      openAuthModal();
      return;
    }
    clearError();
    autoFollowRef.current = true;
    setShowScrollDown(false);
    if (!userProfile) {
      const nextCount = guestUsed + 1;
      setGuestUsed(nextCount);
      try {
        window.localStorage.setItem(GUEST_COUNT_KEY, String(nextCount));
      } catch {
        // Ignore storage write error.
      }
    }
    sendMessage({ text: clean });
    setInput('');
  }

  function handleSaveProfile(profile: ElaraUserProfile) {
    setUserProfile(profile);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage write error.
    }
  }

  function handleSignOut() {
    setUserProfile(null);
    try {
      window.localStorage.removeItem(PROFILE_KEY);
    } catch {
      // Ignore storage error.
    }
  }

  async function copyAssistantMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 1600);
    } catch {
      // Ignore clipboard failure cleanly.
    }
  }

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 90;
    autoFollowRef.current = nearBottom;
    setShowScrollDown(!nearBottom && messages.length > 0);
  }

  const quotaPct = Math.min(100, Math.round((guestUsed / GUEST_MESSAGE_LIMIT) * 100));

  return (
    <div className="elara-ambient flex h-dvh w-full overflow-hidden bg-[#06080E] text-[#F1F5F9]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/65 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[272px] shrink-0 flex-col border-r border-[#1B2436] bg-[#0B0F18]/95 backdrop-blur-md transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#1B2436] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <ElaraLogo size={28} />
            <div>
              <span className="block text-sm font-bold tracking-[0.08em] text-white">ELARA</span>
              <span className="block text-[10px] text-[#64748B]">Studio Conversacional</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#161E2F] hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-between rounded-xl border border-[#23304A] bg-[#121928] px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#38BDF8]/55 hover:bg-[#172033]"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#38BDF8]" />
              Nuevo chat
            </span>
            <kbd className="rounded bg-[#0A0E17] px-1.5 py-0.5 font-mono text-[10px] text-[#64748B]">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-1">
          <p className="px-2 pb-1.5 text-xs font-medium text-[#64748B]">Conversaciones</p>
          <div className="space-y-1">
            {displayConversations.map((conv) => {
              const selected = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-colors ${
                    selected
                      ? 'border border-[#24324D] bg-[#151E30] text-white'
                      : 'text-[#94A3B8] hover:bg-[#111725] hover:text-[#E2E8F0]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(conv)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-75" />
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

        {/* Guest limit OR Signed-in User Profile Card */}
        <div className="space-y-2.5 border-t border-[#1B2436] p-3">
          {userProfile ? (
            <button
              type="button"
              onClick={openAuthModal}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[#22304A] bg-[#111827] p-2.5 text-left transition-colors hover:border-[#38BDF8]/50"
            >
              <span
                style={{ backgroundColor: userProfile.avatarColor }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#061018]"
              >
                {userProfile.displayName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{userProfile.displayName}</p>
                <p className="truncate font-mono text-[11px] text-[#7DD3FC]">@{userProfile.handle}</p>
              </div>
              <span className="rounded-md bg-[#22C55E]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#4ADE80]">
                Ilimitado
              </span>
            </button>
          ) : (
            <>
              <div className="rounded-xl border border-[#1E283D] bg-[#0F1522] p-3 text-xs">
                <div className="flex items-center justify-between text-[#E2E8F0]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                    Acceso libre
                  </span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">
                    {guestUsed}/{GUEST_MESSAGE_LIMIT}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1B2436]">
                  <div
                    style={{ width: `${quotaPct}%` }}
                    className={`h-full rounded-full transition-all ${
                      guestLimitReached ? 'bg-[#F87171]' : 'bg-gradient-to-r from-[#38BDF8] to-[#818CF8]'
                    }`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#64748B]">
                  {guestLimitReached
                    ? 'Límite alcanzado. Crea tu perfil para continuar.'
                    : `${GUEST_MESSAGE_LIMIT - guestUsed} mensajes gratuitos restantes.`}
                </p>
              </div>
              <button
                type="button"
                onClick={openAuthModal}
                className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-[#38BDF8]/15 to-[#818CF8]/15 border border-[#38BDF8]/35 px-3 py-2.5 text-xs font-semibold text-[#E0F2FE] transition-colors hover:border-[#38BDF8]"
              >
                <span>Continuar con Novvin</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#38BDF8]" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Conversation Column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#1B2436] bg-[#06080E]/85 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir conversaciones"
              className="rounded-lg border border-[#1F293D] p-1.5 text-[#94A3B8] hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wider text-white lg:hidden">ELARA</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#222E46] bg-[#0F1522] px-3 py-1 text-xs text-[#CBD5E1]">
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#284261] bg-[#101C2E] px-3 py-1.5 text-xs font-medium text-[#7DD3FC] transition-colors hover:border-[#38BDF8] hover:text-white"
              >
                <Code2 className="h-3.5 w-3.5" />
                {previewHtml ? 'Ocultar visor' : `Abrir visor (${htmlArtifacts.length})`}
              </button>
            )}
          </div>
        </header>

        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-6 text-center">
              <div className="rounded-2xl border border-[#1E2A42] bg-[#0E1422] p-3 shadow-lg shadow-sky-950/30">
                <ElaraLogo size={42} />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {userProfile
                  ? `¿Qué creamos hoy, ${userProfile.displayName.split(' ')[0]}?`
                  : '¿Qué construimos hoy con ELARA?'}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#94A3B8]">
                Pídeme generar una página web sobre cualquier tema (por ejemplo{' '}
                <span className="text-[#CBD5E1]">20 juguetes de perritos</span>), fragmentos de código o una revisión rápida de sintaxis.
              </p>

              <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="group flex items-start gap-2.5 rounded-2xl border border-[#1D273B] bg-[#0E1421]/90 p-4 text-left text-sm text-[#CBD5E1] transition-all hover:border-[#38BDF8]/50 hover:bg-[#131B2C] hover:text-white"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#38BDF8] opacity-80 group-hover:opacity-100" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              {messages.map((message, index) => {
                const text = extractMessageText(message);
                const isUser = message.role === 'user';
                const isLastAssistant = !isUser && index === messages.length - 1 && !busy;
                return (
                  <div
                    key={message.id}
                    className={`group flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && <ElaraLogo size={28} />}
                    <div
                      className={
                        isUser
                          ? 'max-w-[85%] rounded-2xl border border-[#263552] bg-[#131D31] px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm'
                          : 'min-w-0 flex-1 pt-0.5'
                      }
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{text}</p>
                      ) : (
                        <>
                          <MessageMarkdown content={text} onOpenPreview={(code) => setPreviewHtml(code)} />
                          {text && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-[#64748B] opacity-85 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => copyAssistantMessage(message.id, text)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[#131B2C] hover:text-[#CBD5E1]"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3.5 w-3.5 text-[#34D399]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                {copiedMessageId === message.id ? 'Copiado' : 'Copiar'}
                              </button>
                              {isLastAssistant && (
                                <button
                                  type="button"
                                  onClick={() => regenerate()}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[#131B2C] hover:text-[#CBD5E1]"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Regenerar
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {status === 'submitted' && (
                <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
                  <ElaraLogo size={28} />
                  <span className="animate-pulse">ELARA está preparando la respuesta…</span>
                </div>
              )}

              {error && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5B212A] bg-[#211016] px-4 py-3 text-sm text-[#FECACA]">
                  <div className="min-w-0 flex-1">
                    <strong className="font-semibold text-[#FCA5A5]">Error exacto reportado:</strong>{' '}
                    <span className="break-words text-[#FDE8E8]">{formatReadableError(error)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#7F1D1D] bg-[#3B151D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#521D27]"
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

        {showScrollDown && (
          <button
            type="button"
            onClick={() => {
              autoFollowRef.current = true;
              setShowScrollDown(false);
              endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Ir al último mensaje"
            className="absolute right-6 bottom-28 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#25334E] bg-[#0F1522]/95 px-3 py-1.5 text-xs text-[#CBD5E1] shadow-lg backdrop-blur hover:border-[#38BDF8] hover:text-white"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Bajar
          </button>
        )}

        {/* Composer */}
        <footer className="border-t border-[#1B2436] bg-[#06080E]/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <div className="mx-auto max-w-3xl">
            {guestLimitReached ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2D3D5E] bg-[#101829] px-4 py-3.5">
                <div className="text-sm">
                  <p className="font-semibold text-white">Alcanzaste los {GUEST_MESSAGE_LIMIT} mensajes gratuitos</p>
                  <p className="text-xs text-[#94A3B8]">
                    Inicia sesión con tu perfil o continúa con Novvin para seguir chateando sin límite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#818CF8] px-4 py-2 text-xs font-semibold text-[#061018] hover:opacity-95"
                >
                  Iniciar sesión para continuar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPrompt(input);
                }}
              >
                <div className="flex items-end gap-2 rounded-2xl border border-[#222F47] bg-[#0E1421] p-2 shadow-inner focus-within:border-[#38BDF8]/70">
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
                    placeholder="Pide una web de cualquier tema, ejemplo de código o pega un fallo..."
                    className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-white placeholder-[#64748B] focus:outline-none"
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
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#60A5FA] text-[#061018] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:from-[#1B2436] disabled:to-[#1B2436] disabled:text-[#64748B]"
                    >
                      <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </form>
            )}

            <p className="mt-2 text-center text-[11px] text-[#64748B]">
              {health.label} · {userProfile ? `Sesión de @${userProfile.handle}` : `Modo invitado (${guestUsed}/${GUEST_MESSAGE_LIMIT})`} · Verifica el código antes de producción.
            </p>
          </div>
        </footer>
      </div>

      {/* Live Preview Drawer */}
      {previewHtml && (
        <CodePreviewDrawer
          artifacts={htmlArtifacts}
          selectedHtml={previewHtml}
          onSelectHtml={(html) => setPreviewHtml(html)}
          onFixErrorPrompt={(msg) => submitPrompt(msg)}
          onClose={() => setPreviewHtml(null)}
        />
      )}

      {/* Novvin / Profile Modal */}
      <NovvinAuthModal
        key={authModalKey}
        open={authModalOpen}
        limitReached={guestLimitReached}
        guestUsed={guestUsed}
        guestLimit={GUEST_MESSAGE_LIMIT}
        existingProfile={userProfile}
        onSaveProfile={handleSaveProfile}
        onSignOut={handleSignOut}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
