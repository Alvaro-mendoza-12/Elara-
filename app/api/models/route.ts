import { modelAvailability } from '@/lib/model-runtime';

export async function GET() {
  return Response.json(await modelAvailability(), { headers: { 'Cache-Control': 'no-store' } });
}
