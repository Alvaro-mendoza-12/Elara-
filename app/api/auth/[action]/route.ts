import { cookies } from 'next/headers';
import { z } from 'zod';
import { NOVVIN_REGISTER_URL } from '@/lib/novvin-profile';
import { authConfigured, enrichNovvinUser, novvinFetch, persistNovvinSession, publicProfile, readNovvinSession, SESSION_COOKIE, trustedMutation, verifiedNovvinUser } from '@/lib/novvin-auth';

const noStore = { 'Cache-Control': 'no-store' };
const credentials = z.object({
  email: z.email().max(254), password: z.string().min(1).max(256),
  displayName: z.string().trim().min(2).max(20).optional(),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/).optional(),
  secondFactor: z.string().trim().max(100).optional(),
});
const errors: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_ALREADY_EXISTS: 'Este correo ya tiene una cuenta de Novvin. Inicia sesión.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  TWO_FACTOR_REQUIRED: 'Escribe el código de tu aplicación de autenticación o uno de respaldo.',
  TWO_FACTOR_INVALID: 'El código de verificación no es válido.',
  TWO_FACTOR_LOCKED: 'Demasiados intentos de verificación. Espera antes de volver a intentar.',
  MIGRATED_ACCOUNT_PASSWORD_RESET_REQUIRED: 'Actualiza tu contraseña en Novvin antes de continuar.',
  MIGRATED_ACCOUNT_PASSWORD_SETUP_REQUIRED: 'Configura tu contraseña en Novvin antes de continuar.',
  DISPLAY_NAME_INVALID: 'El nombre debe tener entre 2 y 20 caracteres.',
  USERNAME_TAKEN: 'Ese nombre de usuario ya está en uso.',
  ACCOUNT_SUSPENDED: 'Esta cuenta está suspendida. Revisa su estado en Novvin.',
};

export async function GET(_req: Request, ctx: RouteContext<'/api/auth/[action]'>) {
  const { action } = await ctx.params;
  if (action === 'register') return Response.redirect(NOVVIN_REGISTER_URL, 303);
  if (action !== 'session') return Response.json({}, { status: 404 });
  try {
    const user = await verifiedNovvinUser(true);
    return Response.json({ profile: user ? publicProfile(user) : null, configured: authConfigured() }, { headers: noStore });
  } catch {
    return Response.json({ error: 'No se pudo verificar la sesión con Novvin.' }, { status: 503, headers: noStore });
  }
}

export async function POST(req: Request, ctx: RouteContext<'/api/auth/[action]'>) {
  if (!trustedMutation(req)) return Response.json({ error: 'Origen no autorizado.' }, { status: 403 });
  const { action } = await ctx.params;
  if (action === 'register') return Response.json({ error: 'Crea tu cuenta en la página oficial de Novvin.', url: NOVVIN_REGISTER_URL }, { status: 410, headers: noStore });
  if (!['login', 'logout'].includes(action)) return Response.json({}, { status: 404 });
  if (!authConfigured()) return Response.json({ error: 'El acceso de Novvin aún no está configurado.' }, { status: 503 });
  try {
    if (action === 'logout') {
      const session = await readNovvinSession();
      if (session) {
        const response = await novvinFetch('/v1/auth/web-session', undefined, session.refresh, 'DELETE');
        if (!response.ok) return Response.json({ error: 'No se pudo cerrar la sesión en Novvin. Reintenta.' }, { status: 503 });
      }
      (await cookies()).delete(SESSION_COOKIE);
      return Response.json({ ok: true }, { headers: noStore });
    }
    if (Number(req.headers.get('content-length')) > 8192) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    let body: unknown;
    try { body = await req.json(); } catch { return Response.json({ error: 'Solicitud JSON inválida.' }, { status: 400 }); }
    const parsed = credentials.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Revisa el correo, la contraseña y los datos del formulario.' }, { status: 400 });
    const { email, password, displayName, username, secondFactor } = parsed.data;
    const response = await novvinFetch(`/v1/auth/${action}`, {
      email: email.toLowerCase(), password, displayName, username, client: 'web', deviceLabel: 'ELARA Web',
      ...(secondFactor ? (/^\d{6}$/.test(secondFactor) ? { totpCode: secondFactor } : { backupCode: secondFactor }) : {}),
    });
    const payload = await response.json();
    if (!response.ok) return Response.json({
      error: errors[payload.error] || (response.status === 429 ? 'Demasiados intentos. Espera un momento.' : 'No se pudo completar el acceso. Revisa tus datos o entra en Novvin.'),
      requiresTwoFactor: !!payload.requiresTwoFactor,
    }, { status: response.status, headers: noStore });
    if (!payload.user?.id) throw new Error('Missing verified user');
    await persistNovvinSession(response);
    return Response.json({ profile: publicProfile(await enrichNovvinUser(payload.user, payload.accessToken)) }, { headers: noStore });
  } catch {
    return Response.json({ error: 'No se pudo conectar con Novvin. Vuelve a intentarlo.' }, { status: 503, headers: noStore });
  }
}
