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
      capabilities: info.mode === 'elara-core' ? ['web-prototypes', 'code-inspection', 'utilities'] : ['language-model'],
      generalLanguageModel: info.mode !== 'elara-core',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
