import { resolveEngineInfo } from '@/lib/engine-info';
import { authConfigured } from '@/lib/novvin-auth';

export async function GET() {
  const info = resolveEngineInfo();
  return Response.json(
    {
      ok: true,
      name: 'ELARA',
      mode: info.mode,
      label: info.label,
      model: info.modelName,
      authMode: authConfigured() ? 'novvin-session' : 'guest',
      capabilities: ['web-prototypes', 'code-inspection', 'utilities', ...(info.mode === 'custom-server' ? ['language-model'] : [])],
      generalLanguageModel: info.mode !== 'elara-core',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
