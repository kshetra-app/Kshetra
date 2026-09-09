import { getEnvironmentConfig, resolveEnvironment } from '@kshetra/shared';

// Canonical resolution order: EXPO_PUBLIC_APP_ENV -> APP_ENV -> NODE_ENV -> 'development'
const rawEnv =
  process.env.EXPO_PUBLIC_APP_ENV ??
  process.env.APP_ENV ??
  process.env.NODE_ENV ??
  'development';

const config = getEnvironmentConfig(rawEnv);

export const CURRENT_ENVIRONMENT = resolveEnvironment(rawEnv);
export const IS_PRODUCTION = config.isProduction;
export const IS_STAGING = config.isStaging;
export const IS_DEVELOPMENT = config.isDevelopment;

export const DEFAULT_SUPABASE_URL = config.supabaseUrl;
export const DEFAULT_API_BASE_URL = config.apiBaseUrl;
