import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createHmac } from 'node:crypto';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { runElaraCoreEngine, type SimpleTurn } from '@/lib/elara-engine/engine';
import { resolveEngineInfo } from '@/lib/engine-info';
import { parseChatInput } from '@/lib/chat-input';
import { readNovvinSession, trustedMutation, verifiedNovvinUser } from '@/lib/novvin-auth';
import { boundedModelContext, parseModelPreferences, shouldUseConversationModel } from '@/lib/models';
import { upstreamConfiguration } from '@/lib/model-runtime';
import { unavailableDataReply } from '@/lib/elara-engine/data-boundaries';
import { conversationInstructions } from '@/lib/conversation-instructions';
import { activeConversationTurns } from '@/lib/conversation-context';
import { verifiedKnowledgeReply } from '@/lib/verified-knowledge';
import { CHAT_TIMEOUT_MESSAGE, conversationErrorMessage, modelResponseStream } from '@/lib/chat-reliability';

export const maxDuration = 60;

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
  const chunkSize = text.includes('```html') ? 110 : 14;
  let cursor = 0;
  while (cursor < text.length) {
    let next = Math.min(cursor + chunkSize, text.length);
    if (next < text.length) {
      const space = text.indexOf(' ', next);
      if (space !== -1 && space - cursor <= chunkSize + 14) {
        next = space + 1;
      }
    }
    chunks.push(text.slice(cursor, next));
    cursor = next;
  }
  return chunks;
}

function coreStreamResponse(req: Request, reply: string, engine: 'core' | 'safety' = 'core') {
  const textPartId = `elara-txt-${crypto.randomUUID()}`;
  const messageId = `elara-msg-${crypto.randomUUID()}`;
  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: 'start', messageId }); writer.write({ type: 'start-step' }); writer.write({ type: 'text-start', id: textPartId });
      for (const chunk of splitForStreaming(reply)) {
        if (req.signal.aborted) break;
        writer.write({ type: 'text-delta', id: textPartId, delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, reply.includes('```html') ? 4 : 18));
      }
      writer.write({ type: 'text-end', id: textPartId }); writer.write({ type: 'finish-step' }); writer.write({ type: 'finish', finishReason: 'stop' });
    }, onError: () => 'No se pudo completar la respuesta de Elara.',
  });
  return createUIMessageStreamResponse({ stream, headers: { 'Cache-Control': 'no-store', 'X-Elara-Engine': engine } });
}

