import type { UIMessage, UIMessageChunk } from 'ai';

export const CHAT_DEADLINE_MS = 45_000;
export const CHAT_TIMEOUT_MESSAGE = 'Se agotó el tiempo de espera de Conversación. Puedes reintentar; si el historial es largo, prueba un chat nuevo.';

export function isIncompleteMessage(message: { role: string; metadata?: unknown }): boolean {
  return message.role === 'assistant' && !!message.metadata && typeof message.metadata === 'object' && 'elaraIncomplete' in message.metadata && message.metadata.elaraIncomplete === true;
}

export function incompleteMessage(message: UIMessage, stopped = false): UIMessage {
  return {...message,metadata:{...(message.metadata && typeof message.metadata==='object'?message.metadata:{}),elaraIncomplete:true,elaraStopped:stopped}};
}

export function interruptedReply(outcome: {isAbort:boolean;isDisconnect:boolean;isError:boolean;finishReason?:string}): boolean {
  return outcome.isAbort || outcome.isDisconnect || outcome.isError || outcome.finishReason !== 'stop';
}

/** SDK timeouts emit abort chunks; expose a server timeout as a readable UI error. */
export function modelResponseStream(stream: ReadableStream<UIMessageChunk>, callerAborted: ()=>boolean = ()=>false): ReadableStream<UIMessageChunk> {
  return stream.pipeThrough(new TransformStream<UIMessageChunk,UIMessageChunk>({transform(chunk,controller){
    if (chunk.type==='abort' && !callerAborted()) controller.enqueue({type:'error',errorText:/timeout/i.test(chunk.reason || '')?CHAT_TIMEOUT_MESSAGE:'Conversación se interrumpió antes de terminar. Puedes reintentar.'});
    else controller.enqueue(chunk);
  }}));
}

/** The deadline covers both waiting for headers and consuming the entire stream. */
export function createChatFetch(fetchImplementation: typeof fetch = globalThis.fetch, timeoutMs = CHAT_DEADLINE_MS): typeof fetch {
  return async (input, init) => {
    const deadline = new AbortController();
    const signal = AbortSignal.any([deadline.signal,...(init?.signal?[init.signal]:[])]);
    const timer = setTimeout(()=>deadline.abort(new Error(CHAT_TIMEOUT_MESSAGE)),timeoutMs);
    const cleanup = () => clearTimeout(timer);
    const mappedError = (error: unknown) => deadline.signal.aborted && !init?.signal?.aborted ? new Error(CHAT_TIMEOUT_MESSAGE) : error;
    try {
      const response = await fetchImplementation(input,{...init,signal});
      if (!response.body) { cleanup(); return response; }
      const reader = response.body.getReader();
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const {value,done} = await reader.read();
            if (done) { cleanup(); controller.close(); }
            else controller.enqueue(value);
          } catch (error) { cleanup(); controller.error(mappedError(error)); }
        },
        async cancel(reason) { cleanup(); deadline.abort(reason); await reader.cancel(reason); },
      });
      return new Response(stream,{status:response.status,statusText:response.statusText,headers:response.headers});
    } catch (error) { cleanup(); throw mappedError(error); }
  };
}

export const chatFetch = createChatFetch();

function runtimeErrorCode(item:{responseBody?:unknown}):string|null {
  if(typeof item.responseBody!=='string'||item.responseBody.length>4096)return null;
  try{const code=JSON.parse(item.responseBody)?.error?.code;return code==='RATE_LIMITED'?code:null;}catch{return null;}
}

export function conversationFailureKind(error:unknown):'timeout'|'busy'|'rate-limit'|'unavailable'|'failed' {
 let candidate=error;
 for(let depth=0;depth<5&&candidate&&typeof candidate==='object';depth++){
  const item=candidate as {name?:string;message?:string;statusCode?:number;cause?:unknown;responseBody?:unknown};
  if(item.statusCode===429)return runtimeErrorCode(item)==='RATE_LIMITED'?'rate-limit':'busy';
  if(/timeout|abort/i.test(item.name||'')||/timeout|timed out|tiempo de espera/i.test(item.message||''))return 'timeout';
  if(item.statusCode&&item.statusCode>=500)return 'unavailable';
  candidate=item.cause;
 }
 return 'failed';
}

export function conversationErrorMessage(error: unknown): string {
  let candidate: unknown = error;
  for (let depth=0;depth<5 && candidate && typeof candidate==='object';depth++) {
    const item = candidate as {name?:string;message?:string;statusCode?:number;cause?:unknown;responseBody?:unknown};
    if (/timeout|abort/i.test(item.name || '') || /timeout|timed out|tiempo de espera/i.test(item.message || '')) return CHAT_TIMEOUT_MESSAGE;
    if (item.statusCode===429) return runtimeErrorCode(item)==='RATE_LIMITED'?'Alcanzaste el límite temporal de Conversación. Espera un minuto antes de volver a intentarlo.':'Conversación está atendiendo otra consulta. Espera unos segundos y vuelve a intentarlo; Core rápido sigue disponible.';
    candidate=item.cause;
  }
  return 'No se pudo completar la conexión con Conversación. Reintenta en un momento o usa Core rápido.';
}
