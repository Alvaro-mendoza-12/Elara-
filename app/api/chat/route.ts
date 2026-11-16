import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { runElaraCoreEngine, type SimpleTurn } from '@/lib/elara-engine/engine';
import { resolveEngineInfo } from '@/app/api/health/route';

export const maxDuration = 60;

const ELARA_SYSTEM_INSTRUCTIONS =
  'Eres ELARA, una inteligencia artificial clara, directa y útil orientada a programación web, código limpio e integración futura con Novvin. Responde en español salvo que el usuario escriba en otro idioma. Cuando generes archivos HTML completos, entrégalos dentro de un bloque ```html``` autocontenido.';

function validateUpstreamUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const isLocalDev = process.env.VERCEL !== '1' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
  if (parsed.protocol !== 'https:' && !isLocalDev) {
    throw new Error('ELARA_UPSTREAM_URL debe usar HTTPS en producción.');
  }
  return rawUrl.replace(/\/+$/, '');
}

function uiMessagesToSimpleTurns(messages: UIMessage[]): SimpleTurn[] {
  return messages.map((msg) => {
    const text = (msg.parts || [])
      .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim();
    return { role: msg.role, text };
  });
}

function splitForStreaming(text: string): string[] {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let next = Math.min(cursor + 32, text.length);
    if (next < text.length) {
      const space = text.indexOf(' ', next);
      if (space !== -1 && space - cursor <= 52) {
        next = space + 1;
      }
    }
    chunks.push(text.slice(cursor, next));
    cursor = next;
  }
  return chunks;
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const messages = (rawBody as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return Response.json({ error: 'La conversación debe incluir entre 1 y 50 mensajes.' }, { status: 400 });
  }

  const uiMessages = messages as UIMessage[];
  const engineInfo = resolveEngineInfo();

  try {
    if (engineInfo.mode === 'custom-server') {
      const baseURL = validateUpstreamUrl(process.env.ELARA_UPSTREAM_URL!.trim());
      const customProvider = createOpenAICompatible({
        name: 'elara-server',
        baseURL,
        apiKey: process.env.ELARA_UPSTREAM_API_KEY?.trim() || 'elara-no-key',
      });
      const result = streamText({
        model: customProvider.chatModel(engineInfo.modelName),
        instructions: ELARA_SYSTEM_INSTRUCTIONS,
        messages: await convertToModelMessages(uiMessages),
        abortSignal: req.signal,
      });
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
      });
    }

    if (engineInfo.mode === 'ai-gateway') {
      const result = streamText({
        model: engineInfo.modelName,
        instructions: ELARA_SYSTEM_INSTRUCTIONS,
        messages: await convertToModelMessages(uiMessages),
        abortSignal: req.signal,
      });
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
      });
    }

    const turns = uiMessagesToSimpleTurns(uiMessages);
    const computed = runElaraCoreEngine(turns);
    const chunks = splitForStreaming(computed.reply);
    const textPartId = `elara-txt-${crypto.randomUUID()}`;
    const messageId = `elara-msg-${crypto.randomUUID()}`;

    const stream = createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        writer.write({ type: 'start', messageId });
        writer.write({ type: 'start-step' });
        writer.write({ type: 'text-start', id: textPartId });

        for (const chunk of chunks) {
          if (req.signal.aborted) break;
          writer.write({ type: 'text-delta', id: textPartId, delta: chunk });
          await new Promise((resolve) => setTimeout(resolve, 6));
        }

        writer.write({ type: 'text-end', id: textPartId });
        writer.write({ type: 'finish-step' });
        writer.write({ type: 'finish', finishReason: 'stop' });
      },
      onError: () => 'No se pudo completar la respuesta de ELARA.',
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('[api/chat] Request failed:', error);
    return Response.json({ error: 'No se pudo procesar la consulta en este momento.' }, { status: 500 });
  }
}
