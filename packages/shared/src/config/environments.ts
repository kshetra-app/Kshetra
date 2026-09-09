export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentConfig {
  environment: Environment;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  apiBaseUrl: string;
  supabaseUrl: string;
  allowedOrigins: string[];
}

export const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    environment: 'development',
    isProduction: false,
    isStaging: false,
    isDevelopment: true,
    apiBaseUrl: 'http://localhost:3001',
    supabaseUrl: 'http://localhost:54321',
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:5173',
    ],
  },
  staging: {
    environment: 'staging',
    isProduction: false,
    isStaging: true,
    isDevelopment: false,
    apiBaseUrl: 'https://staging-api.kshetra.in',
    supabaseUrl: 'https://staging-db.kshetra.in',
    allowedOrigins: [
      'https://staging.kshetra.in',
      'https://staging.panin.in',
      'http://localhost:8081',
      'http://localhost:3000',
    ],
  },
  production: {
    environment: 'production',
    isProduction: true,
    isStaging: false,
    isDevelopment: false,
    apiBaseUrl: 'https://kshetra-api-production-9f06.up.railway.app',
    supabaseUrl: 'https://cxhyqjfelcwkavbqwqap.supabase.co',
    allowedOrigins: [
      'https://kshetra.in',
      'https://www.kshetra.in',
      'https://panin.in',
      'https://www.panin.in',
      'https://kshetra.app',
      'https://www.kshetra.app',
      'http://localhost:8081',
    ],
  },
  test: {
    environment: 'test',
    isProduction: false,
    isStaging: false,
    isDevelopment: false,
    apiBaseUrl: 'http://127.0.0.1:3001',
    supabaseUrl: 'http://127.0.0.1:54321',
    allowedOrigins: ['*'],
  },
};

export function resolveEnvironment(envStr?: string): Environment {
  const norm = (envStr ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase().trim();
  if (norm === 'prod' || norm === 'production') return 'production';
  if (norm === 'stage' || norm === 'staging') return 'staging';
  if (norm === 'test') return 'test';
  return 'development';
}

export function getEnvironmentConfig(envStr?: string): EnvironmentConfig {
  const env = resolveEnvironment(envStr);
  return ENVIRONMENT_CONFIGS[env];
}
