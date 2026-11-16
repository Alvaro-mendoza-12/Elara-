import { avatarStoragePath } from '@/lib/novvin-profile';
import { novvinFetch, verifiedNovvinSession } from '@/lib/novvin-auth';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(req: Request) {
  try {
    const session = await verifiedNovvinSession(true);
    if (!session) return new Response(null, { status: 401, headers });
    if (new URL(req.url).searchParams.get('owner') !== session.user.id) return new Response(null, { status: 403, headers });
    const path = avatarStoragePath(session.user.avatarUrl);
    if (!path) return new Response(null, { status: 404, headers });
    const range = req.headers.get('range');
    const rangeHeaders: Record<string, string> = range && /^bytes=\d*-\d*$/.test(range) ? { Range: range } : {};
    const response = await novvinFetch(path, undefined, undefined, 'GET', session.accessToken, 30_000, rangeHeaders);
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!response.ok || !/^(?:image\/(png|jpeg|webp|avif|gif)|video\/(mp4|webm|quicktime|ogg))$/.test(type)) return new Response(null, { status: 404, headers });
    if (Number(response.headers.get('content-length')) > 25_000_000) return new Response(null, { status: 413, headers });
    const total = response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
    if (total && Number(total) > 25_000_000) return new Response(null, { status: 413, headers });
    const reader = response.body?.getReader();
    if (!reader) return new Response(null, { status: 404, headers });
    let size = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          size += value.byteLength;
          if (size > 25_000_000) { await reader.cancel(); controller.error(new Error('Avatar demasiado grande.')); return; }
          controller.enqueue(value);
        } catch (error) { controller.error(error); }
      },
      cancel(reason) { return reader.cancel(reason); },
    });
    return new Response(body, { status: response.status, headers: { ...headers, 'Content-Type': type, 'Accept-Ranges': 'bytes', ...(response.headers.get('content-range') ? { 'Content-Range': response.headers.get('content-range')! } : {}) } });
  } catch { return new Response(null, { status: 503, headers }); }
}
