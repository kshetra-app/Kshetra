import { getEnvironmentConfig } from '@kshetra/shared';

export function resolveCorsOrigin(env: NodeJS.ProcessEnv): boolean | string[] {
  const configured = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  // Railway runs Node in production mode in both environments. Its environment
  // name is authoritative; a mobile/client setting cannot reopen Production CORS.
  const deployment = (env.RAILWAY_ENVIRONMENT_NAME || env.APP_ENV || '').trim().toLowerCase();
  const staging = deployment === 'staging';
  const production = deployment === 'production' || env.NODE_ENV === 'production';
  if (!staging && !production && configured.length === 0) return true;

  const defaults = getEnvironmentConfig(staging ? 'staging' : 'production').allowedOrigins;
  return [...new Set([...defaults, ...configured])];
}
