export interface NovvinUser {
  id: string; displayName?: string; username?: string; email?: string;
  avatarUrl?: string | null; avatarMediaType?: string | null; supabaseUserId?: string | null;
}
export const NOVVIN_REGISTER_URL = 'https://novvinapp.com/register';

export function avatarStoragePath(raw: string | null | undefined): string | null {
  try {
    const source = (raw || '').trim().replace(/^\/?avatars\//, '/storage/v1/object/public/avatars/');
    const parsed = new URL(source, 'https://novvinapp.com');
    if (parsed.username || parsed.password) return null;
    // Always resolve legacy storage URLs on the existing Novvin gateway. Never
    // request an arbitrary avatar host or forward a credential to that host.
    if (parsed.pathname.startsWith('/avatars/')) parsed.pathname = '/storage/v1/object/public' + parsed.pathname;
    const path = decodeURIComponent(parsed.pathname);
    if (!/^\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?avatars\//.test(path) || path.includes('..') || path.includes('\\')) return null;
    return parsed.pathname.replace(/\/object\/(?:sign|authenticated)\//, '/object/public/');
  } catch { return null; }
}

export function publicProfile(user: NovvinUser) {
  const avatarPath = avatarStoragePath(user.avatarUrl);
  const videoAvatar = user.avatarMediaType?.startsWith('video') || /\.(mp4|webm|mov|m4v|ogg|ogv)(?:[?#]|$)/i.test(user.avatarUrl || '');
  let revision = 0;
  for (const character of avatarPath || '') revision = (Math.imul(revision, 31) + character.charCodeAt(0)) >>> 0;
  return {
    id: user.id, email: user.email || '',
    displayName: user.displayName || user.username || 'Usuario de Novvin',
    handle: user.username || user.id.slice(0, 8), avatarColor: '#7862d9',
    avatarUrl: avatarPath ? `/api/auth/avatar?owner=${encodeURIComponent(user.id)}&v=${revision.toString(36)}` : null,
    novvinProfileUrl: `https://novvinapp.com/u/${encodeURIComponent(user.supabaseUserId || user.id)}`,
    avatarKind: videoAvatar ? 'video' as const : 'image' as const,
    linkedMethod: 'novvin-session' as const, createdAt: 0, focus: 'Uso general',
  };
}
