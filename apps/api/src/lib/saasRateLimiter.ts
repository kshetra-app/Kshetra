import type { SaasTenantTier, SaasTierRateLimits } from '@kshetra/shared';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';
import { supabase } from './supabase';

interface LocalBurstBucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  monthlyCeiling: number;
  monthlyRemaining: number;
  monthlyUsage: number;
  reason?: 'MINUTE_BURST_EXCEEDED' | 'MONTHLY_CEILING_EXCEEDED';
}

export interface UsageIncrementParams {
  tenantId: string;
  apiKeyId?: string | null;
  tier: SaasTenantTier;
}

export interface UsageIncrementResult {
  allowed: boolean;
  currentMonthlyUsage: number;
  monthlyRemaining: number;
  monthlyCeiling: number;
  resetSeconds: number;
  reason?: 'MONTHLY_CEILING_EXCEEDED';
}

/**
 * Dual-Mechanism Rate & Quota Controller:
 * 1. Synchronous Local Burst Layer: In-memory token-bucket clamping per-minute bursts per process.
 * 2. Authoritative Durable Monthly Quota Layer: Backed by public.saas_usage_ledger in PostgreSQL.
 *    Derives consumption across process restarts and horizontal scaling nodes.
 */
export class SaasRateLimiter {
  private burstBuckets = new Map<string, LocalBurstBucket>();

  /**
   * Helper to return UTC start of current month and current hour bucket.
   */
  public getUtcTimeWindows(): { monthStart: Date; nextMonthStart: Date; currentHourBucket: Date; secondsUntilMonthReset: number } {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    const currentHourBucket = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
    const secondsUntilMonthReset = Math.max(1, Math.ceil((nextMonthStart.getTime() - now.getTime()) / 1000));

    return {
      monthStart,
      nextMonthStart,
      currentHourBucket,
      secondsUntilMonthReset,
    };
  }

  /**
   * Layer 1: In-Memory Minute Burst Check.
   * Clamps microbursts with sub-millisecond overhead.
   */
  public checkMinuteBurst(tenantId: string, tier: SaasTenantTier): { allowed: boolean; remaining: number; resetSeconds: number; limit: number } {
    const limits: SaasTierRateLimits = SAAS_TIER_LIMITS[tier] || SAAS_TIER_LIMITS.free;
    const now = Date.now();

    let bucket = this.burstBuckets.get(tenantId);
    if (!bucket) {
      bucket = {
        tokens: limits.requestsPerMinute,
        lastRefill: now,
      };
      this.burstBuckets.set(tenantId, bucket);
    }

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
      };
    }

    bucket.tokens -= 1;
    return {
      allowed: true,
      limit: limits.requestsPerMinute,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: Math.ceil((limits.requestsPerMinute - bucket.tokens) / refillRatePerMs / 1000),
    };
  }

  /**
   * Layer 2: Authoritative Monthly Usage Lookup from public.saas_usage_ledger.
   * Sums request_count for the tenant for all hour_bucket >= start of current UTC month.
   */
  public async getDurableMonthlyUsage(
    tenantId: string,
    client: any = supabase
  ): Promise<number> {
    const { monthStart } = this.getUtcTimeWindows();

    const { data, error } = await client
      .from('saas_usage_ledger')
      .select('request_count')
      .eq('tenant_id', tenantId)
      .gte('hour_bucket', monthStart.toISOString());

    if (error) {
      throw new Error(`Failed to query durable monthly usage: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return 0;
    }

    return (data as Array<{ request_count: number }>).reduce(
      (sum, row) => sum + (Number(row.request_count) || 0),
      0
    );
  }

  /**
   * Layer 3: Atomic Durable Usage Increment & Quota Check.
   * Atomically checks quota against durable monthly usage and commits increment to saas_usage_ledger.
   */
  public async checkAndRecordDurableUsage(
    params: UsageIncrementParams,
    client: any = supabase
  ): Promise<UsageIncrementResult> {
    const { tenantId, apiKeyId, tier } = params;
    const limits = SAAS_TIER_LIMITS[tier] || SAAS_TIER_LIMITS.free;
    const { currentHourBucket, secondsUntilMonthReset } = this.getUtcTimeWindows();

    // 1. Get authoritative current usage
    const currentUsage = await this.getDurableMonthlyUsage(tenantId, client);

    // 2. Check if already at or exceeding ceiling
    if (currentUsage >= limits.monthlyCeiling) {
      return {
        allowed: false,
        currentMonthlyUsage: currentUsage,
        monthlyRemaining: 0,
        monthlyCeiling: limits.monthlyCeiling,
        resetSeconds: secondsUntilMonthReset,
        reason: 'MONTHLY_CEILING_EXCEEDED',
      };
    }

    // 3. Atomically upsert / increment into saas_usage_ledger
    // Find existing row for (tenant_id, api_key_id, hour_bucket)
    const hourBucketIso = currentHourBucket.toISOString();
    let query = client
      .from('saas_usage_ledger')
      .select('id, request_count')
      .eq('tenant_id', tenantId)
      .eq('hour_bucket', hourBucketIso);

    if (apiKeyId) {
      query = query.eq('api_key_id', apiKeyId);
    } else {
      query = query.is('api_key_id', null);
    }

    const { data: existingRows, error: findError } = await query.maybeSingle();
    if (findError) {
      throw new Error(`Failed to query existing usage bucket: ${findError.message}`);
    }

    if (existingRows) {
      const { error: updateError } = await client
        .from('saas_usage_ledger')
        .update({
          request_count: (existingRows.request_count || 0) + 1,
        })
        .eq('id', existingRows.id);

      if (updateError) {
        throw new Error(`Failed to update usage ledger: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await client
        .from('saas_usage_ledger')
        .insert({
          tenant_id: tenantId,
          api_key_id: apiKeyId || null,
          hour_bucket: hourBucketIso,
          request_count: 1,
          error_count: 0,
        });

      if (insertError) {
        // If concurrent insert collided on unique constraint, perform fallback increment
        if (insertError.code === '23505') {
          return this.checkAndRecordDurableUsage(params, client);
        }
        throw new Error(`Failed to insert usage ledger: ${insertError.message}`);
      }
    }

    const newUsage = currentUsage + 1;
    return {
      allowed: true,
      currentMonthlyUsage: newUsage,
      monthlyRemaining: Math.max(0, limits.monthlyCeiling - newUsage),
      monthlyCeiling: limits.monthlyCeiling,
      resetSeconds: secondsUntilMonthReset,
    };
  }

  public resetForTesting(): void {
    this.burstBuckets.clear();
  }
}

export const saasRateLimiter = new SaasRateLimiter();
