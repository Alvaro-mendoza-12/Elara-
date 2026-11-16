export type EngineMode = 'elara-core' | 'custom-server';

export function resolveEngineInfo(): {
  mode: EngineMode;
  label: string;
  modelName: string;
} {
  const upstreamUrl = process.env.ELARA_UPSTREAM_URL?.trim();
  if (upstreamUrl && process.env.ELARA_UPSTREAM_API_KEY?.trim()) {
    return {
      mode: 'custom-server',
      label: 'Elara 0.7',
      modelName: process.env.ELARA_UPSTREAM_MODEL?.trim() || 'elara-server',
    };
  }
  return {
    mode: 'elara-core',
    label: 'Elara Core 0.7',
    modelName: 'elara-core-v0.7',
  };
}

