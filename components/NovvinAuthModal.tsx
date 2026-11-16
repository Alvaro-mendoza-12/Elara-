'use client';

import { ArrowRight, CheckCircle2, Sparkles, User, X } from 'lucide-react';
import { useState } from 'react';

export interface ElaraUserProfile {
  displayName: string;
  handle: string;
  focus: string;
  avatarColor: string;
  linkedMethod: 'novvin-local-profile';
  createdAt: number;
}

const AVATAR_COLORS = ['#38BDF8', '#818CF8', '#34D399', '#F59E0B', '#FB7185', '#A78BFA'];

const FOCUS_OPTIONS = ['Desarrollo Web / Código', 'Creador en Novvin', 'Estudios e Investigación', 'Uso general'];

function toHandleSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export function NovvinAuthModal({
  open,
  limitReached,
  guestUsed,
  guestLimit,
  existingProfile,
  onSaveProfile,
  onSignOut,
  onClose,
}: {
  open: boolean;
  limitReached: boolean;
  guestUsed: number;
  guestLimit: number;
  existingProfile: ElaraUserProfile | null;
  onSaveProfile: (profile: ElaraUserProfile) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'choice' | 'profile'>(existingProfile ? 'profile' : 'choice');
  const [displayName, setDisplayName] = useState(existingProfile?.displayName ?? '');
  const [handle, setHandle] = useState(existingProfile?.handle ?? '');
  const [focus, setFocus] = useState(existingProfile?.focus ?? FOCUS_OPTIONS[0]);
  const [avatarColor, setAvatarColor] = useState(existingProfile?.avatarColor ?? AVATAR_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  function handleNameChange(value: string) {
    const clean = value.slice(0, 40);
    setDisplayName(clean);
    if (!existingProfile && (!handle || handle === toHandleSlug(displayName))) {
      setHandle(toHandleSlug(clean));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanHandle = toHandleSlug(handle || cleanName);
    if (cleanName.length < 2) {
      setFormError('Escribe tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (cleanHandle.length < 2) {
      setFormError('El @usuario debe tener al menos 2 letras o números.');
      return;
    }
    onSaveProfile({
      displayName: cleanName,
      handle: cleanHandle,
      focus,
      avatarColor,
      linkedMethod: 'novvin-local-profile',
      createdAt: existingProfile?.createdAt ?? Date.now(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#24314A] bg-[#0F1522] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#38BDF8]/15 text-[#38BDF8]">
              {step === 'choice' ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </span>
            <h2 className="text-lg font-semibold text-white">
              {step === 'choice'
                ? limitReached
                  ? 'Límite gratuito alcanzado'
                  : 'Continuar con Novvin'
                : existingProfile
                  ? 'Tu perfil en ELARA'
                  : 'Crea tu nombre y perfil'}
            </h2>
          </div>
          {!limitReached && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#192234] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {step === 'choice' ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-relaxed text-[#94A3B8]">
              {limitReached ? (
                <>
                  Usaste tus <strong className="text-white">{guestLimit} mensajes gratuitos</strong> de acceso libre. Crea tu perfil para continuar sin límite.
                </>
              ) : (
                <>
                  Llevas <strong className="text-white">{guestUsed} de {guestLimit}</strong> mensajes en acceso libre. Si creas tu perfil ahora desbloqueas mensajes ilimitados y personalizas tu identidad en ELARA.
                </>
              )}
            </p>

            <div className="rounded-xl border border-[#1E2A42] bg-[#0B101A] p-3.5 text-xs leading-relaxed text-[#94A3B8]">
              <p className="font-medium text-[#E2E8F0]">Acceso conectado con Novvin (novvinapp.com)</p>
              <p className="mt-1">
                Al pulsar continuar configurarás tu nombre y <code className="font-mono text-[#7DD3FC]">@usuario</code> listo para vincularse con la app móvil de Novvin.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep('profile')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#818CF8] px-4 py-2.5 text-sm font-semibold text-[#061018] transition-opacity hover:opacity-95"
              >
                Continuar y crear tu nombre
                <ArrowRight className="h-4 w-4" />
              </button>

              {!limitReached && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-[#232F46] bg-[#131B2A] px-4 py-2.5 text-sm font-medium text-[#CBD5E1] hover:border-[#38BDF8]/40 hover:text-white"
                >
                  Seguir en acceso libre ({guestLimit - guestUsed} restantes)
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#CBD5E1]">Tu nombre</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Álvaro Mendoza"
                required
                className="w-full rounded-xl border border-[#23304A] bg-[#080C14] px-3.5 py-2.5 text-sm text-white placeholder-[#64748B] focus:border-[#38BDF8] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#CBD5E1]">Nombre de usuario</label>
              <div className="flex items-center rounded-xl border border-[#23304A] bg-[#080C14] px-3.5 py-2.5 focus-within:border-[#38BDF8]">
                <span className="mr-1 font-mono text-sm text-[#64748B]">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(toHandleSlug(e.target.value))}
                  placeholder="alvaro"
                  required
                  className="w-full bg-transparent font-mono text-sm text-white placeholder-[#64748B] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#CBD5E1]">¿Para qué usarás ELARA?</label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full rounded-xl border border-[#23304A] bg-[#080C14] px-3 py-2.5 text-sm text-white focus:border-[#38BDF8] focus:outline-none"
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-[#CBD5E1]">Color de perfil</span>
              <div className="flex items-center gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      avatarColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0F1522]' : 'opacity-75 hover:opacity-100'
                    }`}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>

            {existingProfile && (
              <div className="rounded-xl border border-[#1E2A42] bg-[#0B101A] p-3 text-xs text-[#94A3B8]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#E2E8F0]">Sesiones vinculadas con Novvin</span>
                  <span className="rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-medium text-[#4ADE80]">
                    1 activa
                  </span>
                </div>
                <p className="mt-1.5 flex items-center justify-between text-[11px] text-[#CBD5E1]">
                  <span>ELARA Studio (Este navegador)</span>
                  <span className="font-mono text-[#7DD3FC]">@{existingProfile.handle}</span>
                </p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  En la fase móvil con novvinapp.com podrás ver y cerrar sesiones en otros sitios desde tu teléfono.
                </p>
              </div>
            )}

            {formError && <p className="text-xs text-[#FCA5A5]">{formError}</p>}

            <div className="flex items-center justify-between gap-2 pt-2">
              {existingProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="rounded-xl border border-[#3B232B] px-3 py-2 text-xs font-medium text-[#FCA5A5] hover:bg-[#3B232B]/40"
                >
                  Salir a modo invitado
                </button>
              ) : !limitReached ? (
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  className="rounded-xl px-3 py-2 text-xs text-[#94A3B8] hover:text-white"
                >
                  Volver
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#818CF8] px-4 py-2 text-sm font-semibold text-[#061018] hover:opacity-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                {existingProfile ? 'Guardar cambios' : 'Crear perfil y continuar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
