/**
 * Dedicated PostgREST identity for the W022 queue worker.
 * Role webhook_worker has no direct table privileges and can call only bounded queue RPCs.
 */
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface WebhookWorkerClientConfig {
  supabaseUrl: string;
  apiKey: string;
  jwtSecret: string;
  fetchImpl?: typeof fetch;
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function createWebhookWorkerJwt(jwtSecret: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('WEBHOOK_WORKER_AUTH_NOT_CONFIGURED: Supabase JWT signing secret is missing or too short.');
  }
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: 'supabase', aud: 'authenticated', role: 'webhook_worker',
    sub: 'panin-webhook-worker', iat: nowSeconds, exp: nowSeconds + 60,
  }));
  const unsigned = header + '.' + payload;
  return unsigned + '.' + crypto.createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
}

export function createWebhookWorkerFetch(
  jwtSecret: string,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    headers.set('Authorization', 'Bearer ' + createWebhookWorkerJwt(jwtSecret));
    return fetchImpl(input, { ...init, headers });
  };
}

export function assertWebhookWorkerRuntimeConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_JWT_SECRET) {
    throw new Error('WEBHOOK_WORKER_CONFIGURATION_INVALID: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_JWT_SECRET are required.');
  }
  if (!env.WEBHOOK_SECRETS_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(env.WEBHOOK_SECRETS_ENCRYPTION_KEY)) {
    throw new Error('WEBHOOK_WORKER_CONFIGURATION_INVALID: WEBHOOK_SECRETS_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64 hex characters.');
  }
}

export function createWebhookWorkerClient(config?: WebhookWorkerClientConfig): SupabaseClient {
  const resolved = config ?? {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    apiKey: process.env.SUPABASE_ANON_KEY ?? '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  };
  if (!resolved.supabaseUrl || !resolved.apiKey || !resolved.jwtSecret) {
    throw new Error('WEBHOOK_WORKER_CONFIGURATION_INVALID: Supabase URL, anon API key, and JWT signing secret are required.');
  }
  return createClient(resolved.supabaseUrl, resolved.apiKey, {
    global: { fetch: createWebhookWorkerFetch(resolved.jwtSecret, resolved.fetchImpl) },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let cachedWorkerClient: SupabaseClient | undefined;
export function getWebhookWorkerClient(): SupabaseClient {
  if (!cachedWorkerClient) cachedWorkerClient = createWebhookWorkerClient();
  return cachedWorkerClient;
}
