# Guía para Conectar tu Servidor Propio (Ubuntu / GPU / Ollama)

## 1. Requisitos de hardware realistas

- **Motor propio actual (`Elara Core v0.2` / clasificador MLP Node):** funciona en cualquier CPU o Vercel serverless con menos de 512 MB de RAM, pero su conocimiento se limita al dominio entrenado y plantillas web parametrizadas.
- **Para respuestas abiertas completas tipo ChatGPT / DeepSeek / Claude usando tu propio modelo:**
  - Necesitas al menos un servidor con **GPU dedicada (ej. 16–24 GB VRAM para modelos 7B–14B cuantizados, o 48+ GB VRAM para 32B–70B)** o suficiente RAM CPU dedicada, ejecutando Ollama, vLLM o llama.cpp.
  - Tu laptop local o un contenedor CPU de 512 MB RAM no soportan tráfico concurrente público de modelos generativos grandes.

## 2. Conectar un servidor compatible con OpenAI a ELARA Web

ELARA Web incluye soporte nativo en [app/api/chat/route.ts](../app/api/chat/route.ts) mediante `@ai-sdk/openai-compatible`.

1. Expón tu motor LLM en el servidor detrás de HTTPS estable (por ejemplo con **Cloudflare Tunnel**, nunca HTTP sin cifrar hacia Internet).
2. Verifica que responda `GET /v1/models` y `POST /v1/chat/completions` (`stream: true`).
3. Configura en Vercel (`Settings → Environment Variables`):
   - `ELARA_UPSTREAM_URL=https://tu-subdominio-ia.tudominio.com/v1`
   - `ELARA_UPSTREAM_API_KEY=<token-secreto-largo>`
   - `ELARA_UPSTREAM_MODEL=<nombre-del-modelo>` (ej. `qwen2.5:7b-instruct` o `elara-ubuntu-v1`)
4. Redespliega con `vercel --prod`. El indicador superior cambiará automáticamente de `Elara Core v0.2` a `Servidor Propio` sin cambiar una sola línea de frontend.

Consulta también [server/README_UBUNTU.md](../server/README_UBUNTU.md) para montar el contenedor Docker compañero dentro de la pila Ubuntu de Novvin.
