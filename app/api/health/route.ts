export type EngineMode = 'elara-core' | 'custom-server' | 'ai-gateway';

export function resolveEngineInfo(): {
  mode: EngineMode;
  label: string;
  modelName: string;
} {
  const upstreamUrl = process.env.ELARA_UPSTREAM_URL?.trim();
  if (upstreamUrl) {
    return {
      mode: 'custom-server',
      label: 'Servidor Propio',
      modelName: process.env.ELARA_UPSTREAM_MODEL?.trim() || 'elara-server',
    };
  }
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const gatewayModel = process.env.ELARA_GATEWAY_MODEL?.trim();
  if (gatewayKey && gatewayModel) {
    return {
      mode: 'ai-gateway',
      label: 'AI Gateway',
      modelName: gatewayModel,
    };
  }
  return {
    mode: 'elara-core',
    label: 'Elara Core v0.3',
    modelName: 'elara-core-v0.3',
  };
}

export async function GET() {
  const info = resolveEngineInfo();
  return Response.json(
    {
      ok: true,
      name: 'ELARA',
      mode: info.mode,
      label: info.label,
      model: info.modelName,
      authMode: 'guest',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
