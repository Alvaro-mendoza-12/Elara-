'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  LogOut,
  LoaderCircle,
  FileCode2,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CodePreviewDrawer, type HtmlArtifactVersion } from './CodePreviewDrawer';
import { ElaraLogo } from './ElaraLogo';
import { NovvinAvatar, NovvinLogo } from './NovvinIdentity';
import { AppearanceControl } from './AppearanceControl';
import { TypingDots, WorkspaceLoading } from './WorkspaceLoading';
import { downloadTextFile, MessageMarkdown } from './MessageMarkdown';
import { NovvinAuthModal, type ElaraUserProfile } from './NovvinAuthModal';
import { ModelSelector } from './ModelSelector';
import { useServerDictation } from './useServerDictation';
import { conversationStorageKey, DEFAULT_MODEL_PREFERENCES, parseModelPreferences, type ModelPreferences } from '@/lib/models';

interface StoredConversation {
  id: string;
  title: string;
  customTitle?: boolean;
  updatedAt: number;
  messages: UIMessage[];
}

interface HealthInfo {
  label: string;
  mode: string;
  model: string;
}

type StarterCategory = 'Destacados' | 'Webs' | 'Apps' | 'Código' | 'Utilidades';

const PROMPT_CATALOG: Record<StarterCategory, string[]> = {
  Destacados: [
    'Crea una tienda de juguetes para mascotas en tema claro',
    'Diseña un catálogo de 10 laptops en violeta y soles',
    'Organiza mi día con una app de tareas',
    'Explícame Flexbox y CSS Grid con ejemplos',
  ],
  Webs: [
    'Genera un blog revista digital en tema claro color azul',
    'Crea un formulario de reserva y contacto en index.html',
    'Haz un login moderno en HTML con botón Continuar con Novvin',
    'Crea una web de 10 zapatillas y moda urbana en soles',
  ],
  Apps: [
    'Organiza mi día con una app de tareas',
    'Crea un temporizador pomodoro interactivo',
    'Genera un quiz interactivo de programación',
    'Crea un generador de paletas de colores CSS',
  ],
  Código: [
    'Explícame Flexbox y CSS Grid con ejemplos',
    'Expresiones regulares comunes en JavaScript y correo',
    'Resumen de métodos REST GET POST PUT PATCH y JWT',
    'Ejemplo de servidor FastAPI en Python básico',
  ],
  Utilidades: [
    'Convierte 25 km a millas',
    'Convierte color #6654D9 a rgb',
    'Formatea json {"app":"ELARA","v":4,"ok":true}',
    'Genera un uuid y una contraseña segura de 16 caracteres',
  ],
};

const EXT_TO_LANG: Record<string, string> = {
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'js',
  mjs: 'js',
  ts: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  json: 'json',
  py: 'python',
  sql: 'sql',
  md: 'text',
  txt: 'text',
};

interface AttachedCodeFile {
  name: string;
  sizeLabel: string;
  lang: string;
  content: string;
}

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
    let blockIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]?.trim()) {
        list.push({
          id: `${msg.id}-b${blockIndex}`,
          label: `v${version}`,
          html: match[1],
        });
        version += 1;
        blockIndex += 1;
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

function loadStoredConversations(storageKey: string): StoredConversation[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredConversation[];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((c) => typeof c?.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages) && c.messages.every((m) => typeof m?.id === 'string' && ['user', 'assistant'].includes(m.role) && Array.isArray(m.parts) && m.parts.every((part) => (part.type === 'text' && typeof part.text === 'string') || part.type === 'step-start'))).slice(0, 30);
        if (valid.length) return valid;
      }
    }
  } catch {
    // Ignore malformed storage gracefully.
  }
  return [createEmptyConversation()];
}

function writeStoredConversations(list: StoredConversation[], storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Ignore storage quota limits.
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
    return <WorkspaceLoading />;
  }

  return <ElaraSessionBoundary />;
}

