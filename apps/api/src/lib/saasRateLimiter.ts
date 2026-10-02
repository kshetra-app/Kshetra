import type { SaasTenantTier, SaasTierRateLimits } from '@kshetra/shared';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  monthlyCount: number;
  currentMonth: string; // YYYY-MM
}

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  monthlyCeiling: number;
  monthlyRemaining: number;
  reason?: 'MINUTE_BURST_EXCEEDED' | 'MONTHLY_CEILING_EXCEEDED';
}

/**
 * In-Memory Token-Bucket & Monthly Window Rate Limiter for SaaS Authentication Gate.
 * Enforces burst clamping per minute and hard monthly quotas per tenant tier.
 */
export class SaasRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  private getCurrentMonthKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  public checkLimit(tenantId: string, tier: SaasTenantTier): RateLimitCheckResult {
    const limits: SaasTierRateLimits = SAAS_TIER_LIMITS[tier] || SAAS_TIER_LIMITS.free;
    const now = Date.now();
    const currentMonth = this.getCurrentMonthKey();

    let bucket = this.buckets.get(tenantId);
    if (!bucket) {
      bucket = {
        tokens: limits.requestsPerMinute,
        lastRefill: now,
        monthlyCount: 0,
        currentMonth,
      };
      this.buckets.set(tenantId, bucket);
    }

    // Reset monthly bucket if month changed
    if (bucket.currentMonth !== currentMonth) {
      bucket.currentMonth = currentMonth;
      bucket.monthlyCount = 0;
    }

    // Monthly quota check
    if (bucket.monthlyCount >= limits.monthlyCeiling) {
      return {
        allowed: false,
        limit: limits.requestsPerMinute,
        remaining: 0,
        resetSeconds: 60,
        monthlyCeiling: limits.monthlyCeiling,
        monthlyRemaining: 0,
        reason: 'MONTHLY_CEILING_EXCEEDED',
      };
    }

    // Refill tokens proportionally based on elapsed milliseconds
    const elapsedMs = now - bucket.lastRefill;
    const refillRatePerMs = limits.requestsPerMinute / 60_000;
    const tokensToAdd = elapsedMs * refillRatePerMs;
    bucket.tokens = Math.min(limits.requestsPerMinute, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const msUntilNextToken = Math.ceil((1 - bucket.tokens) / refillRatePerMs);
      const resetSec = Math.max(1, Math.ceil(msUntilNextToken / 1000));
      return {
        allowed: false,
        limit: limits.requestsPerMinute,
        remaining: 0,
        resetSeconds: resetSec,
        monthlyCeiling: limits.monthlyCeiling,
        monthlyRemaining: Math.max(0, limits.monthlyCeiling - bucket.monthlyCount),
        reason: 'MINUTE_BURST_EXCEEDED',
      };
    }

    // Consume 1 token
    bucket.tokens -= 1;
    bucket.monthlyCount += 1;

    return {
      allowed: true,
      limit: limits.requestsPerMinute,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: Math.ceil((limits.requestsPerMinute - bucket.tokens) / refillRatePerMs / 1000),
      monthlyCeiling: limits.monthlyCeiling,
      monthlyRemaining: Math.max(0, limits.monthlyCeiling - bucket.monthlyCount),
    };
  }

  public resetForTesting(): void {
    this.buckets.clear();
  }
}

export const saasRateLimiter = new SaasRateLimiter();
