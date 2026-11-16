'use client';

import { useState, useRef, useEffect } from 'react';
import type { ElaraUserProfile } from './NovvinAuthModal';

export function NovvinLogo({ size = 24 }: { size?: number }) {
  // The original first-party brand asset, shared by the official Novvin website.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/novvin-logo.png" width={size} height={size} alt="Novvin" className="novvin-brand" />;
}

export function NovvinAvatar({ profile, size = 36 }: { profile: ElaraUserProfile; size?: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const element = video.current;
      if (!element) return;
      let override: string | null = null;
      try { override = localStorage.getItem('elara_avatar_motion'); } catch {}
      if (override === 'on' || (override !== 'off' && !preference.matches)) void element.play().catch(() => {});
      else {
        element.pause();
        if (element.readyState >= 1) element.currentTime = Math.min(.25, element.duration / 2 || .25);
      }
    };
    const element = video.current;
    element?.addEventListener('loadedmetadata', apply);
    apply(); preference.addEventListener('change', apply);
    window.addEventListener('elara-avatar-motion', apply);
    window.addEventListener('storage', apply);
    return () => { preference.removeEventListener('change', apply); element?.removeEventListener('loadedmetadata', apply); window.removeEventListener('elara-avatar-motion', apply); window.removeEventListener('storage', apply); };
  }, [profile.avatarUrl, profile.avatarKind]);
  return <span className="novvin-avatar" style={{ width: size, height: size, backgroundColor: profile.avatarColor }}>
    {profile.avatarUrl && failedUrl !== profile.avatarUrl ? profile.avatarKind === 'video' ?
      <video ref={video} src={profile.avatarUrl} aria-label={`Avatar animado de ${profile.displayName} en Novvin`} muted loop playsInline preload="auto" onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 12) event.currentTarget.currentTime = 0; }} onError={() => setFailedUrl(profile.avatarUrl || null)} /> :
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatarUrl} alt={`Foto de ${profile.displayName} en Novvin`} width={size} height={size} onError={() => setFailedUrl(profile.avatarUrl || null)} /> :
      <span aria-label={`Perfil de ${profile.displayName}`}>{profile.displayName.slice(0, 2).toUpperCase()}</span>}
  </span>;
}
