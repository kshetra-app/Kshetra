import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

const runtimeMode = (process.env.NODE_ENV ?? 'development').toLowerCase();
const isTestRuntime = runtimeMode === 'test';

// Local dotenv loading is limited to non-production development. Never load a
// staging file as an implicit fallback in a deployed runtime.
if (runtimeMode !== 'production' && !process.env.SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const configuredUrl = (process.env.SUPABASE_URL ?? '').trim();
const configuredServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const configuredAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const decoded = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload: unknown = JSON.parse(decoded);
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/**
 * Validate Supabase key type rather than accepting any three-part string.
 * Legacy JWT signatures are verified by Supabase at request time; this helper
 * validates structure and the expected role claim, not the signature itself.
 */
export const isValidSupabaseKey = (token: string, type: 'service' | 'anon'): boolean => {
  const value = token.trim();
  if (!value) return false;

  // New-format secret keys are server-only. New publishable keys are client-safe.
  if (type === 'service' && value.startsWith('sb_secret_')) return true;
  if (type === 'anon' && value.startsWith('sb_publishable_')) return true;

  const payload = decodeJwtPayload(value);
  if (!payload) return false;
  return type === 'service'
    ? payload.role === 'service_role'
    : payload.role === 'anon';
};

const hasValidServiceKey = isValidSupabaseKey(configuredServiceKey, 'service');
const hasValidAnonKey = isValidSupabaseKey(configuredAnonKey, 'anon');
const hasValidConfiguredKey = hasValidServiceKey || hasValidAnonKey;

if (!isTestRuntime && (!configuredUrl || !hasValidConfiguredKey)) {
  throw new Error(
    'CONFIG_ERROR: SUPABASE_URL and a structurally valid SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY are required. Placeholder clients are forbidden outside isolated tests.',
  );
}

if (runtimeMode === 'production' && !hasValidServiceKey) {
  throw new Error(
    'CONFIG_ERROR: Production API requires SUPABASE_SERVICE_ROLE_KEY with service_role scope. Falling back to anon/public credentials is forbidden.',
  );
}

export let isSupabaseConfigured = Boolean(configuredUrl && hasValidConfiguredKey);
export const isUsingServiceRole = hasValidServiceKey;

export const setSupabaseConfiguredForTesting = (configured: boolean) => {
  if (runtimeMode !== 'test') {
    throw new Error('TEST_ONLY: setSupabaseConfiguredForTesting may only be called in NODE_ENV=test.');
  }
  isSupabaseConfigured = configured;
};

if (!hasValidServiceKey && hasValidAnonKey && runtimeMode !== 'test') {
  console.warn(
    '[Supabase API] Running with anon/public credentials. Privileged operations must fail closed and must not be treated as database-administrator operations.',
  );
}

// Only tests may construct an isolated non-routable client when no credentials
// are intentionally supplied. Non-test configuration fails above.
const clientUrl = configuredUrl || 'https://supabase.test.invalid';
const clientKey = hasValidServiceKey
  ? configuredServiceKey
  : hasValidAnonKey
    ? configuredAnonKey
    : 'test-only-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
