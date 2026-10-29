/**
 * Canonical B2B Political SaaS & Partner Developer API Contracts
 * Master Execution Track — Job W021-G3 & Job W051
 * Specification: PLAN-W021-MASTER-REV-1.0.md & PLAN-W051-MASTER-REV-1.0.md
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

export const SAAS_TIER_KEY_LIMITS: Record<SaasTenantTier, number> = {
  free: 2,
  pro: 5,
  enterprise: 20,
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

// ==============================================================================
// W051 CUSTOMER ACQUISITION & ONBOARDING CONTRACTS
// ==============================================================================

export interface SaasSignupRequest {
  name: string;
  email: string;
  organizationName: string;
  slug?: string;
  useCase?: 'media' | 'academic' | 'civic_tech' | 'campaign' | 'enterprise' | 'individual';
}

export interface SaasSignupResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    tier: SaasTenantTier;
    status: SaasTenantStatus;
    contactEmail: string;
    createdAt: string;
  };
  application: {
    id: string;
    name: string;
    environment: SaasAppEnvironment;
    createdAt: string;
  };
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    keyHint: string;
    environment: SaasAppEnvironment;
    scopes: string[];
    rawKey: string;
    notice: string;
  };
}

export interface SaasApiKeyCreateRequest {
  name: string;
  environment: SaasAppEnvironment;
  scopes?: string[];
  applicationId?: string;
}

export interface SaasApiKeyCreateResponse {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  environment: SaasAppEnvironment;
  scopes: string[];
  rawKey: string;
  createdAt: string;
  notice: string;
}

export interface SaasApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  environment: SaasAppEnvironment;
  scopes: string[];
  status: SaasApiKeyStatus;
  applicationId: string;
  applicationName?: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface SaasApiKeyRevokeResponse {
  id: string;
  status: 'revoked';
  revokedAt: string;
}

// ==============================================================================
// W051 COMMERCIAL BILLING & SUBSCRIPTIONS CONTRACTS
// ==============================================================================

export interface SaasBillingPlan {
  id: SaasTenantTier;
  name: string;
  tagline: string;
  priceINR: number;
  priceUSD: number;
  billingCycles: ('monthly' | 'annual')[];
  annualDiscountPercentage: number;
  rateLimits: SaasTierRateLimits;
  maxActiveKeys: number;
  features: string[];
  isPopular?: boolean;
}

export interface SaasBillingCheckoutRequest {
  targetTier: 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
}

export interface SaasBillingCheckoutResponse {
  orderId: string;
  targetTier: SaasTenantTier;
  billingCycle: 'monthly' | 'annual';
  amountINR: number;
  amountPaise: number;
  currency: string;
  razorpayKeyId: string;
  isSandbox: boolean;
  tenantSlug: string;
  notes: Record<string, string>;
}

export interface SaasBillingVerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  targetTier: 'pro' | 'enterprise';
  billingCycle?: 'monthly' | 'annual';
}

export interface SaasBillingVerifyResponse {
  success: boolean;
  tenantId: string;
  tenantSlug: string;
  previousTier: SaasTenantTier;
  currentTier: SaasTenantTier;
  subscriptionStatus: 'active';
  activatedAt: string;
  updatedRateLimits: SaasTierRateLimits;
}

export interface SaasBillingWebhookEvent {
  event: string;
  payload: Record<string, any>;
  signature?: string;
}

// ==============================================================================
// W051 USAGE & TELEMETRY CONTRACTS
// ==============================================================================

export interface SaasHourlyUsageBucket {
  hourBucket: string;
  requestCount: number;
  errorCount: number;
}

export interface SaasUsageSummaryResponse {
  tenantId: string;
  tenantSlug: string;
  tier: SaasTenantTier;
  billingPeriod: {
    start: string;
    end: string;
    secondsRemaining: number;
  };
  monthlyQuota: {
    ceiling: number;
    used: number;
    remaining: number;
    percentUsed: number;
  };
  burstRateLimit: {
    requestsPerMinute: number;
  };
  recentHourlyTrends: SaasHourlyUsageBucket[];
  serverTimestamp: string;
}
