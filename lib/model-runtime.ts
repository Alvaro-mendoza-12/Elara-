import 'server-only';
import type { ModelAvailability } from './models';

export function upstreamConfiguration() {
  const raw = process.env.ELARA_UPSTREAM_URL?.trim();
  const apiKey = process.env.ELARA_UPSTREAM_API_KEY?.trim();
  if (!raw || !apiKey) return null;
  const parsed = new URL(raw);
  const local = process.env.VERCEL !== '1' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !local) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Configuración de inferencia no válida.');
  return { baseURL: raw.replace(/\/+$/, ''), apiKey, model: process.env.ELARA_UPSTREAM_MODEL?.trim() || 'elara-conversacion-v1' };
}

export async function modelAvailability(): Promise<ModelAvailability> {
  let configured = false;
  try {
    const config = upstreamConfiguration();
    if (!config) return { configured: false, ready: false, busy: false, base: null };
    configured = true;
    const response = await fetch(config.baseURL + '/models', { headers: { Authorization: 'Bearer ' + config.apiKey }, cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error('Runtime no disponible');
    const data = await response.json();
    return { configured: true, ready: Boolean(data.ready && data.data?.some((model: { id: string }) => model.id === config.model)), busy: Boolean(data.busy), base: 'Qwen3.5-2B' };
  } catch { return { configured, ready: false, busy: false, base: null }; }
}
