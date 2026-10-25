import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Never source .env or staging credentials in a production process. Production
// credentials must be injected explicitly by the deployment environment.
if (process.env.NODE_ENV !== 'production' && !process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  if (!process.env.SUPABASE_URL && process.env.NODE_ENV === 'staging') {
    dotenv.config({ path: path.resolve(__dirname, '../../../../.env.staging') });
  }
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const rawAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

// A valid Supabase key is either:
// 1. New Supabase API Key format: sb_secret_... (service role) or sb_publishable_... (anon)
// 2. Legacy Supabase JWT format: header.payload.signature (3 dot-separated parts)
export const isValidSupabaseKey = (token: string, type: 'service' | 'anon'): boolean => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (type === 'service' && trimmed.startsWith('sb_secret_')) return true;
  if (type === 'anon' && trimmed.startsWith('sb_publishable_')) return true;

  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: unknown };
    return type === 'service' ? payload.role === 'service_role' : payload.role === 'anon';
  } catch {
    return false;
  }
};

const hasValidServiceKey = isValidSupabaseKey(rawServiceKey, 'service');
const hasValidAnonKey = isValidSupabaseKey(rawAnonKey, 'anon');

// The server API performs privileged mutations. Production is not allowed to
// silently degrade to anon/RLS-only credentials or to a placeholder endpoint.
const resolvedKey = hasValidServiceKey ? rawServiceKey : (hasValidAnonKey ? rawAnonKey : 'unconfigured-key');
const isProductionConfigurationValid = !!supabaseUrl && hasValidServiceKey;
export let isSupabaseConfigured = !!supabaseUrl && (hasValidServiceKey || hasValidAnonKey);
export const isUsingServiceRole = hasValidServiceKey;

if (process.env.NODE_ENV === 'production' && !isProductionConfigurationValid) {
  throw new Error(
    'Supabase production configuration invalid: SUPABASE_URL and a valid SUPABASE_SERVICE_ROLE_KEY are required. Staging dotenv fallback and anon-key privilege degradation are prohibited.',
  );
}

if (process.env.NODE_ENV !== 'production' && !hasValidServiceKey && hasValidAnonKey) {
  console.warn('[Supabase API] Service-role key absent; using anon credentials in non-production mode only.');
}

export const setSupabaseConfiguredForTesting = (configured: boolean) => {
  isSupabaseConfigured = configured;
};

if (!hasValidServiceKey && hasValidAnonKey) {
  console.warn(
    '[Supabase API] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Falling back to SUPABASE_ANON_KEY. Administrative RLS bypass will be inactive.',
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://unconfigured.invalid',
  resolvedKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