function ElaraSessionBoundary() {
  const [profile, setProfile] = useState<ElaraUserProfile | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [minimumLoaded, setMinimumLoaded] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setMinimumLoaded(true), 1050); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    let active = true; let sequence = 0;
    const controller = new AbortController();
    const refresh = async () => {
      const current = ++sequence;
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo verificar la sesión.');
        if (active && current === sequence) { setProfile(data.profile ?? null); setSessionError(''); }
      } catch (caught) { if (active && current === sequence && !controller.signal.aborted) setSessionError(caught instanceof Error ? caught.message : 'No se pudo verificar la sesión.'); }
    };
    void refresh(); window.addEventListener('focus', refresh);
    return () => { active = false; controller.abort(); window.removeEventListener('focus', refresh); };
  }, [attempt]);
  if (!minimumLoaded || (profile === undefined && !sessionError)) return <WorkspaceLoading />;
  if (profile === undefined) return <div className="workspace-loading"><ElaraLogo size={54} /><p role="alert">{sessionError}</p><button type="button" className="auth-secondary" onClick={() => { setSessionError(''); setAttempt((value) => value + 1); }}>Volver a comprobar mi sesión</button></div>;
  return <ElaraWorkspace key={profile?.id || 'guest'} initialProfile={profile} />;
}

