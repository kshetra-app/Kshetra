import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { SaasAuthContext, SaasTenantTier, SaasAppEnvironment } from '@kshetra/shared';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';
import { supabase } from '../lib/supabase';
import { parseAndValidateApiKeyFormat, verifyApiKeyHashConstantTime } from '../lib/saasCrypto';
import { saasRateLimiter } from '../lib/saasRateLimiter';
import { sendApiError } from '../lib/replyHelper';

declare module 'fastify' {
  interface FastifyRequest {
    saasAuth?: SaasAuthContext;
  }
}

export interface SaasAuthPluginOptions {
  enforceRateLimit?: boolean;
  requiredScopes?: string[];
  mockLookup?: (keyHash: string) => Promise<any | null>;
  mockUsageRecorder?: (params: { tenantId: string; apiKeyId?: string | null; tier: SaasTenantTier }) => Promise<{
    allowed: boolean;
    currentMonthlyUsage: number;
    monthlyRemaining: number;
    monthlyCeiling: number;
    resetSeconds: number;
    reason?: 'MONTHLY_CEILING_EXCEEDED';
  }>;
  customClient?: any;
}

/**
 * Extracts API key from request headers.
 * Looks for 'x-api-key' or Authorization 'Bearer ...'.
 * Never logs or reveals the raw key.
 */
export function extractRawApiKey(req: FastifyRequest): string | null {
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim().startsWith('Bearer ')) {
    const token = authHeader.trim().slice(7).trim();
    if (token.length > 0) {
      return token;
    }
  }

  return null;
}

/**
 * Fastify preHandler hook for authenticating SaaS B2B Partner API requests.
 */
