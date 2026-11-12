/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: AI Cost Control, Budgeting & Circuit Breaker Service (JOB 071)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../lib/supabase';
import { isIsolatedTestRuntime, isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { AICostLedgerService, type AICostLedgerEntry } from './aiCostLedgerService';
import type { TenantAIBudget, AICostReport } from '@kshetra/shared';

const isTestRuntime = () => isIsolatedTestRuntime();

export class AIBudgetUnavailableError extends Error {
  readonly code = 'AI_BUDGET_UNAVAILABLE';

  constructor(
    message = 'A durable AI budget and verified cost basis are required in deployed runtimes.',
  ) {
    super(message);
    this.name = 'AIBudgetUnavailableError';
  }
}

export class AICostControlService {
  // In-memory fallback budget store for tests & offline environments
  private static budgetStore = new Map<string, TenantAIBudget>();

  static resetForTesting(): void {
    this.budgetStore.clear();
    AICostLedgerService.resetForTesting();
  }

  /** Get or initialize tenant AI budget */
  static async getTenantBudget(tenantId = 'default_tenant'): Promise<TenantAIBudget> {
    const now = new Date();
    const productionRuntime = isProductionLikeRuntime();
    if (productionRuntime && (!isSupabaseConfigured || !isUsingServiceRole)) {
      throw new AIBudgetUnavailableError(
        'A service-role database connection is required for production AI budgets.',
      );
    }

    let budget = productionRuntime ? undefined : this.budgetStore.get(tenantId);
    if (!budget) {
      if (isSupabaseConfigured && !isTestRuntime()) {
        const { data, error } = await supabase
          .from('ai_tenant_budgets')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) {
          if (productionRuntime)
            throw new AIBudgetUnavailableError('Could not read the durable AI tenant budget.');
        } else if (data) {
          budget = {
            tenantId: data.tenant_id,
            tier: data.tier,
            dailyTokenBudget: data.daily_token_budget,
            dailySpendLimitUsd: Number(data.daily_spend_limit_usd),
            currentDayTokens: data.current_day_tokens,
            currentDaySpendUsd:
              data.current_day_spend_usd == null ? null : Number(data.current_day_spend_usd),
            circuitBreakerTripped: data.circuit_breaker_tripped,
            resetAt: data.reset_at,
          };
        }
      }

      if (!budget) {
        if (productionRuntime)
          throw new AIBudgetUnavailableError('No durable AI budget is configured for this tenant.');
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
      if (!productionRuntime) this.budgetStore.set(tenantId, budget);
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
      if (!productionRuntime) this.budgetStore.set(tenantId, budget);

      if (isSupabaseConfigured && !isTestRuntime()) {
        const { data, error } = await supabase
          .from('ai_tenant_budgets')
          .update({
            current_day_tokens: 0,
            current_day_spend_usd: 0,
            circuit_breaker_tripped: false,
            reset_at: nextReset,
            updated_at: now.toISOString(),
          })
          .eq('tenant_id', tenantId)
          .select('tenant_id')
          .maybeSingle();
        if (error || !data) {
          if (productionRuntime)
            throw new AIBudgetUnavailableError('Could not persist the AI budget reset.');
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

    if (budget.currentDaySpendUsd === null) {
      throw new AIBudgetUnavailableError(
        'Current-day AI spend is unknown; AI usage remains blocked until the budget is safely reset.',
      );
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
    if (!isProductionLikeRuntime()) this.budgetStore.set(tenantId, budget);

    if (isSupabaseConfigured && !isTestRuntime()) {
      const { data, error } = await supabase
        .from('ai_tenant_budgets')
        .update({
          circuit_breaker_tripped: true,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select('tenant_id')
        .maybeSingle();
      if ((error || !data) && isProductionLikeRuntime()) {
        throw new AIBudgetUnavailableError('Could not persist the AI circuit breaker.');
      }
    }
  }

  /** Record token usage and expenditure against tenant budget */
  static async recordUsage(
    tenantId: string,
    tokens: number,
    spendUsd: number | null,
  ): Promise<void> {
    if (
      !Number.isSafeInteger(tokens) ||
      tokens < 0 ||
      (spendUsd !== null && (!Number.isFinite(spendUsd) || spendUsd < 0))
    ) {
      throw new TypeError(
        'AI usage must contain a non-negative integer token count and a non-negative known cost or null.',
      );
    }

    if (isProductionLikeRuntime()) {
      throw new AIBudgetUnavailableError(
        'Production AI usage must be recorded together with its ledger row by the atomic accounting path.',
      );
    }

    const budget = await this.getTenantBudget(tenantId);
    const newTokens = budget.currentDayTokens + tokens;
    const newSpend =
      spendUsd === null || budget.currentDaySpendUsd === null
        ? null
        : Number((budget.currentDaySpendUsd + spendUsd).toFixed(4));
    const shouldTrip =
      newSpend === null ||
      newTokens >= budget.dailyTokenBudget ||
      newSpend >= budget.dailySpendLimitUsd;

    budget.currentDayTokens = newTokens;
    budget.currentDaySpendUsd = newSpend;
    if (shouldTrip) budget.circuitBreakerTripped = true;
    this.budgetStore.set(tenantId, budget);

    if (isSupabaseConfigured && !isTestRuntime()) {
      const { data, error } = await supabase
        .from('ai_tenant_budgets')
        .update({
          current_day_tokens: newTokens,
          current_day_spend_usd: newSpend,
          circuit_breaker_tripped: shouldTrip || budget.circuitBreakerTripped,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select('tenant_id')
        .maybeSingle();
      if ((error || !data) && isProductionLikeRuntime()) {
        throw new AIBudgetUnavailableError('Could not persist AI usage.');
      }
    }
  }

  /** Update or configure tenant budget */
  static async configureBudget(
    budget: Partial<TenantAIBudget> & { tenantId: string },
  ): Promise<TenantAIBudget> {
    const current = await this.getTenantBudget(budget.tenantId);
    const updated: TenantAIBudget = {
      ...current,
      ...budget,
    };

    if (!isProductionLikeRuntime()) this.budgetStore.set(updated.tenantId, updated);

    if (isSupabaseConfigured && !isTestRuntime()) {
      const { data, error } = await supabase
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
        })
        .select('tenant_id')
        .maybeSingle();
      if ((error || !data) && isProductionLikeRuntime()) {
        throw new AIBudgetUnavailableError('Could not persist the tenant AI budget.');
      }
    } else if (isProductionLikeRuntime()) {
      throw new AIBudgetUnavailableError(
        'Supabase is required to configure production AI budgets.',
      );
    }

    return updated;
  }

  /** Generate executive AI cost audit report */
  static async generateCostReport(
    tenantId = 'default_tenant',
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<AICostReport> {
    const budget = await this.getTenantBudget(tenantId);
    const productionRuntime = isProductionLikeRuntime();
    let entries: AICostLedgerEntry[] = productionRuntime
      ? []
      : AICostLedgerService.getLedgerEntries(tenantId);

    if (productionRuntime && (!isSupabaseConfigured || !isUsingServiceRole)) {
      throw new AIBudgetUnavailableError(
        'A service-role database connection is required for production cost reports.',
      );
    }

    if (productionRuntime || (entries.length === 0 && isSupabaseConfigured && !isTestRuntime())) {
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

        const { data, error } = await query;
        if (error && productionRuntime)
          throw new AIBudgetUnavailableError('Could not read the durable AI cost ledger.');
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
            usageBasis: d.usage_basis || 'estimated',
            costUsd: d.cost_usd == null ? null : Number(d.cost_usd),
            costInr: d.cost_inr == null ? null : Number(d.cost_inr),
            costBasis: d.cost_basis || 'legacy_unverified',
            costRateCardVersion: d.cost_rate_card_version,
            costRateCardSource: d.cost_rate_card_source,
            latencyMs: d.latency_ms,
            cacheHit: d.cache_hit,
            createdAt: d.created_at,
          }));
        }
      } catch (error) {
        if (productionRuntime)
          throw error instanceof AIBudgetUnavailableError
            ? error
            : new AIBudgetUnavailableError('Could not read the durable AI cost ledger.');
      }
    }

    const now = Date.now();
    const periodMs =
      period === 'day'
        ? 24 * 60 * 60 * 1000
        : period === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
    entries = entries.filter((entry) => now - new Date(entry.createdAt).getTime() <= periodMs);

    const totalRequests = entries.length;
    const cacheHits = entries.filter((e) => e.cacheHit).length;
    const totalTokens = entries.reduce((acc, e) => acc + e.totalTokens, 0);
    const totalCostUsd = entries.every((entry) => entry.costUsd !== null)
      ? entries.reduce((acc, entry) => acc + Number(entry.costUsd), 0)
      : null;
    const totalCostInr = entries.every((entry) => entry.costInr !== null)
      ? entries.reduce((acc, entry) => acc + Number(entry.costInr), 0)
      : null;

    const costByOperation: Record<
      string,
      { requests: number; tokens: number; costUsd: number | null }
    > = {};
    const costByProvider: Record<
      string,
      { requests: number; tokens: number; costUsd: number | null }
    > = {};

    for (const entry of entries) {
      if (!costByOperation[entry.operationType]) {
        costByOperation[entry.operationType] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      costByOperation[entry.operationType].requests += 1;
      costByOperation[entry.operationType].tokens += entry.totalTokens;
      const operationCost = costByOperation[entry.operationType].costUsd;
      costByOperation[entry.operationType].costUsd =
        operationCost === null || entry.costUsd === null
          ? null
          : Number((operationCost + entry.costUsd).toFixed(6));

      if (!costByProvider[entry.provider]) {
        costByProvider[entry.provider] = { requests: 0, tokens: 0, costUsd: 0 };
      }
      costByProvider[entry.provider].requests += 1;
      costByProvider[entry.provider].tokens += entry.totalTokens;
      const providerCost = costByProvider[entry.provider].costUsd;
      costByProvider[entry.provider].costUsd =
        providerCost === null || entry.costUsd === null
          ? null
          : Number((providerCost + entry.costUsd).toFixed(6));
    }

    const cacheHitRatio = totalRequests > 0 ? Number((cacheHits / totalRequests).toFixed(4)) : 0;

    return {
      tenantId,
      period,
      totalRequests,
      cacheHits,
      cacheHitRatio,
      totalTokens,
      totalCostUsd: totalCostUsd === null ? null : Number(totalCostUsd.toFixed(6)),
      totalCostInr: totalCostInr === null ? null : Number(totalCostInr.toFixed(4)),
      costProvenance:
        totalRequests === 0
          ? 'unavailable'
          : entries.every(
                (entry) =>
                  (entry.costBasis === 'provider_rate_card' &&
                    entry.usageBasis === 'provider_reported') ||
                  (entry.costBasis === 'cache_hit' && entry.usageBasis === 'not_applicable'),
              )
            ? 'complete'
            : 'partial',
      costRateCardVersions: [
        ...new Set(
          entries.flatMap((entry) =>
            entry.costRateCardVersion ? [entry.costRateCardVersion] : [],
          ),
        ),
      ],
      costSources: [
        ...new Set(
          entries.flatMap((entry) => (entry.costRateCardSource ? [entry.costRateCardSource] : [])),
        ),
      ],
      costByOperation,
      costByProvider,
      circuitBreakerTripped: budget.circuitBreakerTripped,
    };
  }
}