export async function POST(req: Request) {
  const started = performance.now();
  const deadline = AbortSignal.timeout(42_000);
  const signal = AbortSignal.any([req.signal,deadline]);
  if (!trustedMutation(req)) return Response.json({ error: 'Origen no permitido.' }, { status: 403 });
  let rawBody: unknown;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 1_000_000) return Response.json({ error: 'La conversación es demasiado grande.' }, { status: 413 });
    rawBody = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }
  const uiMessages = parseChatInput(rawBody);
  if (!uiMessages) return Response.json({ error: 'Incluye un mensaje de texto válido. Reduce los archivos o la conversación si son demasiado grandes.', code: 'INVALID_MESSAGES' }, { status: 400 });
  const preferences = parseModelPreferences(rawBody);
  if (!preferences) return Response.json({ error: 'Elige uno de los motores disponibles.' }, { status: 400 });
  const turns = uiMessagesToSimpleTurns(uiMessages);
  const computed = runElaraCoreEngine(turns);
  // Support must still work if Novvin is unavailable or a session has expired.
  if (computed.intent === 'safety_crisis_support') return coreStreamResponse(req, computed.reply, 'safety');
  // Public exact math tools use only this request's data and need no remote session.
  if (computed.intent.startsWith('math_')) return coreStreamResponse(req,computed.reply);
  const verifiedAnswer=verifiedKnowledgeReply(turns);
  if(verifiedAnswer)return coreStreamResponse(req,verifiedAnswer);
  let verifiedUser: Awaited<ReturnType<typeof verifiedNovvinUser>> = null;
  if (await readNovvinSession()) {
    try {
      verifiedUser = await verifiedNovvinUser(false,{signal,timeoutMs:10000});
      if (!verifiedUser) return Response.json({ error: 'Tu sesión de Novvin terminó. Vuelve a iniciar sesión o continúa en acceso libre.' }, { status: 401 });
    } catch { return Response.json({ error: 'No se pudo verificar tu sesión. Reintenta en un momento.' }, { status: 503 }); }
  }
  const engineInfo = resolveEngineInfo();

  try {
    const dataBoundary = shouldUseConversationModel(preferences.model, computed.intent) ? unavailableDataReply(activeConversationTurns(turns)) : null;
    if (dataBoundary) { computed.reply = dataBoundary; computed.intent = 'capability_data_boundary'; }
    const conversationRequested = shouldUseConversationModel(preferences.model, computed.intent);
    if (preferences.model === 'conversation' && !verifiedUser && computed.intent !== 'safety_crisis_support') return Response.json({ error: 'Inicia sesión con Novvin para usar Conversación. Core sigue disponible sin registro.' }, { status: 401 });
    if (conversationRequested && engineInfo.mode === 'custom-server' && verifiedUser) {
      const config = upstreamConfiguration()!;
      const messages = boundedModelContext(turns);
      if (!messages) return Response.json({ error: 'Este modelo admite consultas de hasta 6.000 caracteres. Reduce el mensaje o usa Core para revisar código.' }, { status: 413 });
      const customProvider = createOpenAICompatible({
        name: 'elara-server',
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        headers: { 'X-Elara-Account': createHmac('sha256', config.apiKey).update(verifiedUser.id).digest('hex') },
      });
      const result = streamText({
        model: customProvider.chatModel(config.model),
        instructions: conversationInstructions(preferences.detail,turns),
        messages,
        abortSignal: signal,
        timeout: {totalMs:38_000,firstChunkMs:30_000,chunkMs:10_000},
        maxOutputTokens: preferences.detail === 'brief' ? 192 : 256,
        temperature: 0.5,
        maxRetries: 0,
        streamRetries: 0,
        onEnd: ({finishReason}) => console.info('[elara.chat]',JSON.stringify({engine:'conversation',elapsedMs:Math.round(performance.now()-started),finishReason})),
      });
      return createUIMessageStreamResponse({
        stream: modelResponseStream(toUIMessageStream({ stream: result.stream, sendReasoning: false, onError: error => {
          console.info('[elara.chat]',JSON.stringify({engine:'conversation',elapsedMs:Math.round(performance.now()-started),outcome:'error'}));
          return deadline.aborted ? CHAT_TIMEOUT_MESSAGE : conversationErrorMessage(error);
        } }),()=>req.signal.aborted),
        headers: { 'Cache-Control': 'no-store', 'X-Elara-Engine': 'conversation' },
      });
    }
    if (conversationRequested && preferences.model === 'conversation' && engineInfo.mode !== 'custom-server') {
      return Response.json({ error: 'Conversación no está disponible ahora. Puedes usar Core rápido.' }, { status: 503 });
    }
    if (computed.intent === 'identity_elara' && engineInfo.mode === 'custom-server') computed.reply = 'Soy **Elara**, la asistente de Novvin. Combino **Core rápido**, para prototipos web, cálculos y utilidades, con **Conversación**, basado en Qwen3.5-2B y adaptado con instrucciones y herramientas de Elara. Ambos funcionan en servidores; tu laptop puede estar apagada. No navego por internet y puedo equivocarme. Conversación requiere iniciar sesión con Novvin.';
    if (computed.intent === '__fallback_honest__' && engineInfo.mode === 'custom-server' && !verifiedUser) computed.reply += '\n\nPara preguntas generales, inicia sesión con Novvin y elige **Conversación** o **Automático**. Core sigue siendo gratuito y sin límite de mensajes.';
    return coreStreamResponse(req, computed.reply);
  } catch (error) {
    console.error('[api/chat] Request failed:', error instanceof Error ? error.name : 'UnknownError');
    return Response.json(
      { error: 'No se pudo completar la consulta. Reintenta en un momento.', code: 'CHAT_ENGINE_ERROR' },
      { status: 500 },
    );
  }
}
