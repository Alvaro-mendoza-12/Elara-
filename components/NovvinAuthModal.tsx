'use client';

import { ArrowLeft, ArrowUpRight, LoaderCircle, LogIn, LogOut, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ElaraLogo } from './ElaraLogo';
import { NovvinAvatar, NovvinLogo } from './NovvinIdentity';
import { NOVVIN_REGISTER_URL } from '@/lib/novvin-profile';

export interface ElaraUserProfile {
  id: string; email: string; displayName: string; handle: string; focus: string; avatarColor: string;
  avatarUrl: string | null; avatarKind: 'image' | 'video'; novvinProfileUrl: string; linkedMethod: 'novvin-session'; createdAt: number;
}

export function NovvinAuthModal({ open, existingProfile, onSaveProfile, onSignOut, onClose }: {
  open: boolean; existingProfile: ElaraUserProfile | null;
  onSaveProfile: (profile: ElaraUserProfile) => void;
  onSignOut: () => Promise<void>; onClose: () => void;
}) {
  const [stage, setStage] = useState<'choice' | 'login'>('choice');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  if (!open) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.requiresTwoFactor) setTwoFactor(true);
        throw new Error(data.error || 'No se pudo iniciar sesión.');
      }
      onSaveProfile(data.profile);
      window.location.reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Comprueba tu conexión.'); setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { await onSignOut(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cerrar sesión.'); setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={(e) => { if (busy) e.preventDefault(); else onClose(); }} onClick={(e) => { if (e.target === dialog.current && !busy) onClose(); }} className="auth-dialog">
    <div className="auth-content">
      <button type="button" onClick={onClose} aria-label="Cerrar ventana" className="auth-close" disabled={busy}><X size={20} /></button>
      {existingProfile ? <div className="auth-profile-heading"><NovvinAvatar profile={existingProfile} size={56} /><NovvinLogo size={32} /></div> : <ElaraLogo size={48} />}
      <h2>{existingProfile ? existingProfile.displayName : stage === 'choice' ? 'Tu espacio, a tu manera.' : 'Inicia sesión con Novvin'}</h2>
      <p className="auth-description">{existingProfile ? existingProfile.email || `@${existingProfile.handle}` : stage === 'choice' ? 'Puedes empezar como invitado o conectar tu cuenta de Novvin.' : 'Introduce el correo y la contraseña que ya usas en Novvin.'}</p>
      {existingProfile ? <div className="auth-profile">
        <p><ShieldCheck size={18} /> Conectado con Novvin</p>
        <a className="auth-secondary" href={existingProfile.novvinProfileUrl} target="_blank" rel="noreferrer"><NovvinLogo size={24} /> Ver mi perfil de Novvin <ArrowUpRight size={16} /></a>
        <p className="auth-description">Tus conversaciones se guardan en este navegador. Puedes exportarlas desde el chat.</p>
        <button type="button" className="auth-secondary" onClick={signOut} disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <LogOut size={18} />} {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
      </div> : stage === 'choice' ? <div className="auth-choices">
        <button className="auth-primary" type="button" onClick={() => setStage('login')}><NovvinLogo size={26} /> Iniciar con Novvin</button>
        <button className="auth-secondary" type="button" onClick={onClose}><UserRound size={18} /> Continuar como invitado</button>
        <p className="auth-description">¿Aún no tienes cuenta? <a href={NOVVIN_REGISTER_URL} target="_blank" rel="noreferrer">Crear una cuenta en Novvin <ArrowUpRight className="inline" size={13} /></a></p>
      </div> : <>
        <div className="auth-provider"><NovvinLogo size={32} /><span>Conecta tu identidad de Novvin</span></div>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="auth-email">Correo de Novvin<input id="auth-email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="tu@correo.com" autoFocus disabled={busy} /></label>
          <label htmlFor="auth-password">Contraseña<input id="auth-password" name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={256} disabled={busy} /></label>
          {twoFactor && <label htmlFor="auth-factor">Código de verificación o respaldo<input id="auth-factor" name="secondFactor" autoComplete="one-time-code" required maxLength={100} disabled={busy} /></label>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button className="auth-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}{busy ? 'Verificando tu cuenta…' : 'Iniciar sesión con Novvin'}</button>
          <a className="auth-recovery" href="https://novvinapp.com/login" target="_blank" rel="noreferrer">Recuperar mi acceso en Novvin <ArrowUpRight size={14} /></a>
          <p className="auth-description">¿Aún no tienes cuenta? <a href={NOVVIN_REGISTER_URL} target="_blank" rel="noreferrer">Crear una cuenta en Novvin</a></p>
          <button className="auth-switch inline-flex items-center justify-center gap-2" type="button" disabled={busy} onClick={() => { setStage('choice'); setError(''); }}><ArrowLeft size={14} /> Volver</button>
        </form>
      </>}
      {existingProfile && error && <p className="auth-error mt-4" role="alert">{error}</p>}
    </div>
  </dialog>;
}
