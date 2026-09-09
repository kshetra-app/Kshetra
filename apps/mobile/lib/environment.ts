import { getEnvironmentConfig, resolveEnvironment } from '@kshetra/shared';

const envName = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const config = getEnvironmentConfig(envName);

export const CURRENT_ENVIRONMENT = resolveEnvironment(envName);
export const IS_PRODUCTION = config.isProduction;
export const IS_STAGING = config.isStaging;
export const IS_DEVELOPMENT = config.isDevelopment;

export const DEFAULT_SUPABASE_URL = config.supabaseUrl;
export const DEFAULT_API_BASE_URL = config.apiBaseUrl;
