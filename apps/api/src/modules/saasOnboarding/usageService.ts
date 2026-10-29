/**
 * apps/api/src/modules/saasOnboarding/usageService.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Real-time usage aggregation from public.saas_usage_ledger and quota telemetry.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SaasUsageSummaryResponse,
  SaasHourlyUsageBucket,
  SaasTenantTier,
} from '@kshetra/shared';
import { SAAS_TIER_LIMITS } from '@kshetra/shared';
import { supabase } from '../../lib/supabase';

export class UsageService {
  private dbClient: any = supabase;

  setDbClient(client: any): void {
    this.dbClient = client;
  }

  /**
   * Derives current UTC monthly window boundaries.
   */
  private getMonthlyTimeWindows(): {
    monthStart: Date;
    nextMonthStart: Date;
    secondsRemaining: number;
  } {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    const secondsRemaining = Math.max(0, Math.floor((nextMonthStart.getTime() - now.getTime()) / 1000));

    return {
      monthStart,
      nextMonthStart,
      secondsRemaining,
    };
  }

  /**
   * Aggregates monthly and recent hourly usage for an authenticated tenant.
   */
  async getUsageMetrics(tenantId: string, client: any = this.dbClient): Promise<SaasUsageSummaryResponse> {
    const { monthStart, nextMonthStart, secondsRemaining } = this.getMonthlyTimeWindows();

    // 1. Fetch Tenant Context & Tier
    const { data: tenant, error: tenantErr } = await client
      .from('saas_tenants')
      .select('id, slug, tier, status')
      .eq('id', tenantId)
      .single();

    if (tenantErr || !tenant) {
      throw new Error(`Tenant not found: ${tenantErr?.message || 'Invalid tenant context'}`);
    }

    const tier = (tenant.tier as SaasTenantTier) || 'free';
    const rateLimits = SAAS_TIER_LIMITS[tier] || SAAS_TIER_LIMITS.free;

    // 2. Query Total Monthly Usage from saas_usage_ledger
    const { data: monthlyRows, error: monthlyErr } = await client
      .from('saas_usage_ledger')
      .select('request_count')
      .eq('tenant_id', tenantId)
      .gte('hour_bucket', monthStart.toISOString());

    if (monthlyErr) {
      throw new Error(`Failed to query monthly usage ledger: ${monthlyErr.message}`);
    }

    const totalUsed = (monthlyRows || []).reduce((acc: number, row: any) => acc + (row.request_count || 0), 0);
    const ceiling = rateLimits.monthlyCeiling;
    const remaining = Math.max(0, ceiling - totalUsed);
    const percentUsed = ceiling > 0 ? Math.min(100, Math.round((totalUsed / ceiling) * 10000) / 100) : 0;

    // 3. Query Recent Hourly Breakdown (Last 24 Hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: hourlyRows, error: hourlyErr } = await client
      .from('saas_usage_ledger')
      .select('hour_bucket, request_count, error_count')
      .eq('tenant_id', tenantId)
      .gte('hour_bucket', twentyFourHoursAgo.toISOString())
      .order('hour_bucket', { ascending: true });

    if (hourlyErr) {
      throw new Error(`Failed to query recent hourly trends: ${hourlyErr.message}`);
    }

    const recentHourlyTrends: SaasHourlyUsageBucket[] = (hourlyRows || []).map((row: any) => ({
      hourBucket: row.hour_bucket,
      requestCount: row.request_count || 0,
      errorCount: row.error_count || 0,
    }));

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tier,
      billingPeriod: {
        start: monthStart.toISOString(),
        end: nextMonthStart.toISOString(),
        secondsRemaining,
      },
      monthlyQuota: {
        ceiling,
        used: totalUsed,
        remaining,
        percentUsed,
      },
      burstRateLimit: {
        requestsPerMinute: rateLimits.requestsPerMinute,
      },
      recentHourlyTrends,
      serverTimestamp: new Date().toISOString(),
    };
  }
}

export const usageService = new UsageService();
