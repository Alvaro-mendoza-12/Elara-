# Servicio ELARA para tu Servidor Ubuntu (`infrastructure/local-fallback`)

Este directorio contiene un endpoint OpenAI-compatible (`/v1/models`, `/v1/chat/completions` con streaming SSE) listo para correr en Docker dentro de tu servidor Ubuntu y conectarlo desde Vercel sin depender de OpenAI o Anthropic.

## Pasos desde la consola web de Hostinger / Ubuntu

1. Crea una carpeta para el servicio en tu stack:

```bash
mkdir -p ~/conectate-local-fallback/elara-server
```

2. Copia `Dockerfile` e `index.js` dentro de `~/conectate-local-fallback/elara-server/`.
3. Añade el servicio a tu `docker-compose.yml` (o ejecútalo directo en Docker):

```yaml
  elara-ai:
    build:
      context: ./elara-server
    container_name: elara-ai-server
    restart: unless-stopped
    environment:
      PORT: 3015
      ELARA_SERVER_MODEL: elara-ubuntu-v1
      ELARA_SERVER_TOKEN: ${ELARA_SERVER_TOKEN}
      # Opcional cuando instales un LLM GPU/Ollama con suficiente RAM:
      # UPSTREAM_OLLAMA_URL: http://host.docker.internal:11434/v1
      # UPSTREAM_LLM_MODEL: qwen2.5:7b-instruct
    ports:
      - "127.0.0.1:3015:3015"
    mem_limit: 512m
```

4. Expón `http://127.0.0.1:3015` mediante un hostname HTTPS en tu **Cloudflare Tunnel** nombrado (por ejemplo `https://elara-api.tudominio.com`) sin abrir puertos directos al público.
5. En tu proyecto **ELARA** en Vercel agrega las variables de entorno:
   - `ELARA_UPSTREAM_URL=https://elara-api.tudominio.com/v1`
   - `ELARA_UPSTREAM_API_KEY=<tu ELARA_SERVER_TOKEN>`
   - `ELARA_UPSTREAM_MODEL=elara-ubuntu-v1`

Y redespliega: la web en Vercel empezará a hacer streaming directo desde tu servidor Ubuntu.
