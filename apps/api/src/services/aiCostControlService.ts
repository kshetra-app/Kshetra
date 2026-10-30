/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: AI Cost Control, Budgeting & Circuit Breaker Service (JOB 071)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AINewsSummaryService, type AICostLedgerEntry } from './aiNewsSummaryService';
import type { TenantAIBudget, AICostReport } from '@kshetra/shared';

export class AICostControlService {
  // In-memory fallback budget store for tests & offline environments
  private static budgetStore = new Map<string, TenantAIBudget>();

  static resetForTesting(): void {
    this.budgetStore.clear();
  }

  /** Get or initialize tenant AI budget */
  static async getTenantBudget(tenantId = 'default_tenant'): Promise<TenantAIBudget> {
    const now = new Date();

    let budget = this.budgetStore.get(tenantId);
    if (!budget) {
      // Check Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('ai_tenant_budgets')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (!error && data) {
            budget = {
              tenantId: data.tenant_id,
              tier: data.tier,
              dailyTokenBudget: data.daily_token_budget,
              dailySpendLimitUsd: Number(data.daily_spend_limit_usd),
              currentDayTokens: data.current_day_tokens,
              currentDaySpendUsd: Number(data.current_day_spend_usd),
              circuitBreakerTripped: data.circuit_breaker_tripped,
              resetAt: data.reset_at,
            };
          }
        } catch {
          // Table may not yet exist on remote
        }
      }

      if (!budget) {
        budget = {
          tenantId,
          tier: 'free',
          dailyTokenBudget: 100000,
          dailySpendLimitUsd: 5.0,
          currentDayTokens: 0,
          currentDaySpendUsd: 0,
          circuitBreakerTripped: false,
          resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      this.budgetStore.set(tenantId, budget);
    }

    // Check if reset period expired
    if (new Date(budget.resetAt) <= now) {
      const nextReset = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      budget = {
        ...budget,
        currentDayTokens: 0,
        currentDaySpendUsd: 0,
        circuitBreakerTripped: false,
        resetAt: nextReset,
      };
      this.budgetStore.set(tenantId, budget);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('ai_tenant_budgets')
            .update({
              current_day_tokens: 0,
              current_day_spend_usd: 0,
              circuit_breaker_tripped: false,
              reset_at: nextReset,
              updated_at: now.toISOString(),
            })
            .eq('tenant_id', tenantId);
        } catch {
          // Suppress
        }
      }
    }

    return { ...budget };
  }

  /** Check if tenant has remaining budget before execution; trip circuit breaker fail-closed if exceeded */
  static async checkBudget(
    tenantId = 'default_tenant',
    estimatedTokens = 1000,
  ): Promise<{ allowed: boolean; reason?: string; resetInSeconds?: number }> {
    const budget = await this.getTenantBudget(tenantId);
    const now = new Date();
    const resetTime = new Date(budget.resetAt).getTime();
    const resetInSeconds = Math.max(1, Math.ceil((resetTime - now.getTime()) / 1000));

    if (budget.circuitBreakerTripped) {
      return {
        allowed: false,
        reason: 'AI_CIRCUIT_BREAKER_TRIPPED: Daily tenant token budget exhausted.',
        resetInSeconds,
      };
    }

    if (budget.currentDayTokens + estimatedTokens > budget.dailyTokenBudget) {
      await this.tripCircuitBreaker(tenantId);
      return {
        allowed: false,
        reason: `AI_BUDGET_EXCEEDED: Request exceeds daily limit of ${budget.dailyTokenBudget.toLocaleString()} tokens.`,
        resetInSeconds,
      };
    }

    if (budget.currentDaySpendUsd >= budget.dailySpendLimitUsd) {
      await this.tripCircuitBreaker(tenantId);
      return {
        allowed: false,
        reason: `AI_SPEND_LIMIT_EXCEEDED: Request exceeds daily spend limit of $${budget.dailySpendLimitUsd.toFixed(2)}.`,
        resetInSeconds,
      };
    }

    return { allowed: true };
  }

  /** Trip circuit breaker for tenant */
  static async tripCircuitBreaker(tenantId: string): Promise<void> {
    const budget = await this.getTenantBudget(tenantId);
    budget.circuitBreakerTripped = true;
    this.budgetStore.set(tenantId, budget);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ai_tenant_budgets')
          .update({
            circuit_breaker_tripped: true,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);
      } catch {
        // Suppress
      }
    }
  }

  /** Record token usage and expenditure against tenant budget */
  static async recordUsage(tenantId: string, tokens: number, spendUsd: number): Promise<void> {
    const budget = await this.getTenantBudget(tenantId);
    const newTokens = budget.currentDayTokens + tokens;
    const newSpend = Number((budget.currentDaySpendUsd + spendUsd).toFixed(4));
    const shouldTrip = newTokens >= budget.dailyTokenBudget || newSpend >= budget.dailySpendLimitUsd;

    budget.currentDayTokens = newTokens;
    budget.currentDaySpendUsd = newSpend;
    if (shouldTrip) budget.circuitBreakerTripped = true;
    this.budgetStore.set(tenantId, budget);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ai_tenant_budgets')
          .update({
            current_day_tokens: newTokens,
            current_day_spend_usd: newSpend,
            circuit_breaker_tripped: shouldTrip || budget.circuitBreakerTripped,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);
      } catch {
        // Suppress
      }
    }
  }

  /** Update or configure tenant budget */
  static async configureBudget(budget: Partial<TenantAIBudget> & { tenantId: string }): Promise<TenantAIBudget> {
    const current = await this.getTenantBudget(budget.tenantId);
    const updated: TenantAIBudget = {
      ...current,
      ...budget,
    };

    this.budgetStore.set(updated.tenantId, updated);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('ai_tenant_budgets')
          .upsert({
            tenant_id: updated.tenantId,
            tier: updated.tier,
            daily_token_budget: updated.dailyTokenBudget,
            daily_spend_limit_usd: updated.dailySpendLimitUsd,
            current_day_tokens: updated.currentDayTokens,
            current_day_spend_usd: updated.currentDaySpendUsd,
            circuit_breaker_tripped: updated.circuitBreakerTripped,
            reset_at: updated.resetAt,
            updated_at: new Date().toISOString(),
          });
      } catch {
        // Suppress
      }
    }

    return updated;
  }

  /** Generate executive AI cost audit report */
  static async generateCostReport(
    tenantId = 'default_tenant',
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<AICostReport> {
    const budget = await this.getTenantBudget(tenantId);
    let entries: AICostLedgerEntry[] = AINewsSummaryService.getLedgerEntries(tenantId);

    if (entries.length === 0 && isSupabaseConfigured) {
      try {
        let query = supabase.from('ai_cost_ledger').select('*').eq('tenant_id', tenantId);
        const now = new Date();
        if (period === 'day') {
          const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', dayAgo);
        } else if (period === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', weekAgo);
        } else {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('created_at', monthAgo);
        }

        const { data } = await query;
        if (data && data.length > 0) {
          entries = data.map((d) => ({
            id: d.id,
            tenantId: d.tenant_id,
            userId: d.user_id,
            operationType: d.operation_type,
            provider: d.provider,
            model: d.model,
            promptTokens: d.prompt_tokens,
            completionTokens: d.completion_tokens,
            totalTokens: d.total_tokens,
            costUsd: Number(d.cost_usd),
            costInr: Number(d.cost_inr),
            latencyMs: d.latency_ms,
            cacheHit: d.cache_hit,
            createdAt: d.created_at,
          }));
        }
      } catch {
        // Suppress
      }
    }

    const totalRequests = entries.length;
    const cacheHits = entries.filter((e) => e.cacheHit).length;
    const totalTokens = entries.reduce((acc, e) => acc + e.totalTokens, 0);
    const totalCostUsd = entries.reduce((acc, e) => acc + e.costUsd, 0);
    const totalCostInr = entries.reduce((acc, e) => acc + e.costInr, 0);

    const costByOperation: Record<string, { requests: number; tokens: number; costUsd: number }> = {};
    const costByProvider: Record<string, { requests: number; tokens: number; costUsd: number }> = {};

    for (const entry of entries) {
      if (!costByOperation[entry.operationType]) {
        costByOperation[entry.operationType] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      costByOperation[entry.operationType].requests += 1;
      costByOperation[entry.operationType].tokens += entry.totalTokens;
      costByOperation[entry.operationType].costUsd = Number(
        (costByOperation[entry.operationType].costUsd + entry.costUsd).toFixed(6),
      );

      if (!costByProvider[entry.provider]) {
        costByProvider[entry.provider] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      costByProvider[entry.provider].requests += 1;
      costByProvider[entry.provider].tokens += entry.totalTokens;
      costByProvider[entry.provider].costUsd = Number(
        (costByProvider[entry.provider].costUsd + entry.costUsd).toFixed(6),
      );
    }

    const cacheHitRatio = totalRequests > 0 ? Number((cacheHits / totalRequests).toFixed(4)) : 0;

    return {
      tenantId,
      period,
      totalRequests,
      cacheHits,
      cacheHitRatio,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      totalCostInr: Number(totalCostInr.toFixed(4)),
      costByOperation,
      costByProvider,
      circuitBreakerTripped: budget.circuitBreakerTripped,
    };
  }
}
