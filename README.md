# Elara 0.5

Asistente web independiente en `D:\Elara`, con Next.js 16, React 19 y Vercel AI SDK. Repositorio: https://github.com/Alvaro-mendoza-12/Elara-.

Sitio de producción: https://elara-mu-mauve.vercel.app

## Qué hace esta versión

- Chat en streaming, historial en el navegador, exportación Markdown, archivos de código y visor HTML aislado con versiones y tamaños móvil/tablet/escritorio.
- Acceso real con correo y contraseña de **Novvin**: registro, segundo factor cuando lo exige Novvin, verificación de sesión, persistencia y cierre con revocación en Ubuntu.
- El navegador recibe una cookie cifrada `HttpOnly`, `Secure` en producción y `SameSite=Lax`. No recibe tokens de Novvin en JSON ni usa perfiles locales como autenticación.
- Identidad violeta y papel frío, logo orbital, favicon, iconos PNG y manifiesto para instalación. El manifiesto no implica funcionamiento sin conexión.
- **Elara Core 0.5** es un motor básico especializado de reglas, plantillas y clasificación de intenciones. No es un LLM general entrenado desde cero. Genera prototipos, calcula, consulta guías limitadas y admite algunos seguimientos de contexto. Reconoce consultas que no sabe resolver.
- Los sitios generados incluyen datos de ejemplo. Las reservas, pagos y accesos de esos prototipos necesitan su propio backend.

## Infraestructura

Frontend y API de Elara se ejecutan en Vercel. Las cuentas se validan en el servidor Ubuntu de Novvin mediante su contrato de sesiones web existente. Ninguno necesita este portátil encendido. Ubuntu sí debe permanecer disponible para iniciar, verificar y cerrar sesiones; el chat anónimo básico se ejecuta íntegramente en Vercel.

No se instalaron servicios nuevos en Ubuntu ni se modificó el código de la red social. Elara usa la infraestructura de autenticación existente. No se activó ningún proveedor de IA de pago.

## Configuración

Crea `.env.local` para desarrollo o variables protegidas en Vercel:

```dotenv
ELARA_SESSION_SECRET=<secreto aleatorio de al menos 32 caracteres>
# NOVVIN_API_URL=https://conectate.tail9b267c.ts.net
# ELARA_UPSTREAM_URL=https://tu-servidor/v1
# ELARA_UPSTREAM_API_KEY=
# ELARA_UPSTREAM_MODEL=
# AI_GATEWAY_API_KEY=
# ELARA_GATEWAY_MODEL=
```

No publiques `.env.local` ni `.vercel/`. Rotar el secreto invalida las cookies de Elara; revoca también las sesiones que lo requieran en Novvin.

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Para la comprobación HTTP, `node scripts/smoke.mjs` usa por defecto `http://127.0.0.1:3107`. `ELARA_TEST_URL` permite seleccionar el despliegue. **Esta comprobación crea una cuenta sintética real** con dominio `example.invalid`, almacena su fixture privado en `.vercel/qa-account.json` y comprueba acceso, revocación y streaming. No usarla contra servicios ajenos. El fixture debe retirarse del servidor al terminar la validación.

## Documentación

- [Estado de entrega, pruebas y límites](docs/ENTREGA_2026-11-16.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Autenticación Novvin](docs/GUIA_CONEXION_NOVVIN.md)
- [Identidad visual](docs/DISENO.md)

Los archivos de `server/` y las guías de GPU describen una opción anterior de servidor compañero. No son necesarios para esta producción en Vercel.
