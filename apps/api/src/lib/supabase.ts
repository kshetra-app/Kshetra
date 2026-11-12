import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  if (!process.env.SUPABASE_URL) {
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
  if (trimmed.length === 0) return false;
  if (type === 'service' && trimmed.startsWith('sb_secret_')) return true;
  if (
    type === 'anon' &&
    (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sb_secret_'))
  )
    return true;
  return trimmed.split('.').length === 3;
};

const hasValidServiceKey = isValidSupabaseKey(rawServiceKey, 'service');
const hasValidAnonKey = isValidSupabaseKey(rawAnonKey, 'anon');

/**
 * Public reads must never reuse the privileged server client. Accept a
 * publishable key or a legacy JWT whose role is explicitly `anon`; reject
 * `sb_secret_` keys and service-role JWTs even if they were put in the anon
 * environment variable by mistake.
 */
export function isPublicSupabaseAnonKey(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.startsWith('sb_publishable_')) return true;
  if (!trimmed || trimmed.startsWith('sb_secret_')) return false;

  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;

  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      role?: unknown;
    };
    return claims.role === 'anon';
  } catch {
    return false;
  }
}

// Prefer service_role key if valid (JWT or sb_secret_); fall back to anon key to prevent total DB outage
const resolvedKey = hasValidServiceKey
  ? rawServiceKey
  : hasValidAnonKey
    ? rawAnonKey
    : rawServiceKey || 'placeholder-key';

export let isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
export const isUsingServiceRole = hasValidServiceKey;
export const isPublicSupabaseConfigured = !!(supabaseUrl && isPublicSupabaseAnonKey(rawAnonKey));

/** Read the mutable configuration state, including the isolated-test override. */
export function isSupabaseAvailable(): boolean {
  return isSupabaseConfigured;
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
  supabaseUrl || 'https://placeholder.supabase.co',
  resolvedKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/** A separate least-privilege client for data intentionally exposed to visitors. */
export const publicSupabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  isPublicSupabaseConfigured ? rawAnonKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
