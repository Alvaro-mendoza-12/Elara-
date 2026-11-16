'use client';

import { ArrowUpRight, Check, LoaderCircle, LogOut, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ElaraLogo } from './ElaraLogo';

export interface ElaraUserProfile {
  displayName: string; handle: string; focus: string; avatarColor: string;
  linkedMethod: 'novvin-session'; createdAt: number;
}

export function NovvinAuthModal({ open, existingProfile, onSaveProfile, onSignOut, onClose }: {
  open: boolean; limitReached: boolean; guestUsed: number; guestLimit: number;
  existingProfile: ElaraUserProfile | null;
  onSaveProfile: (profile: ElaraUserProfile) => void;
  onSignOut: () => void; onClose: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.requiresTwoFactor) setTwoFactor(true);
        throw new Error(data.error || 'No se pudo iniciar sesión.');
      }
      onSaveProfile(data.profile); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Comprueba tu conexión.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onSignOut(); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo cerrar sesión.'); }
    finally { setBusy(false); }
  }
  return (
    <dialog ref={dialog} onCancel={(e) => { if (busy) e.preventDefault(); else onClose(); }} onClick={(e) => { if (e.target === dialog.current && !busy) onClose(); }} className="auth-dialog">
      <div className="auth-content">
        <button type="button" onClick={onClose} aria-label="Cerrar ventana" className="auth-close" disabled={busy}><X size={20} /></button>
        <ElaraLogo size={48} />
        <h2>{existingProfile ? `Hola, ${existingProfile.displayName}` : mode === 'login' ? 'Tu cuenta de Novvin, en Elara.' : 'Crea tu cuenta de Novvin'}</h2>
        <p className="auth-description">{existingProfile ? `Conectado como @${existingProfile.handle}. Esta sesión se verifica con Novvin.` : 'Usa el mismo correo y contraseña de tu red social para continuar.'}</p>
        {existingProfile ? (
          <div className="auth-profile">
            <p><ShieldCheck size={18} /> Sesión de Novvin verificada</p>
            <p className="auth-description">Las conversaciones se guardan en este navegador. Exporta las que quieras conservar antes de cambiar de equipo.</p>
            <button type="button" className="auth-primary" onClick={signOut} disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <LogOut size={18} />} Cerrar sesión</button>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <>
              <label htmlFor="auth-name">Tu nombre<input id="auth-name" name="displayName" required minLength={2} maxLength={20} autoComplete="name" /></label>
              <label htmlFor="auth-username">Nombre de usuario<input id="auth-username" name="username" required pattern="[a-zA-Z0-9_]{3,20}" minLength={3} maxLength={20} autoComplete="username" placeholder="ejemplo_usuario" /></label>
            </>}
            <label htmlFor="auth-email">Correo de Novvin<input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" autoFocus /></label>
            <label htmlFor="auth-password">Contraseña<input id="auth-password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : 1} maxLength={256} /></label>
            {twoFactor && <label htmlFor="auth-factor">Código de verificación o respaldo<input id="auth-factor" name="secondFactor" autoComplete="one-time-code" required maxLength={100} /></label>}
            {mode === 'register' && <p className="auth-description">Crearás una cuenta real compartida con Novvin. Consulta su <a href="https://novvinapp.com/privacidad" target="_blank" rel="noreferrer">privacidad</a>.</p>}
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button className="auth-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <Check size={18} />}{busy ? 'Verificando…' : mode === 'login' ? 'Iniciar sesión con Novvin' : 'Crear cuenta y continuar'}</button>
            <button className="auth-switch" type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setTwoFactor(false); }}>{mode === 'login' ? '¿Aún no tienes cuenta? Crear una cuenta' : 'Ya tengo cuenta. Iniciar sesión'}</button>
            <a className="auth-recovery" href="https://novvinapp.com/login" target="_blank" rel="noreferrer">Recuperar mi acceso en Novvin <ArrowUpRight size={14} /></a>
          </form>
        )}
        {existingProfile && error && <p className="auth-error" role="alert">{error}</p>}
      </div>
    </dialog>
  );
}
