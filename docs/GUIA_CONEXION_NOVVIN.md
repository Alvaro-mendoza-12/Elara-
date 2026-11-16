# Guía de Integración: "Continuar con Novvin" (`novvinapp.com`)

## 1. Estado actual en la versión actual

- **Acceso libre (invitado):** los usuarios pueden conversar de inmediato sin registro hasta un máximo de **20 mensajes gratuitos** (`GUEST_MESSAGE_LIMIT = 20`).
- **Continuar con Novvin / Crear perfil ([NovvinAuthModal.tsx](../components/NovvinAuthModal.tsx)):** al pulsar **Continuar con Novvin** o alcanzar el límite gratuito, el usuario crea su **nombre visible**, `@usuario`, enfoque y color de perfil, desbloqueando mensajes ilimitados en la sesión del navegador.

## 2. Arquitectura recomendada para Fase 2 (OAuth / Deep Link con App Móvil Novvin)

Para replicar el comportamiento tipo *"Continuar con Facebook / Google"* directamente desde la app Android y web de **Novvin**:

```text
ELARA Web (/login)
  │  1. Genera state + code_verifier (PKCE SHA-256)
  ▼
Abre https://novvinapp.com/oauth/authorize?client_id=elara&redirect_uri=...&state=...&code_challenge=...
  │
  ├─ En móvil Android: Android App Links abre Novvin App si está instalada (sesión ya abierta).
  │  Novvin muestra tarjeta: "¿Continuar en ELARA como @usuario?" -> botón "Continuar".
  │
  └─ En web: si novvinapp.com tiene sesión activa, muestra confirmación en 1 clic.
  │
  ▼  2. Redirige de vuelta a ELARA: /api/auth/novvin/callback?code=...&state=...
ELARA Server (Next.js)
  │  3. Intercambia `code` + `code_verifier` servidor-a-servidor contra api.novvinapp.com/oauth/token
  ▼  4. Emite cookie HttpOnly firmada (sesión ELARA + userId Novvin)
```

### Checklist de seguridad cuando se conecte en producción
1. **Nunca confiar solo en parámetros de URL en el frontend:** el intercambio del `code` debe hacerse en una Route Handler server-side (`/api/auth/novvin/callback`).
2. **Usar PKCE (`S256`) y parámetro `state` aleatorio** guardado en cookie `HttpOnly` de corta duración para evitar ataques CSRF.
3. **En Android (App Links):** publicar `/.well-known/assetlinks.json` en `novvinapp.com` para que los enlaces OAuth abran directamente la app móvil de Novvin sin pedir volver a escribir contraseña.
4. **Revocación desde Novvin:** guardar la sesión en la tabla de sesiones externas de Novvin para que el usuario vea en qué aplicaciones inició sesión y pueda revocar acceso desde su perfil móvil.
