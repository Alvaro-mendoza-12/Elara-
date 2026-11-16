import { cookies } from 'next/headers';
import { openSession, sealSession } from './session-crypto';
import type { NovvinUser } from './novvin-profile';
export { publicProfile } from './novvin-profile';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-elara-session' : 'elara-session';
const BACKEND_COOKIE = '__Secure-novvin-web-session';
const TTL = 30 * 24 * 60 * 60;
type Session = { refresh: string; expires: number };


export function authConfigured() { return (process.env.ELARA_SESSION_SECRET?.length ?? 0) >= 32; }

export function trustedMutation(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || req.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.headers.get('host') &&
      (parsed.protocol === 'https:' || process.env.NODE_ENV !== 'production');
  } catch { return false; }
}

export async function novvinFetch(path: string, body?: unknown, refresh?: string, method = 'POST', accessToken?: string, timeoutMs = 15_000, extraHeaders: Record<string, string> = {}, signal?: AbortSignal) {
  const base = new URL(process.env.NOVVIN_API_URL || 'https://conectate.tail9b267c.ts.net');
  if (base.protocol !== 'https:') throw new Error('Novvin requiere HTTPS.');
  return fetch(new URL(path, base), {
    method, cache: 'no-store', signal: AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])]), redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      // This BFF speaks the existing first-party web session contract.
      Origin: 'https://novvinapp.com',
      'x-novvin-web-session': 'web-v1',
      'User-Agent': 'ELARA Web / Novvin integration',
      ...extraHeaders,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(refresh ? { Cookie: `${BACKEND_COOKIE}=${encodeURIComponent(refresh)}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function persistNovvinSession(response: Response) {
  const setCookies = response.headers.getSetCookie();
  const entry = setCookies.find((value) => value.startsWith(`${BACKEND_COOKIE}=`));
  const refresh = entry?.split(';')[0].slice(BACKEND_COOKIE.length + 1);
  if (!refresh) throw new Error('Novvin no confirmó una sesión persistente.');
  const age = Math.min(TTL, Number(entry?.match(/Max-Age=(\d+)/i)?.[1] || TTL));
  (await cookies()).set(SESSION_COOKIE, sealSession({ refresh: decodeURIComponent(refresh), expires: Date.now() + age * 1000 }, process.env.ELARA_SESSION_SECRET || ''), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: age,
  });
}

export async function readNovvinSession() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw || !authConfigured()) return null;
  const session = openSession<Session>(raw, process.env.ELARA_SESSION_SECRET!);
  return session && session.expires > Date.now() && typeof session.refresh === 'string' ? session : null;
}

export async function enrichNovvinUser(user: NovvinUser, accessToken: string): Promise<NovvinUser> {
  try {
    const ids = [user.id, user.supabaseUserId].filter((id) => /^[a-f0-9-]{36}$/i.test(id || ''));
    if (!ids.length) return user;
    const response = await novvinFetch(`/rest/v1/profiles?select=id,display_name,username,avatar_url,avatar_media_type&id=in.(${ids.join(',')})`, undefined, undefined, 'GET', accessToken, 5000);
    if (!response.ok) return user;
    const rows = await response.json();
    const profile = Array.isArray(rows) ? (rows.find((row) => row.id === user.supabaseUserId) || rows.find((row) => row.id === user.id)) : null;
    return profile ? { ...user, displayName: profile.display_name || user.displayName, username: profile.username || user.username, avatarUrl: typeof profile.avatar_url === 'string' ? profile.avatar_url : user.avatarUrl, avatarMediaType: profile.avatar_media_type || user.avatarMediaType } : user;
  } catch { return user; }
}

export async function verifiedNovvinSession(withProfile = false, options: {signal?:AbortSignal;timeoutMs?:number} = {}): Promise<{ user: NovvinUser; accessToken: string } | null> {
  const session = await readNovvinSession();
  if (!session) return null;
  const response = await novvinFetch('/v1/auth/web-session/refresh', undefined, session.refresh, 'POST', undefined, options.timeoutMs ?? 15_000, {}, options.signal);
  if ([401, 403].includes(response.status)) {
    (await cookies()).delete(SESSION_COOKIE);
    return null;
  }
  if (!response.ok) throw new Error('Novvin no está disponible. Vuelve a intentarlo.');
  const payload = await response.json();
  if (!payload.user?.id || !payload.accessToken) return null;
  return { user: withProfile ? await enrichNovvinUser(payload.user, payload.accessToken) : payload.user, accessToken: payload.accessToken };
}

export async function verifiedNovvinUser(withProfile = false, options: {signal?:AbortSignal;timeoutMs?:number} = {}): Promise<NovvinUser | null> {
  return (await verifiedNovvinSession(withProfile,options))?.user || null;
}
