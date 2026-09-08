import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const rawAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

// A valid Supabase JWT token comprises header.payload.signature (3 dot-separated parts)
const isJwt = (token: string): boolean => token.split('.').length === 3;

const hasValidServiceKey = rawServiceKey.length > 0 && isJwt(rawServiceKey);
const hasValidAnonKey = rawAnonKey.length > 0 && isJwt(rawAnonKey);

// Prefer service_role key if valid JWT; fall back to anon key to prevent total DB outage
const resolvedKey = hasValidServiceKey
  ? rawServiceKey
  : (hasValidAnonKey ? rawAnonKey : (rawServiceKey || 'placeholder-key'));

export const isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
export const isUsingServiceRole = hasValidServiceKey;

if (!hasValidServiceKey && hasValidAnonKey && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[Supabase API] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing or not a valid JWT. Falling back to SUPABASE_ANON_KEY. Administrative RLS bypass will be inactive.',
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