function ElaraWorkspace({ initialProfile }: { initialProfile: ElaraUserProfile | null }) {
  const storageKey = conversationStorageKey(initialProfile?.id || null);
  const [modelPreferences, setModelPreferences] = useState<ModelPreferences>(() => {
    try { return parseModelPreferences(JSON.parse(localStorage.getItem(storageKey + ':model') || '{}')) || DEFAULT_MODEL_PREFERENCES; } catch { return DEFAULT_MODEL_PREFERENCES; }
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [savedConversations, setSavedConversations] = useState<StoredConversation[]>(() => loadStoredConversations(storageKey));
  const [activeId, setActiveId] = useState<string>(() => savedConversations[0]?.id ?? 'conv-default');
  const userProfile = initialProfile;

  const [input, setInput] = useState('');
  const [dictationError, setDictationError] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(520);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);
  const [previewState, setPreviewState] = useState<{ id: string; html: string } | null>(null);
  const [editedArtifacts, setEditedArtifacts] = useState<Record<string, string>>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalKey, setAuthModalKey] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [starterTab, setStarterTab] = useState<StarterCategory>('Destacados');
  const [attachedFile, setAttachedFile] = useState<AttachedCodeFile | null>(null);
  const [engineSheetOpen, setEngineSheetOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthInfo>({
    label: 'Elara Core 0.7',
    mode: 'elara-core',
    model: 'elara-core-v0.7',
  });

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoFollowRef = useRef(true);
  const authEpochRef = useRef(0);

  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat', body: modelPreferences }), [modelPreferences]);
  const initialMessages = useMemo(
    () => savedConversations.find((c) => c.id === activeId)?.messages ?? [],
    [savedConversations, activeId],
  );

  const { messages, setMessages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id: activeId,
    messages: initialMessages,
    transport,
    onFinish: ({ message }) => {
      const text = extractMessageText(message);
      const match = text.match(/```html\n([\s\S]*?)```/);
      if (match?.[1] && typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setPreviewState({ id: `${message.id}-b0`, html: match[1] });
      }
    },
  });

  const displayConversations = useMemo(() => {
    const existing = savedConversations.find((c) => c.id === activeId);
    const updatedActive: StoredConversation = {
      id: activeId,
      title: existing?.customTitle ? existing.title : makeTitleFromMessages(messages),
      customTitle: existing?.customTitle,
      updatedAt: existing?.updatedAt ?? 0,
      messages,
    };
    const merged = existing
      ? savedConversations.map((c) => (c.id === activeId ? updatedActive : c))
      : [updatedActive, ...savedConversations];
    return merged.slice(0, 30);
  }, [savedConversations, activeId, messages]);

  useEffect(() => {
    writeStoredConversations(displayConversations, storageKey);
  }, [displayConversations, storageKey]);

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
        dictation.cancel();
        if (busy) stop();
        clearError();
        const fresh = createEmptyConversation();
        setSavedConversations([fresh, ...displayConversations].slice(0, 30));
        setActiveId(fresh.id);
        setPreviewState(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const busy = status === 'submitted' || status === 'streaming';
  const dictation = useServerDictation((text) => {
    setInput((prev) => prev ? `${prev.trimEnd()} ${text}` : text);
    requestAnimationFrame(() => { adjustTextareaHeight(textareaRef.current); textareaRef.current?.focus(); });
  }, (message) => setDictationError(message));
  const listening = dictation.phase === 'recording';
  const htmlArtifacts = useMemo(() => {
    return extractAllHtmlArtifacts(messages).map((art) => ({
      ...art,
      html: editedArtifacts[art.id] ?? art.html,
    }));
  }, [messages, editedArtifacts]);
  const latestArtifact = htmlArtifacts[htmlArtifacts.length - 1] ?? null;
  const filteredConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return displayConversations;
    return displayConversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [displayConversations, chatSearch]);

  function openAuthModal() {
    setAuthModalKey((k) => k + 1);
    setSidebarOpen(false);
    setEngineSheetOpen(false);
    setAuthModalOpen(true);
  }

  function startNewChat() {
    dictation.cancel();
    setDictationError('');
    if (busy) stop();
    clearError();
    const fresh = createEmptyConversation();
    setSavedConversations([fresh, ...displayConversations].slice(0, 30));
    setActiveId(fresh.id);
    setPreviewState(null);
    setEditingMsgId(null);
    setShowScrollDown(false);
    setSidebarOpen(false);
    autoFollowRef.current = true;
  }

  function selectConversation(conv: StoredConversation) {
    dictation.cancel();
    setDictationError('');
    if (busy) stop();
    if (conv.id === activeId) {
      setSidebarOpen(false);
      return;
    }
    clearError();
    setSavedConversations(displayConversations);
    setActiveId(conv.id);
    setPreviewState(null);
    setEditingMsgId(null);
    setShowScrollDown(false);
    setSidebarOpen(false);
    autoFollowRef.current = true;
  }

  function commitRename(id: string) {
    const nextTitle = renameDraft.trim();
    setRenamingId(null);
    if (!nextTitle) return;
    setSavedConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: nextTitle.slice(0, 48), customTitle: true } : c)),
    );
  }

  function deleteConversation(id: string) {
    if (id === activeId) dictation.cancel();
    const remaining = displayConversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createEmptyConversation();
      setSavedConversations([fresh]);
      setActiveId(fresh.id);
      setPreviewState(null);
      writeStoredConversations([fresh], storageKey);
      return;
    }
    setSavedConversations(remaining);
    if (id === activeId) {
      setActiveId(remaining[0].id);
      setPreviewState(null);
    }
    writeStoredConversations(remaining, storageKey);
  }

  function adjustTextareaHeight(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }

  function clearAllConversations() {
    dictation.cancel();
    if (busy) stop();
    const fresh = createEmptyConversation();
    setSavedConversations([fresh]);
    setActiveId(fresh.id);
    setPreviewState(null);
    setShowScrollDown(false);
    setConfirmClearAll(false);
    setChatSearch('');
    writeStoredConversations([fresh], storageKey);
    showToast('Historial local limpiado');
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 80_000) {
      showToast('Archivo demasiado grande (máximo 80 KB)');
      return;
    }
    const text = await file.text();
    const clipped = text.length > 40_000 ? `${text.slice(0, 40_000)}\n/* ...truncado... */` : text;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
    const lang = EXT_TO_LANG[ext] ?? 'text';
    const sizeLabel = file.size >= 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`;
    setAttachedFile({ name: file.name, sizeLabel, lang, content: clipped });
    showToast(`Archivo adjunto: ${file.name}`);
  }

  function submitPrompt(text: string) {
    const clean = text.trim();
    if ((!clean && !attachedFile) || busy || dictation.phase !== 'idle') return;
    clearError();
    autoFollowRef.current = true;
    setShowScrollDown(false);
    const outgoing = attachedFile
      ? `${clean || 'Revisa y analiza este archivo:'}\n\n\`\`\`${attachedFile.lang}\n${attachedFile.content}\n\`\`\``
      : clean;
    sendMessage({ text: outgoing });
    setInput('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function submitEditedMessage(msgIndex: number) {
    const clean = editingDraft.trim();
    if (!clean || busy || dictation.phase !== 'idle') return;
    clearError();
    setEditingMsgId(null);
    setEditingDraft('');
    setMessages(messages.slice(0, msgIndex));
    sendMessage({ text: clean });
  }

  function toggleVoiceDictation() {
    setDictationError('');
    if (!userProfile) { showToast('Inicia sesión con Novvin para usar el dictado.'); openAuthModal(); return; }
    void dictation.toggle();
  }

  function exportConversationMarkdown() {
    if (messages.length === 0) return;
    const title = displayConversations.find((c) => c.id === activeId)?.title || 'conversacion-elara';
    const body = messages
      .map((m) => `## ${m.role === 'user' ? 'Usuario' : 'ELARA'}\n\n${extractMessageText(m)}`)
      .join('\n\n---\n\n');
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'elara-chat';
    downloadTextFile(`${slug}.md`, `# ${title}\n\n${body}\n`);
    showToast(`Exportado: ${slug}.md`);
  }

  function handleSaveProfile() { authEpochRef.current += 1; }
  async function handleSignOut() {
    if (authBusy) return;
    dictation.cancel();
    setAuthBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cerrar sesión.');
      authEpochRef.current += 1;
      if (busy) stop();
      window.location.reload();
    } finally { setAuthBusy(false); }
  }

  async function copyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 1600);
    } catch {
      showToast('No se pudo copiar. Selecciona el texto y cópialo con el menú del dispositivo.');
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



  return (
    <div ref={workspaceRef} className={`elara-ambient flex h-dvh w-full overflow-hidden bg-[var(--canvas)] text-[var(--ink)] ${resizing ? 'is-resizing' : ''}`}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/65 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        aria-label="Conversaciones"
        className={`fixed inset-y-0 left-0 z-30 flex w-[252px] xl:w-[268px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]/95 backdrop-blur-md transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <ElaraLogo size={28} />
            <div>
              <span className="block text-sm font-bold tracking-[0.08em] text-[var(--ink)]">ELARA</span>
              <span className="block text-[10px] text-[var(--muted)]">Un espacio para tus ideas</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)] lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--accent)]/55 hover:bg-[var(--hover)]"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4 text-[var(--accent)]" />
              Nuevo chat
            </span>
            <kbd className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-1">
          {displayConversations.length > 1 && (
            <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              <input
                type="search"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Buscar chats..."
                className="w-full bg-transparent text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-2 pb-1.5">
            <p className="text-xs font-medium text-[var(--muted)]">Conversaciones</p>
            {displayConversations.length > 1 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={clearAllConversations}
                    className="font-semibold text-[var(--danger)] hover:underline"
                  >
                    Sí, vaciar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--secondary)]"
                >
                  Limpiar
                </button>
              )
            )}
          </div>
          <div className="space-y-1">
            {filteredConversations.map((conv) => {
              const selected = conv.id === activeId;
              const isRenaming = renamingId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-colors ${
                    selected
                      ? 'border border-[var(--border)] bg-[var(--selected)] text-[var(--ink)]'
                      : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]'
                  }`}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(conv.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="w-full rounded-md border border-[var(--accent)]/60 bg-[var(--canvas)] px-2 py-0.5 text-xs text-[var(--ink)] focus:outline-none"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => selectConversation(conv)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-75" />
                        <span className="truncate">{conv.title}</span>
                      </button>
                      <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(conv.id);
                            setRenameDraft(conv.title);
                          }}
                          aria-label={`Renombrar ${conv.title}`}
                          className="rounded p-1 text-[var(--muted)] hover:text-[var(--accent)]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConversation(conv.id)}
                          aria-label={`Eliminar ${conv.title}`}
                          className="rounded p-1 text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5 border-t border-[var(--border)] p-3">
          {userProfile ? <>
            <button type="button" onClick={openAuthModal} className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left hover:border-[var(--accent)]" aria-label={`Perfil de ${userProfile.displayName}, conectado con Novvin`}>
              <NovvinAvatar key={userProfile.id} profile={userProfile} />
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--ink)]">{userProfile.displayName}</span><span className="novvin-connected mt-1"><NovvinLogo size={18} /> Conectado con Novvin</span></span>
            </button>
            <button type="button" onClick={() => { void handleSignOut().catch((caught) => showToast(caught instanceof Error ? caught.message : 'No se pudo cerrar sesión.')); }} disabled={authBusy} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-[var(--secondary)] hover:bg-[var(--hover)]">{authBusy ? <LoaderCircle size={14} className="animate-spin" /> : <LogOut size={14} />} {authBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          </> : <>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs">
              <div className="flex items-center justify-between text-[var(--secondary)]"><span className="font-medium">Modo invitado</span><span className="text-[11px] text-[var(--muted)]">Core gratis</span></div>
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">Sin límite en Core. Historial de invitado en este navegador.</p>
            </div>
            <button type="button" onClick={openAuthModal} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--hover)]">Iniciar sesión</button>
          </>}
        </div>
      </aside>

      {/* Main Conversation Column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="relative flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--canvas)]/85 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir conversaciones"
              className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--muted)] hover:text-[var(--ink)] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wider text-[var(--ink)] lg:hidden">ELARA</span>
              <button
                type="button"
                onClick={() => setEngineSheetOpen((v) => !v)}
                aria-expanded={engineSheetOpen}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--secondary)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--ink)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {health.label}
              </button>
            </div>
          </div>

          {engineSheetOpen && (
            <div className="absolute top-14 left-4 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                  <Cpu className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Estado del motor
                </span>
                <button
                  type="button"
                  onClick={() => setEngineSheetOpen(false)}
                  aria-label="Cerrar panel de motor"
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <dl className="mt-3 space-y-1.5 text-[var(--muted)]">
                <div className="flex justify-between">
                  <dt>Motor activo:</dt>
                  <dd className="font-mono text-[var(--accent)]">{health.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Contexto estable:</dt>
                  <dd className="text-[var(--ink)]">Hasta 40 turnos</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Tipo de asistente:</dt>
                  <dd className="text-[var(--success)]">Básico especializado</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">{health.mode === 'elara-core' ? 'Crea prototipos y resuelve utilidades concretas. No consulta internet ni tiene conocimientos generales completos. Si falta información, te lo dirá.' : 'Modelo conectado en el servidor. Comprueba los datos importantes y revisa el código generado.'}</p>
              <button
                type="button"
                onClick={() => {
                  setEngineSheetOpen(false);
                  if (userProfile) window.open(userProfile.novvinProfileUrl, '_blank', 'noopener,noreferrer');
                  else openAuthModal();
                }}
                className="mt-3 flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--accent)] hover:border-[var(--accent)]"
              >
                <span>{userProfile ? 'Mi perfil de Novvin' : 'Iniciar sesión'}</span>
                <ExternalLink className="h-3.5 w-3.5 text-[var(--accent)]" />
              </button>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <AppearanceControl />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={exportConversationMarkdown}
                title="Exportar conversación (.md)"
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Exportar .md</span>
              </button>
            )}
            {latestArtifact && (
              <button
                type="button"
                onClick={() =>
                  setPreviewState(previewState ? null : { id: latestArtifact.id, html: latestArtifact.html })
                }
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                <Code2 className="h-3.5 w-3.5" />
                {previewState ? 'Ocultar visor' : `Visor (${htmlArtifacts.length})`}
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
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center py-6 text-center welcome-space">
              <div className="welcome-mark">
                <ElaraLogo size={42} />
              </div>
              <h1 className="welcome-heading mt-5 font-semibold tracking-tight text-[var(--ink)]">
                {userProfile
                  ? `¿Qué creamos hoy, ${userProfile.displayName.split(' ')[0]}?`
                  : 'Una idea. Un buen comienzo.'}
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
                Crea una web, dale forma a tu código o resuelve algo concreto. Cuéntame qué tienes en mente y empezamos.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Categorías de sugerencias">
                {(Object.keys(PROMPT_CATALOG) as StarterCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={starterTab === cat}
                    onClick={() => setStarterTab(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      starterTab === cat
                        ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="starter-grid mt-5 grid w-full gap-3 sm:grid-cols-2">
                {PROMPT_CATALOG[starterTab].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitPrompt(prompt)}
                    className="group flex items-start gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 text-left text-sm text-[var(--secondary)] transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--hover)] hover:text-[var(--ink)]"
                  >
                    <Sparkles className="mt-0.6 h-4 w-4 shrink-0 text-[var(--accent)] opacity-80 group-hover:opacity-100" />
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
                          ? 'max-w-[85%] rounded-2xl border border-[var(--border)] bg-[var(--selected)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--ink)] shadow-sm'
                          : `min-w-0 flex-1 pt-0.5 ${busy && index === messages.length - 1 ? 'streaming-response' : ''}`
                      }
                    >
                      {isUser ? (
                        editingMsgId === message.id ? (
                          <div className="space-y-2">
                            <textarea
                              aria-label="Editar tu mensaje"
                              value={editingDraft}
                              onChange={(e) => setEditingDraft(e.target.value)}
                              rows={2}
                              className="w-full min-w-[220px] rounded-xl border border-[var(--accent)]/60 bg-[var(--canvas)] p-2 text-sm text-[var(--ink)] focus:outline-none sm:min-w-[340px]"
                            />
                            <div className="flex justify-end gap-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[var(--muted)] hover:text-[var(--ink)]"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => submitEditedMessage(index)}
                                className="rounded-lg bg-[var(--accent)] px-2.5 py-1 font-semibold text-[var(--on-accent)] hover:opacity-90"
                              >
                                Reenviar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="whitespace-pre-wrap break-words">{text}</p>
                            <div className="user-message-actions">
                              <button type="button" onClick={() => copyMessage(message.id, text)} aria-label="Copiar mi mensaje">{copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}{copiedMessageId === message.id ? 'Copiado' : 'Copiar'}</button>
                              {!busy && <button type="button" onClick={() => { setEditingMsgId(message.id); setEditingDraft(text); }} aria-label="Editar mensaje"><Pencil size={13} /> Editar</button>}
                            </div>

                          </div>
                        )
                      ) : (
                        <>
                          <MessageMarkdown
                            content={text}
                            onOpenPreview={(code) => {
                              const matchArt = htmlArtifacts.find(
                                (a) => a.html === code || extractAllHtmlArtifacts([message]).some((raw) => raw.id === a.id),
                              );
                              setPreviewState({ id: matchArt?.id || `${message.id}-v1`, html: matchArt?.html ?? code });
                            }}
                          />
                          {text && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)] opacity-85 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => copyMessage(message.id, text)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[var(--hover)] hover:text-[var(--secondary)]"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                {copiedMessageId === message.id ? 'Copiado' : 'Copiar'}
                              </button>
                              {isLastAssistant && (
                                <button
                                  type="button"
                                  onClick={() => regenerate()}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-[var(--hover)] hover:text-[var(--secondary)]"
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

              {busy && <div className="typing-indicator" role="status" aria-label={status === 'submitted' ? 'Elara está preparando la respuesta' : 'Elara está escribiendo'}><ElaraLogo size={26} /><TypingDots /><span>{status === 'submitted' ? 'Preparando tu respuesta' : 'Escribiendo'}</span></div>}

              {error && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]">
                  <div className="min-w-0 flex-1">
                    <strong className="font-semibold text-[var(--danger)]">No se pudo completar la respuesta:</strong>{' '}
                    <span className="break-words text-[var(--danger)]">{formatReadableError(error)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => regenerate()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--danger-bg)]"
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

        {showScrollDown && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              autoFollowRef.current = true;
              setShowScrollDown(false);
              endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Ir al último mensaje"
            className="absolute right-6 bottom-28 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/95 px-3 py-1.5 text-xs text-[var(--secondary)] shadow-lg backdrop-blur hover:border-[var(--accent)] hover:text-[var(--ink)]"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Bajar
          </button>
        )}

        {/* Composer */}
        <footer className="border-t border-[var(--border)] bg-[var(--canvas)]/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <div className="composer-container mx-auto max-w-3xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPrompt(input);
                }}
              >
                {attachedFile && (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--selected)] px-3 py-1.5 text-xs text-[var(--ink)]">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                      <span className="truncate font-mono">{attachedFile.name}</span>
                      <span className="shrink-0 text-[11px] text-[var(--muted)]">{attachedFile.sizeLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      aria-label="Quitar archivo adjunto"
                      className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="composer flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 focus-within:border-[var(--accent)]/70">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.css,.js,.mjs,.ts,.tsx,.jsx,.json,.py,.sql,.md,.txt"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Adjuntar archivo de código"
                      title="Adjuntar archivo de código (.html, .js, .py, .sql, .json...)"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--surface-2)] bg-[var(--surface-2)] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--ink)]"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submitPrompt(input);
                      }
                    }}
                    rows={1}
                    aria-label="Tu mensaje para Elara" maxLength={40000} placeholder="Cuéntame tu idea…"
                    className="max-h-40 min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-2.5 text-[15px] leading-5 text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none"
                  />
                  <ModelSelector value={modelPreferences} signedIn={Boolean(userProfile)} disabled={busy} onChange={(value) => { setModelPreferences(value); try { localStorage.setItem(storageKey + ':model', JSON.stringify(value)); } catch {} }} />
                  {!busy && (
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      disabled={dictation.phase === 'transcribing'}
                      aria-label={listening ? 'Detener dictado' : 'Dictar por voz'}
                      title={listening ? 'Detener dictado' : 'Dictar por voz'}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        listening
                          ? 'animate-pulse border-[var(--danger)]/60 bg-[var(--danger)]/15 text-[var(--danger)]'
                          : 'border-[var(--surface-2)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {dictation.phase === 'transcribing' || dictation.phase === 'permission' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  {busy ? (
                    <button
                      type="button"
                      onClick={() => stop()}
                      aria-label="Detener generación"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ink)] transition-colors hover:bg-[var(--hover)]"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={(!input.trim() && !attachedFile) || dictation.phase !== 'idle'}
                      aria-label="Enviar mensaje"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:from-[var(--border)] disabled:to-[var(--border)] disabled:text-[var(--muted)]"
                    >
                      <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
                {dictation.phase !== 'idle' && <p className="dictation-status" role="status">{listening ? `Grabando · 0:${String(dictation.seconds).padStart(2,'0')} · Pulsa el micrófono para terminar (máx. 30 s).` : dictation.phase === 'permission' ? 'Esperando permiso para usar el micrófono. Pulsa de nuevo para cancelar.' : 'Convirtiendo tu voz a texto en el servidor de Elara…'}{dictation.phase === 'transcribing' && <button type="button" onClick={dictation.cancel}>Cancelar</button>}</p>}
                {dictationError && <p className="dictation-status dictation-error" role="alert"><span>{dictationError}</span><button type="button" aria-label="Cerrar aviso del dictado" onClick={() => setDictationError('')}><X size={14} /></button></p>}
              </form>

            <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
              {health.label} · {userProfile ? `Sesión de @${userProfile.handle}` : 'Acceso libre'} · Verifica el código antes de producción.
            </p>
          </div>
        </footer>
      </div>

      {previewState && <div className="preview-resizer" role="separator" aria-label="Ajustar ancho del visor" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={1200} aria-valuenow={Math.round(previewWidth)} tabIndex={0}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true); }}
        onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const box = workspaceRef.current?.getBoundingClientRect(); if (!box) return; const available = box.width - (sidebarRef.current?.getBoundingClientRect().width || 0); setPreviewWidth(Math.max(320, Math.min(available - 320, box.right - event.clientX))); }}
        onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); }} onLostPointerCapture={() => setResizing(false)}
        onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const available = (workspaceRef.current?.clientWidth || 1200) - (sidebarRef.current?.clientWidth || 0); setPreviewWidth((width) => Math.max(320, Math.min(available - 320, width + (event.key === 'ArrowLeft' ? 24 : -24)))); } }}><span /></div>}

      {/* Live Preview Drawer */}
      {previewState && (
        <CodePreviewDrawer
          artifacts={htmlArtifacts}
          selectedId={previewState.id}
          width={previewWidth}
          onResetLayout={() => setPreviewWidth(520)}
          selectedHtml={previewState.html}
          onSelectHtml={(html, id) => {
            const art = htmlArtifacts.find((a) => a.html === html);
            setPreviewState({ id: id || art?.id || previewState.id, html });
          }}
          onUpdateHtml={(nextHtml) => {
            setEditedArtifacts((prev) => ({ ...prev, [previewState.id]: nextHtml }));
            setPreviewState((prev) => (prev ? { ...prev, html: nextHtml } : null));
          }}
          onFixErrorPrompt={(msg) => submitPrompt(msg)}
          onClose={() => setPreviewState(null)}
        />
      )}

      {/* Novvin / Profile Modal */}
      <NovvinAuthModal
        key={authModalKey}
        open={authModalOpen}
        existingProfile={userProfile}
        onSaveProfile={handleSaveProfile}
        onSignOut={handleSignOut}
        onClose={() => setAuthModalOpen(false)}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/95 px-4 py-1.5 text-xs font-medium text-[var(--accent)] shadow-xl backdrop-blur"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
