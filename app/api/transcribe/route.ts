import { createHmac } from 'node:crypto';
import { upstreamConfiguration } from '@/lib/model-runtime';
import { trustedMutation, verifiedNovvinUser } from '@/lib/novvin-auth';

export const maxDuration = 60;
const noStore={ 'Cache-Control':'no-store' };
export async function POST(req: Request) {
  if (!trustedMutation(req)) return Response.json({error:'Origen no permitido.'},{status:403,headers:noStore});
  try {
    const user=await verifiedNovvinUser();
    if (!user) return Response.json({error:'Inicia sesión con Novvin para usar el dictado.'},{status:401,headers:noStore});
    const config=upstreamConfiguration();
    if (!config) return Response.json({error:'El dictado no está disponible ahora. Puedes escribir tu mensaje.'},{status:503,headers:noStore});
    const type=req.headers.get('content-type')?.split(';')[0]||'';
    if (!/^audio\/(webm|ogg|wav|x-wav|mp4|mpeg)$/.test(type)) return Response.json({error:'Formato de grabación no compatible.'},{status:415,headers:noStore});
    if (Number(req.headers.get('content-length'))>2_000_000) return Response.json({error:'La grabación supera el tamaño permitido.'},{status:413,headers:noStore});
    const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
    if (!reader) return Response.json({error:'No se recibió audio.'},{status:400,headers:noStore});
    while (true) { const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000){await reader.cancel();return Response.json({error:'Graba como máximo 30 segundos.'},{status:413,headers:noStore});}chunks.push(value); }
    if(size<100)return Response.json({error:'La grabación está vacía. Comprueba tu micrófono.'},{status:400,headers:noStore});
    const response=await fetch(config.baseURL+'/audio/transcriptions',{method:'POST',headers:{'Content-Type':type,Authorization:'Bearer '+config.apiKey,'X-Elara-Account':createHmac('sha256',config.apiKey).update(user.id).digest('hex')},body:Buffer.concat(chunks),signal:AbortSignal.any([req.signal,AbortSignal.timeout(45_000)]),cache:'no-store'});
    const payload=await response.json();
    if (!response.ok) return Response.json({error:response.status===429?'El servidor está atendiendo otra consulta. Reintenta en unos segundos.':'No se pudo transcribir. Revisa la grabación e inténtalo otra vez.'},{status:response.status===429?429:503,headers:noStore});
    return Response.json({text:typeof payload.text==='string'?payload.text:''},{headers:noStore});
  } catch { return Response.json({error:'El dictado no pudo conectarse. Tu mensaje escrito sigue aquí; puedes volver a intentarlo.'},{status:503,headers:noStore}); }
}
