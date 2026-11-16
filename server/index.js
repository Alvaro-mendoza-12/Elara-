import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3015);
const MODEL_ID = process.env.ELARA_SERVER_MODEL || 'elara-ubuntu-v1';
const API_TOKEN = (process.env.ELARA_SERVER_TOKEN || '').trim();
const UPSTREAM_OLLAMA_URL = (process.env.UPSTREAM_OLLAMA_URL || '').trim().replace(/\/+$/, '');
const MAX_BODY_BYTES = 256 * 1024;

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('INVALID_JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function authorize(req) {
  if (!API_TOKEN) return true;
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(API_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function buildLocalServerReply(messages) {
  const lastUser = [...messages].reverse().find((m) => m?.role === 'user')?.content || '';
  const clean = String(lastUser).trim();
  if (!clean) return 'Envía una consulta para que ELARA responda desde el servidor Ubuntu.';

  if (/index\.html|landing|pagina|web|html/i.test(clean)) {
    return `Respuesta generada desde tu servidor Ubuntu (\`${MODEL_ID}\`):

\`\`\`html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ELARA Ubuntu Server</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0b0e14; color: #f1f5f9; display: grid; place-items: center; min-height: 100vh; }
    .box { max-width: 520px; padding: 28px; border-radius: 16px; border: 1px solid #222b3d; background: #121722; }
    h1 { color: #38bdf8; margin-top: 0; }
  </style>
</head>
<body>
  <main class="box">
    <h1>ELARA en Servidor Propio</h1>
    <p>Este archivo fue entregado directamente desde tu endpoint Ubuntu OpenAI-compatible.</p>
  </main>
</body>
</html>
\`\`\``;
  }

  return `Conectado correctamente al nodo Ubuntu de ELARA (\`${MODEL_ID}\`).\n\nSi configuras \`UPSTREAM_OLLAMA_URL\` apuntando a tu runtime LLM/GPU (por ejemplo \`http://host.docker.internal:11434/v1\`), este servicio reenviará automáticamente los chats en formato streaming OpenAI.`;
}

async function handleChatCompletions(req, res) {
  const body = await readJsonBody(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return sendJson(res, 400, { error: { message: 'messages is required' } });
  }

  if (UPSTREAM_OLLAMA_URL) {
    const upstreamRes = await fetch(`${UPSTREAM_OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.UPSTREAM_LLM_MODEL || body.model || MODEL_ID,
        messages,
        stream: Boolean(body.stream),
      }),
    });
    res.writeHead(upstreamRes.status, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    });
    if (!upstreamRes.body) return res.end();
    for await (const chunk of upstreamRes.body) {
      res.write(chunk);
    }
    return res.end();
  }

  const reply = buildLocalServerReply(messages);
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  if (!body.stream) {
    return sendJson(res, 200, {
      id,
      object: 'chat.completion',
      created,
      model: MODEL_ID,
      choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
    });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  for (let i = 0; i < reply.length; i += 28) {
    const delta = reply.slice(i, i + 28);
    const frame = {
      id,
      object: 'chat.completion.chunk',
      created,
      model: MODEL_ID,
      choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
    };
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
  }
  const doneFrame = {
    id,
    object: 'chat.completion.chunk',
    created,
    model: MODEL_ID,
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  };
  res.write(`data: ${JSON.stringify(doneFrame)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, model: MODEL_ID, upstreamConfigured: Boolean(UPSTREAM_OLLAMA_URL) });
    }
    if (!authorize(req)) {
      return sendJson(res, 401, { error: { message: 'Unauthorized' } });
    }
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      return sendJson(res, 200, {
        object: 'list',
        data: [{ id: MODEL_ID, object: 'model', owned_by: 'elara-ubuntu' }],
      });
    }
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      return await handleChatCompletions(req, res);
    }
    return sendJson(res, 404, { error: { message: 'Not found' } });
  } catch (err) {
    return sendJson(res, err?.status || 500, { error: { message: err?.message || 'Internal error' } });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[elara-server] listening on :${PORT} (model=${MODEL_ID})`);
});
