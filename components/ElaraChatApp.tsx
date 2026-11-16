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
  Server,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CodePreviewDrawer, type HtmlArtifactVersion } from './CodePreviewDrawer';
import { ElaraLogo } from './ElaraLogo';
import { downloadTextFile, MessageMarkdown } from './MessageMarkdown';
import { NovvinAuthModal, type ElaraUserProfile } from './NovvinAuthModal';

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

const STORAGE_KEY = 'elara_conversations_v1';
const PROFILE_KEY = 'elara_user_profile_v1';
const GUEST_COUNT_KEY = 'elara_guest_count_v1';
const GUEST_MESSAGE_LIMIT = 20;

type StarterCategory = 'Destacados' | 'Webs' | 'Apps' | 'Código' | 'Utilidades';

const PROMPT_CATALOG: Record<StarterCategory, string[]> = {
  Destacados: [
    'Genera una web de 20 juguetes de perritos',
    'Crea una web de 10 laptops gamer en color morado en soles',
    'Haz un gestor de tareas interactivo (To-Do) en index.html',
    'Diferencia entre Flexbox y CSS Grid con ejemplos',
  ],
  Webs: [
    'Genera un blog revista digital en tema claro color azul',
    'Crea un formulario de reserva y contacto en index.html',
    'Haz un login moderno en HTML con botón Continuar con Novvin',
    'Crea una web de 10 zapatillas y moda urbana en soles',
  ],
  Apps: [
    'Haz un gestor de tareas interactivo (To-Do) en index.html',
    'Crea un temporizador pomodoro interactivo',
    'Genera un quiz interactivo de programación',
    'Crea un generador de paletas de colores CSS',
  ],
  Código: [
    'Diferencia entre Flexbox y CSS Grid con ejemplos',
    'Expresiones regulares comunes en JavaScript y correo',
    'Resumen de métodos REST GET POST PUT PATCH y JWT',
    'Ejemplo de servidor FastAPI en Python básico',
  ],
  Utilidades: [
    'Convierte 25 km a millas',
    'Convierte color #38bdf8 a rgb',
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

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
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
  const [chatSearch, setChatSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewState, setPreviewState] = useState<{ id: string; html: string } | null>(null);
  const [editedArtifacts, setEditedArtifacts] = useState<Record<string, string>>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalKey, setAuthModalKey] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [listening, setListening] = useState(false);
  const [starterTab, setStarterTab] = useState<StarterCategory>('Destacados');
  const [attachedFile, setAttachedFile] = useState<AttachedCodeFile | null>(null);
  const [engineSheetOpen, setEngineSheetOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthInfo>({
    label: 'Elara Core v0.4',
    mode: 'elara-core',
    model: 'elara-core-v0.4',
  });

  const speechSupported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getSpeechRecognitionCtor()),
    () => false,
  );
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoFollowRef = useRef(true);

  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), []);
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
        setPreviewState(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const busy = status === 'submitted' || status === 'streaming';
  const htmlArtifacts = useMemo(() => {
    return extractAllHtmlArtifacts(messages).map((art) => ({
      ...art,
      html: editedArtifacts[art.id] ?? art.html,
    }));
  }, [messages, editedArtifacts]);
  const latestArtifact = htmlArtifacts[htmlArtifacts.length - 1] ?? null;
  const guestLimitReached = !userProfile && guestUsed >= GUEST_MESSAGE_LIMIT;
  const filteredConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return displayConversations;
    return displayConversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [displayConversations, chatSearch]);

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
    setPreviewState(null);
    setEditingMsgId(null);
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
    setPreviewState(null);
    setEditingMsgId(null);
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
    const remaining = displayConversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createEmptyConversation();
      setSavedConversations([fresh]);
      setActiveId(fresh.id);
      setPreviewState(null);
      writeStoredConversations([fresh]);
      return;
    }
    setSavedConversations(remaining);
    if (id === activeId) {
      setActiveId(remaining[0].id);
      setPreviewState(null);
    }
    writeStoredConversations(remaining);
  }

  function adjustTextareaHeight(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function recordGuestUsageAndCheck(): boolean {
    if (!userProfile && guestUsed >= GUEST_MESSAGE_LIMIT) {
      openAuthModal();
      return false;
    }
    if (!userProfile) {
      const nextCount = guestUsed + 1;
      setGuestUsed(nextCount);
      try {
        window.localStorage.setItem(GUEST_COUNT_KEY, String(nextCount));
      } catch {
        // Ignore storage write error.
      }
    }
    return true;
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }

  function clearAllConversations() {
    if (busy) stop();
    const fresh = createEmptyConversation();
    setSavedConversations([fresh]);
    setActiveId(fresh.id);
    setPreviewState(null);
    setConfirmClearAll(false);
    setChatSearch('');
    writeStoredConversations([fresh]);
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
    if ((!clean && !attachedFile) || busy) return;
    if (!recordGuestUsageAndCheck()) return;
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
    if (!clean || busy) return;
    if (!recordGuestUsageAndCheck()) return;
    clearError();
    setEditingMsgId(null);
    setEditingDraft('');
    setMessages(messages.slice(0, msgIndex));
    sendMessage({ text: clean });
  }

  function toggleVoiceDictation() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'es-PE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput((prev) => {
          const joined = prev ? `${prev.trimEnd()} ${transcript}` : transcript;
          requestAnimationFrame(() => adjustTextareaHeight(textareaRef.current));
          return joined;
        });
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
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
        className={`fixed inset-y-0 left-0 z-30 flex w-[252px] xl:w-[268px] shrink-0 flex-col border-r border-[#1B2436] bg-[#0B0F18]/95 backdrop-blur-md transition-transform duration-200 lg:static lg:translate-x-0 ${
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
          {displayConversations.length > 1 && (
            <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-[#1B2436] bg-[#080B13] px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
              <input
                type="search"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Buscar chats..."
                className="w-full bg-transparent text-xs text-white placeholder-[#64748B] focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-2 pb-1.5">
            <p className="text-xs font-medium text-[#64748B]">Conversaciones</p>
            {displayConversations.length > 1 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={clearAllConversations}
                    className="font-semibold text-[#FCA5A5] hover:underline"
                  >
                    Sí, vaciar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-[#94A3B8] hover:text-white"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-[11px] text-[#64748B] hover:text-[#CBD5E1]"
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
                      ? 'border border-[#24324D] bg-[#151E30] text-white'
                      : 'text-[#94A3B8] hover:bg-[#111725] hover:text-[#E2E8F0]'
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
                      className="w-full rounded-md border border-[#38BDF8]/60 bg-[#080B13] px-2 py-0.5 text-xs text-white focus:outline-none"
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
                      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(conv.id);
                            setRenameDraft(conv.title);
                          }}
                          aria-label={`Renombrar ${conv.title}`}
                          className="rounded p-1 text-[#64748B] hover:text-[#38BDF8]"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteConversation(conv.id)}
                          aria-label={`Eliminar ${conv.title}`}
                          className="rounded p-1 text-[#64748B] hover:text-[#F87171]"
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
        <header className="relative flex items-center justify-between gap-2 border-b border-[#1B2436] bg-[#06080E]/85 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2.5">
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
              <button
                type="button"
                onClick={() => setEngineSheetOpen((v) => !v)}
                aria-expanded={engineSheetOpen}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#222E46] bg-[#0F1522] px-3 py-1 text-xs text-[#CBD5E1] transition-colors hover:border-[#38BDF8]/60 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                {health.label}
              </button>
            </div>
          </div>

          {engineSheetOpen && (
            <div className="absolute top-14 left-4 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#24324D] bg-[#0E1422] p-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Cpu className="h-3.5 w-3.5 text-[#38BDF8]" />
                  Estado del motor
                </span>
                <button
                  type="button"
                  onClick={() => setEngineSheetOpen(false)}
                  aria-label="Cerrar panel de motor"
                  className="rounded p-1 text-[#94A3B8] hover:bg-[#192235] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <dl className="mt-3 space-y-1.5 text-[#94A3B8]">
                <div className="flex justify-between">
                  <dt>Motor activo:</dt>
                  <dd className="font-mono text-[#7DD3FC]">{health.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Contexto estable:</dt>
                  <dd className="text-[#E2E8F0]">Hasta 40 turnos</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Protección crisis:</dt>
                  <dd className="text-[#4ADE80]">Activa (113 / 106)</dd>
                </div>
              </dl>
              <div className="mt-3 rounded-xl border border-[#1E2A42] bg-[#090D16] p-2.5 text-[11px] leading-relaxed text-[#94A3B8]">
                <span className="inline-flex items-center gap-1 font-medium text-[#CBD5E1]">
                  <Server className="h-3 w-3 text-[#38BDF8]" />
                  Conectar servidor propio
                </span>
                <p className="mt-1">
                  Define <code className="font-mono text-[#7DD3FC]">ELARA_UPSTREAM_URL</code> en Vercel apuntando a tu servidor GPU en Ubuntu cuando quieras reemplazar el núcleo local por un modelo completo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEngineSheetOpen(false);
                  openAuthModal();
                }}
                className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#283B5E] bg-[#131C2E] px-3 py-2 text-xs font-medium text-[#E0F2FE] hover:border-[#38BDF8]"
              >
                <span>{userProfile ? `Perfil Novvin (@${userProfile.handle})` : 'Continuar con Novvin'}</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#38BDF8]" />
              </button>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={exportConversationMarkdown}
                title="Exportar conversación (.md)"
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#1E2A42] bg-[#0F1522] px-2.5 py-1.5 text-xs text-[#94A3B8] transition-colors hover:border-[#38BDF8]/50 hover:text-white"
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
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#284261] bg-[#101C2E] px-2.5 py-1.5 text-xs font-medium text-[#7DD3FC] transition-colors hover:border-[#38BDF8] hover:text-white"
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
                Pídeme generar una página web, app interactiva (`index.html`), adjuntar un archivo de código para revisarlo o resolver utilidades al instante.
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
                        ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-[#7DD3FC]'
                        : 'border-[#1E2A42] bg-[#0D1320] text-[#94A3B8] hover:border-[#2E4166] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid w-full gap-2.5 sm:grid-cols-2">
                {PROMPT_CATALOG[starterTab].map((prompt) => (
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
                        editingMsgId === message.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingDraft}
                              onChange={(e) => setEditingDraft(e.target.value)}
                              rows={2}
                              className="w-full min-w-[220px] rounded-xl border border-[#38BDF8]/60 bg-[#080C14] p-2 text-sm text-white focus:outline-none sm:min-w-[340px]"
                            />
                            <div className="flex justify-end gap-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="rounded-lg border border-[#25334D] px-2.5 py-1 text-[#94A3B8] hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => submitEditedMessage(index)}
                                className="rounded-lg bg-[#38BDF8] px-2.5 py-1 font-semibold text-[#061018] hover:opacity-90"
                              >
                                Reenviar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="whitespace-pre-wrap">{text}</p>
                            {!busy && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsgId(message.id);
                                  setEditingDraft(text);
                                }}
                                aria-label="Editar mensaje"
                                title="Editar y reenviar"
                                className="mt-0.5 shrink-0 rounded p-1 text-[#64748B] opacity-0 transition-opacity hover:bg-[#1C2A44] hover:text-white group-hover:opacity-100"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
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
                {attachedFile && (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-[#283B5E] bg-[#101829] px-3 py-1.5 text-xs text-[#E2E8F0]">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
                      <span className="truncate font-mono">{attachedFile.name}</span>
                      <span className="shrink-0 text-[11px] text-[#64748B]">{attachedFile.sizeLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      aria-label="Quitar archivo adjunto"
                      className="rounded p-0.5 text-[#94A3B8] hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border border-[#222F47] bg-[#0E1421] p-2 shadow-inner focus-within:border-[#38BDF8]/70">
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
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#212D44] bg-[#131A29] text-[#94A3B8] transition-colors hover:border-[#38BDF8]/50 hover:text-white"
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
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitPrompt(input);
                      }
                    }}
                    rows={1}
                    placeholder="Pide una web, código o consulta..."
                    className="max-h-40 min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-2.5 text-[15px] leading-5 text-white placeholder-[#64748B] focus:outline-none"
                  />
                  {speechSupported && !busy && (
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      aria-label={listening ? 'Detener dictado' : 'Dictar por voz'}
                      title={listening ? 'Detener dictado' : 'Dictar por voz'}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        listening
                          ? 'animate-pulse border-[#F43F5E]/60 bg-[#F43F5E]/15 text-[#FDA4AF]'
                          : 'border-[#212D44] bg-[#131A29] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
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
                      disabled={!input.trim() && !attachedFile}
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
      {previewState && (
        <CodePreviewDrawer
          artifacts={htmlArtifacts}
          selectedHtml={previewState.html}
          onSelectHtml={(html) => {
            const art = htmlArtifacts.find((a) => a.html === html);
            setPreviewState({ id: art?.id || previewState.id, html });
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
        limitReached={guestLimitReached}
        guestUsed={guestUsed}
        guestLimit={GUEST_MESSAGE_LIMIT}
        existingProfile={userProfile}
        onSaveProfile={handleSaveProfile}
        onSignOut={handleSignOut}
        onClose={() => setAuthModalOpen(false)}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#2B3D5E] bg-[#11192A]/95 px-4 py-1.5 text-xs font-medium text-[#E0F2FE] shadow-xl backdrop-blur"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
