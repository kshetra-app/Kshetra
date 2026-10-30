/**
 * Canonical Developer Platform & B2B SaaS Contracts (JOB 062)
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 */

export type DeveloperOrgTier = 'free' | 'pro' | 'enterprise';
export type DeveloperOrgMemberRole = 'admin' | 'developer' | 'billing' | 'viewer';
export type DeveloperApiKeyEnvironment = 'live' | 'test';
export type DeveloperApiKeyStatus = 'active' | 'revoked' | 'compromised';

export interface DeveloperTierLimits {
  requestsPerMinute: number;
  monthlyCeiling: number;
  maxKeys: number;
  priceINRPerMonth: number;
}

export const DEVELOPER_TIER_CONFIGS: Record<DeveloperOrgTier, DeveloperTierLimits> = {
  free: {
    requestsPerMinute: 60,
    monthlyCeiling: 10_000,
    maxKeys: 2,
    priceINRPerMonth: 0,
  },
  pro: {
    requestsPerMinute: 600,
    monthlyCeiling: 500_000,
    maxKeys: 10,
    priceINRPerMonth: 4_999,
  },
  enterprise: {
    requestsPerMinute: 3_000,
    monthlyCeiling: 10_000_000,
    maxKeys: 50,
    priceINRPerMonth: 24_999,
  },
};

export interface DeveloperOrganizationDTO {
  id: string;
  name: string;
  slug: string;
  tier: DeveloperOrgTier;
  billingEmail: string;
  billingStatus: 'active' | 'past_due' | 'canceled';
  websiteUrl?: string | null;
  logoUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeveloperOrgRequest {
  name: string;
  slug?: string;
  billingEmail: string;
  tier?: DeveloperOrgTier;
  websiteUrl?: string;
  adminUserId: string;
}

export interface DeveloperOrgMemberDTO {
  id: string;
  organizationId: string;
  userId: string;
  role: DeveloperOrgMemberRole;
  joinedAt: string;
}

export interface AddDeveloperOrgMemberRequest {
  userId: string;
  role: DeveloperOrgMemberRole;
}

export interface DeveloperApiKeyDTO {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  environment: DeveloperApiKeyEnvironment;
  scopes: string[];
  status: DeveloperApiKeyStatus;
  rateLimitPerMinute: number;
  monthlyQuota: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeveloperApiKeyRequest {
  organizationId: string;
  name: string;
  environment?: DeveloperApiKeyEnvironment;
  scopes?: string[];
}

export interface CreateDeveloperApiKeyResponse {
  key: DeveloperApiKeyDTO;
  rawKey: string;
  notice: string;
}

export interface DeveloperUsageBucketDTO {
  hourBucket: string;
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface DeveloperUsageSummaryDTO {
  organizationId: string;
  tier: DeveloperOrgTier;
  monthlyQuota: {
    ceiling: number;
    used: number;
    remaining: number;
    percentUsed: number;
  };
  rateLimitPerMinute: number;
  trends: DeveloperUsageBucketDTO[];
  serverTimestamp: string;
}

export interface DeveloperBillingCheckoutRequest {
  organizationId: string;
  targetTier: 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
}

export interface DeveloperBillingCheckoutResponse {
  orderId: string;
  organizationId: string;
  targetTier: DeveloperOrgTier;
  amountINR: number;
  currency: string;
  razorpayKeyId: string;
  isSandbox: boolean;
}
