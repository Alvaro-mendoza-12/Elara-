# Arquitectura Técnica de ELARA (`elara-web`)

## 1. Visión general de capas

```text
Navegador (ElaraChatApp)
  ├── Estado local (localStorage): conversaciones, perfil Novvin/local, cuota gratuita (20 msgs)
  ├── Hook useChat (@ai-sdk/react + DefaultChatTransport) ──POST──> /api/chat
  └── Visor lateral (CodePreviewDrawer) <──postMessage consola── <iframe sandbox="allow-scripts">

Servidor Next.js (Node.js Fluid Compute)
  ├── /api/health  ──> expone modo activo (Elara Core v0.2 | Servidor Propio | AI Gateway)
  └── /api/chat    ──> enruta según variables de entorno:
                        1) ELARA_UPSTREAM_URL (servidor propio OpenAI-compatible / Ollama / vLLM)
                        2) AI_GATEWAY_API_KEY + ELARA_GATEWAY_MODEL (opcional)
                        3) Elara Core v0.2 integrado (por defecto, cero claves externas)
```

## 2. Flujo del motor `Elara Core v0.2` ([lib/elara-engine/](../lib/elara-engine/))

1. **Salvaguarda de crisis ([safety.ts](../lib/elara-engine/safety.ts)):** se evalúa antes que cualquier router. Ante señales de autolesión o crisis responde de inmediato con líneas de atención reales (Línea 113 Opción 5 en Perú, 106 SAMU, 988, 024, `findahelpline.com`).
2. **Inspector estático de código ([code-analyzer.ts](../lib/elara-engine/code-analyzer.ts)):** valida llaves/comillas balanceadas, sintaxis JSON, etiquetas HTML sin cerrar y riesgos frecuentes (`innerHTML`, `UPDATE`/`DELETE` sin `WHERE`, `fetch` sin comprobar `.ok`).
3. **Resolución directa ([conversational.ts](../lib/elara-engine/conversational.ts)):** evalúa operaciones aritméticas seguras, porcentajes, códigos HTTP (`400`–`503`) y respuestas conversacionales cortas.
4. **Sintetizador web dinámico ([web-builder.ts](../lib/elara-engine/web-builder.ts) y [code-synthesizer.ts](../lib/elara-engine/code-synthesizer.ts)):** extrae tema, cantidad solicitada (`N`), marca y tema claro/oscuro para generar un `index.html` funcional e interactivo acorde a lo pedido (por ejemplo 20 juguetes para perritos con carrito y filtros, login, panel, calculadora o landing personalizada).
5. **Router neuronal MLP y base semántica ([neural-net.ts](../lib/elara-engine/neural-net.ts) y [dataset.ts](../lib/elara-engine/dataset.ts)):** red neuronal ligera entrenada de forma determinística + emparejamiento de palabras clave para snippets React, Python, PostgreSQL y Git/Docker.
6. **Ventana deslizante en API ([app/api/chat/route.ts](../app/api/chat/route.ts)):** toma `messages.slice(-40)` para que conversaciones largas sigan funcionando sin fallar por límite de turnos.
