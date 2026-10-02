/**
 * Canonical B2B Political SaaS & Partner Developer API Contracts
 * Master Execution Track — Job W021-G3
 * Specification: PLAN-W021-MASTER-REV-1.0.md
 */

export type SaasTenantTier = 'free' | 'pro' | 'enterprise';
export type SaasTenantStatus = 'active' | 'suspended' | 'revoked';
export type SaasAppEnvironment = 'live' | 'test';
export type SaasApiKeyStatus = 'active' | 'revoked' | 'compromised';

export interface SaasTierRateLimits {
  requestsPerMinute: number;
  monthlyCeiling: number;
}

export const SAAS_TIER_LIMITS: Record<SaasTenantTier, SaasTierRateLimits> = {
  free: {
    requestsPerMinute: 60,
    monthlyCeiling: 10_000,
  },
  pro: {
    requestsPerMinute: 600,
    monthlyCeiling: 500_000,
  },
  enterprise: {
    requestsPerMinute: 3_000,
    monthlyCeiling: 10_000_000,
  },
};

export interface SaasAuthContext {
  tenantId: string;
  tenantSlug: string;
  tenantTier: SaasTenantTier;
  applicationId: string;
  apiKeyId: string;
  keyPrefix: string;
  keyHint: string;
  environment: SaasAppEnvironment;
  scopes: string[];
  rateLimits: SaasTierRateLimits;
}
