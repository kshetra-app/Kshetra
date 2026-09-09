import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const rawAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

// A valid Supabase key is either:
// 1. New Supabase API Key format: sb_secret_... (service role) or sb_publishable_... (anon)
// 2. Legacy Supabase JWT format: header.payload.signature (3 dot-separated parts)
export const isValidSupabaseKey = (token: string, type: 'service' | 'anon'): boolean => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  if (type === 'service' && trimmed.startsWith('sb_secret_')) return true;
  if (type === 'anon' && (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sb_secret_'))) return true;
  return trimmed.split('.').length === 3;
};

const hasValidServiceKey = isValidSupabaseKey(rawServiceKey, 'service');
const hasValidAnonKey = isValidSupabaseKey(rawAnonKey, 'anon');

// Prefer service_role key if valid (JWT or sb_secret_); fall back to anon key to prevent total DB outage
const resolvedKey = hasValidServiceKey
  ? rawServiceKey
  : (hasValidAnonKey ? rawAnonKey : (rawServiceKey || 'placeholder-key'));

export const isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
export const isUsingServiceRole = hasValidServiceKey;

if (!hasValidServiceKey && hasValidAnonKey) {
  console.warn(
    '[Supabase API] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Falling back to SUPABASE_ANON_KEY. Administrative RLS bypass will be inactive.',
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  resolvedKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