export async function authenticateSaasRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options?: SaasAuthPluginOptions
): Promise<void> {
  const rawKey = extractRawApiKey(request);

  if (!rawKey) {
    request.log.warn({
      event: 'SAAS_AUTH_MISSING_CREDENTIALS',
      url: request.url,
      method: request.method,
    }, 'Missing API key credentials in SaaS request');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 1. Parse and validate syntax format
  const parsedKey = parseAndValidateApiKeyFormat(rawKey);
  if (!parsedKey) {
    request.log.warn({
      event: 'SAAS_AUTH_MALFORMED_KEY',
      url: request.url,
      method: request.method,
    }, 'Malformed API key format presented');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 2. Lookup key record in database
  let keyRecord: any = null;
  try {
    if (options?.mockLookup) {
      keyRecord = await options.mockLookup(parsedKey.keyHash);
    } else {
      const { data, error } = await supabase
        .from('saas_api_keys')
        .select(`
          id,
          tenant_id,
          application_id,
          key_prefix,
          key_hint,
          key_hash,
          scopes,
          status,
          expires_at,
          revoked_at,
          saas_tenants!inner (
            id,
            slug,
            tier,
            status
          ),
          saas_applications!inner (
            id,
            tenant_id,
            environment
          )
        `)
        .eq('key_hash', parsedKey.keyHash)
        .maybeSingle();

      if (error) {
        request.log.error({
          event: 'SAAS_AUTH_DATABASE_ERROR',
          errorMessage: error.message,
          url: request.url,
        }, 'Database lookup failed during SaaS API key authentication');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'An unexpected error occurred. Please try again later.', {
          code: 'AUTH_DEPENDENCY_FAILURE',
        });
      }
      keyRecord = data;
    }
  } catch (err: any) {
    request.log.error({
      event: 'SAAS_AUTH_EXCEPTION',
      errorMessage: err.message,
      url: request.url,
    }, 'Unexpected exception during SaaS key lookup');
    return sendApiError(reply, request, 500, 'Internal Server Error', 'An unexpected error occurred. Please try again later.', {
      code: 'AUTH_DEPENDENCY_FAILURE',
    });
  }

  if (!keyRecord) {
    request.log.warn({
      event: 'SAAS_AUTH_KEY_NOT_FOUND',
      keyPrefix: parsedKey.keyPrefix,
      keyHint: parsedKey.keyHint,
      url: request.url,
    }, 'API key record not found for presented hash');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 3. Constant-time hash verification
  const isHashMatch = verifyApiKeyHashConstantTime(keyRecord.key_hash, parsedKey.keyHash);
  if (!isHashMatch) {
    request.log.warn({
      event: 'SAAS_AUTH_HASH_MISMATCH',
      url: request.url,
    }, 'Constant-time hash comparison failed');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 4. Enforce Key Status (active vs revoked vs compromised)
  if (keyRecord.status !== 'active') {
    request.log.warn({
      event: 'SAAS_AUTH_INACTIVE_KEY',
      keyStatus: keyRecord.status,
      keyHint: parsedKey.keyHint,
      url: request.url,
    }, `API key has inactive status: ${keyRecord.status}`);
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 5. Enforce Expiration
  if (keyRecord.expires_at) {
    const expiresAt = new Date(keyRecord.expires_at).getTime();
    if (expiresAt < Date.now()) {
      request.log.warn({
        event: 'SAAS_AUTH_EXPIRED_KEY',
        keyHint: parsedKey.keyHint,
        expiresAt: keyRecord.expires_at,
        url: request.url,
      }, 'API key has expired');
      return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
        code: 'UNAUTHORIZED',
      });
    }
  }

  // 6. Enforce Tenant Status
  const tenant = keyRecord.saas_tenants;
  if (!tenant || tenant.status !== 'active') {
    request.log.warn({
      event: 'SAAS_AUTH_INACTIVE_TENANT',
      tenantStatus: tenant?.status,
      url: request.url,
    }, 'SaaS tenant is inactive or suspended');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 7. Enforce Tenant / Application Composite Isolation
  const application = keyRecord.saas_applications;
  if (!application || application.tenant_id !== tenant.id) {
    request.log.error({
      event: 'SAAS_AUTH_TENANT_ISOLATION_BREACH_ATTEMPT',
      appTenantId: application?.tenant_id,
      expectedTenantId: tenant.id,
      url: request.url,
    }, 'CRITICAL: Tenant isolation mismatch detected in key record');
    return sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or inactive API key provided.', {
      code: 'UNAUTHORIZED',
    });
  }

  // 8. Scope checking if required
  if (options?.requiredScopes && options.requiredScopes.length > 0) {
    const keyScopes = (keyRecord.scopes || []) as string[];
    const hasAllScopes = options.requiredScopes.every((s) => keyScopes.includes(s));
    if (!hasAllScopes) {
      request.log.warn({
        event: 'SAAS_AUTH_INSUFFICIENT_SCOPES',
        requiredScopes: options.requiredScopes,
        keyScopes,
        url: request.url,
      }, 'API key lacks required scopes for requested operation');
      return sendApiError(reply, request, 403, 'Forbidden', 'API key lacks required permissions.', {
        code: 'FORBIDDEN',
      });
    }
  }

  // 9. Rate Limiting: Dual-Mechanism Burst & Durable Monthly Quota Check
  const tier = (tenant.tier || 'free') as SaasTenantTier;
  const dbClient = options?.customClient || supabase;

  // 9A. Local In-Memory Burst Check
  const burstResult = saasRateLimiter.checkMinuteBurst(tenant.id, tier);
  reply.header('x-ratelimit-limit', burstResult.limit);
  reply.header('x-ratelimit-remaining', burstResult.remaining);
  reply.header('x-ratelimit-reset', burstResult.resetSeconds);

  if (options?.enforceRateLimit !== false && !burstResult.allowed) {
    request.log.warn({
      event: 'SAAS_AUTH_BURST_RATE_LIMIT_EXCEEDED',
      tenantId: tenant.id,
      tier,
      url: request.url,
    }, `Minute burst limit exceeded for tenant ${tenant.id}`);

    reply.header('Retry-After', burstResult.resetSeconds);
    return sendApiError(reply, request, 429, 'Too Many Requests', 'Rate limit exceeded. Please retry after the designated cooldown window.', {
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  // 9B. Authoritative Durable Monthly Quota Check & Ledger Increment
  if (options?.enforceRateLimit !== false) {
    try {
      let durableResult;
      if (options?.mockUsageRecorder) {
        durableResult = await options.mockUsageRecorder({
          tenantId: tenant.id,
          apiKeyId: keyRecord.id,
          tier,
        });
      } else {
        durableResult = await saasRateLimiter.checkAndRecordDurableUsage({
          tenantId: tenant.id,
          apiKeyId: keyRecord.id,
          tier,
        }, dbClient);
      }

      reply.header('x-monthly-quota-limit', durableResult.monthlyCeiling);
      reply.header('x-monthly-quota-remaining', durableResult.monthlyRemaining);

      if (!durableResult.allowed) {
        request.log.warn({
          event: 'SAAS_AUTH_MONTHLY_QUOTA_EXCEEDED',
          tenantId: tenant.id,
          tier,
          monthlyUsage: durableResult.currentMonthlyUsage,
          ceiling: durableResult.monthlyCeiling,
          url: request.url,
        }, `Authoritative monthly quota exceeded for tenant ${tenant.id}`);

        reply.header('Retry-After', durableResult.resetSeconds);
        return sendApiError(reply, request, 429, 'Too Many Requests', 'Monthly quota exceeded. Please upgrade tier or await monthly window reset.', {
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }
    } catch (err: any) {
      request.log.error({
        event: 'SAAS_AUTH_USAGE_LEDGER_ERROR',
        errorMessage: err.message,
        url: request.url,
      }, 'Failed to record durable usage in saas_usage_ledger; failing closed');
      return sendApiError(reply, request, 500, 'Internal Server Error', 'An unexpected error occurred. Please try again later.', {
        code: 'AUTH_DEPENDENCY_FAILURE',
      });
    }
  }

  // 10. Bind Authenticated Context to Request
  const authContext: SaasAuthContext = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantTier: tier,
    applicationId: application.id,
    apiKeyId: keyRecord.id,
    keyPrefix: keyRecord.key_prefix,
    keyHint: keyRecord.key_hint,
    environment: application.environment as SaasAppEnvironment,
    scopes: keyRecord.scopes || [],
    rateLimits: SAAS_TIER_LIMITS[tier] || SAAS_TIER_LIMITS.free,
  };

  request.saasAuth = authContext;

  request.log.info({
    event: 'SAAS_AUTH_SUCCESS',
    tenantId: authContext.tenantId,
    appId: authContext.applicationId,
    tier: authContext.tenantTier,
    keyHint: authContext.keyHint,
  }, 'SaaS request authenticated successfully');
}

/**
 * Fastify plugin wrapping SaaS authentication.
 */
const saasAuthPluginAsync: FastifyPluginAsync<SaasAuthPluginOptions> = async (fastify, options) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Only execute on SaaS route family (/api/vsaas/...)
    if (request.url.startsWith('/api/vsaas/')) {
      await authenticateSaasRequest(request, reply, options);
    }
  });
};

export const saasAuthPlugin = fp(saasAuthPluginAsync, {
  name: 'saas-auth-plugin',
  fastify: '5.x',
});
