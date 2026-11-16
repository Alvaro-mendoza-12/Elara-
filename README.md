# ELARA (`E L A R A`)

Interfaz web conversacional de **ELARA**, diseñada para responder con streaming en tiempo real, generar archivos `index.html` con vista previa en vivo (en sandbox) y servir de base para conectarse con el ecosistema **Novvin** (`novvinapp.com`) y un servidor propio de IA.

## Arquitectura

- **Frontend (`Next.js 16` + React 19 + Tailwind CSS v4 + Vercel AI SDK `useChat`)**:
  - Acceso directo **sin login** con historial local persistente en navegador (`localStorage`).
  - Bloques de código con **Copiar**, **Descargar** y **Vista previa en vivo** (`<iframe sandbox="allow-scripts">`) para plantillas `index.html`.
  - Base preparada en UI para el flujo futuro **"Continuar con Novvin"**.
- **Backend (`/api/chat` y `/api/health`)**:
  - **Por defecto (`Elara Core v0.1`)**: motor propio en TypeScript ([lib/elara-engine/](lib/elara-engine/)) con clasificador neuronal MLP determinístico, sintetizador de plantillas `index.html` y analizador estático ligero de HTML/JSON/JS/SQL.
  - **Con servidor propio (`ELARA_UPSTREAM_URL`)**: conecta directamente con un servidor OpenAI-compatible (Ollama, vLLM, llama.cpp o el servicio en [server/](server/)) mediante `@ai-sdk/openai-compatible`.
  - **Con Vercel AI Gateway (`AI_GATEWAY_API_KEY` + `ELARA_GATEWAY_MODEL`)**: enrutamiento directo opcional vía AI SDK.
- **Compañero para servidor Ubuntu ([server/](server/))**:
  - Microservicio Node.js + Docker listo para integrarse en la pila Docker Compose de Ubuntu y exponerse mediante Cloudflare Tunnel.

## Desarrollo local

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run lint
npm run build
```
