import { cookies } from 'next/headers';
import { openSession, sealSession } from './session-crypto';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-elara-session' : 'elara-session';
const BACKEND_COOKIE = '__Secure-novvin-web-session';
const TTL = 30 * 24 * 60 * 60;
type Session = { refresh: string; expires: number };
export interface NovvinUser { id: string; displayName?: string; username?: string; email?: string }

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

export async function novvinFetch(path: string, body?: unknown, refresh?: string, method = 'POST') {
  const base = new URL(process.env.NOVVIN_API_URL || 'https://conectate.tail9b267c.ts.net');
  if (base.protocol !== 'https:') throw new Error('Novvin requiere HTTPS.');
  return fetch(new URL(path, base), {
    method, cache: 'no-store', signal: AbortSignal.timeout(15_000), redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      // This BFF speaks the existing first-party web session contract.
      Origin: 'https://novvinapp.com',
      'x-novvin-web-session': 'web-v1',
      'User-Agent': 'ELARA Web / Novvin integration',
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

export async function verifiedNovvinUser(): Promise<NovvinUser | null> {
  const session = await readNovvinSession();
  if (!session) return null;
  const response = await novvinFetch('/v1/auth/web-session/refresh', undefined, session.refresh);
  if ([401, 403].includes(response.status)) {
    (await cookies()).delete(SESSION_COOKIE);
    return null;
  }
  if (!response.ok) throw new Error('Novvin no está disponible. Vuelve a intentarlo.');
  const payload = await response.json();
  return payload.user?.id ? payload.user : null;
}

export function publicProfile(user: NovvinUser) {
  return {
    displayName: user.displayName || user.username || 'Usuario de Novvin',
    handle: user.username || user.id.slice(0, 8), avatarColor: '#7862d9',
    linkedMethod: 'novvin-session', createdAt: 0, focus: 'Uso general',
  };
}
