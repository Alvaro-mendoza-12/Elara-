'use client';

import { Contrast, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APPEARANCE_KEY, readAppearance, type Appearance } from '@/lib/appearance';

export function AppearanceControl() {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    try { return readAppearance(localStorage.getItem(APPEARANCE_KEY)); } catch { return readAppearance(null); }
  });
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'blocked'>('idle');
  const [avatarMotion, setAvatarMotion] = useState(() => { try { return localStorage.getItem('elara_avatar_motion') || 'system'; } catch { return 'system'; } });
  function updateAppearance(next: Appearance) {
    // Persist in the action itself so navigation cannot race a later effect.
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); setSaveState('saved'); }
    catch { setSaveState('blocked'); }
    setAppearance(next);
  }
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = appearance.mode === 'system' ? (media.matches ? 'dark' : 'light') : appearance.mode;
      document.documentElement.dataset.contrast = appearance.contrast ? 'high' : 'normal';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance]);

  return <details className="appearance-control">
    <summary role="button" aria-label="Apariencia" title="Apariencia"><SunMoon size={17} /><span className="sr-only">Apariencia</span></summary>
    <div className="appearance-panel">
      <fieldset><legend>Apariencia</legend>
        {([{ mode: 'system', label: 'Usar la del dispositivo', icon: Monitor }, { mode: 'light', label: 'Modo claro', icon: Sun }, { mode: 'dark', label: 'Modo oscuro', icon: Moon }] as const).map(({ mode, label, icon: Icon }) =>
          <label key={mode}><Icon size={16} /><span>{label}</span><input type="radio" aria-label={label} name="appearance" value={mode} checked={appearance.mode === mode} onChange={() => updateAppearance({ ...appearance, mode })} /></label>,
        )}
      </fieldset>
      <label className="contrast-option"><Contrast size={17} /><span>Mayor contraste</span><input type="checkbox" aria-label="Mayor contraste" checked={appearance.contrast} onChange={(event) => updateAppearance({ ...appearance, contrast: event.target.checked })} /></label>
      <label className="avatar-motion-option"><span>Videos de perfil</span><select aria-label="Animación de videos de perfil" value={avatarMotion} onChange={(event) => { const value = event.target.value; setAvatarMotion(value); try { localStorage.setItem('elara_avatar_motion', value); setSaveState('saved'); window.dispatchEvent(new Event('elara-avatar-motion')); } catch { setSaveState('blocked'); } }}><option value="system">Dispositivo</option><option value="on">Activados</option><option value="off">Pausados</option></select></label>
      <p className="mt-3 text-[11px] text-[var(--muted)]" role="status">{saveState === 'blocked' ? 'Este navegador no permite guardar la preferencia.' : saveState === 'saved' ? 'Preferencia guardada en este navegador.' : 'Solo cambia la apariencia de Elara.'}</p>
    </div>
  </details>;
}
