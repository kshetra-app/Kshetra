function requiredClientConfig(name: string, value: string | undefined): string {
  const configuredValue = value?.trim();
  if (!configuredValue) {
    throw new Error(`Missing required web-admin configuration: ${name}`);
  }
  return configuredValue;
}

export const API_BASE_URL = requiredClientConfig('VITE_API_URL', import.meta.env.VITE_API_URL).replace(/\/+$/, '');
export const SUPABASE_URL = requiredClientConfig('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = requiredClientConfig('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY);
