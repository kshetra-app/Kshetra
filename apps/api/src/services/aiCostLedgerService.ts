import { randomBytes } from 'crypto';
import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../lib/supabase';
import { isIsolatedTestRuntime, isProductionLikeRuntime } from '../lib/runtimeEnvironment';

export interface AICostLedgerEntry {
  id: string;
  tenantId: string;
  userId?: string;
  operationType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  usageBasis: 'provider_reported' | 'estimated' | 'not_applicable';
  costUsd: number | null;
  costInr: number | null;
  costBasis:
    | 'provider_rate_card'
    | 'cache_hit'
    | 'offline_demo'
    | 'unavailable'
    | 'legacy_unverified'
    | 'none';
  costRateCardVersion?: string | null;
  costRateCardSource?: string | null;
  latencyMs: number;
  cacheHit: boolean;
  createdAt: string;
}

export class AICostLedgerUnavailableError extends Error {
  readonly code = 'AI_COST_LEDGER_UNAVAILABLE';

  constructor(message = 'Durable AI cost recording is unavailable.') {
    super(message);
    this.name = 'AICostLedgerUnavailableError';
  }
}

export class AICostLedgerService {
  private static ledgerStore: AICostLedgerEntry[] = [];

  static resetForTesting(): void {
    this.ledgerStore = [];
  }

  static async recordCostLedger(entry: Omit<AICostLedgerEntry, 'id' | 'createdAt'>): Promise<void> {
    const productionRuntime = isProductionLikeRuntime();
    const useDurableDatabase = isSupabaseConfigured && !isIsolatedTestRuntime();
    const id = `ledg_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    if (productionRuntime && (!isSupabaseConfigured || !isUsingServiceRole)) {
      throw new AICostLedgerUnavailableError(
        'A service-role database connection is required for production AI cost records.',
      );
    }

    if (useDurableDatabase) {
      const { error } = await supabase.from('ai_cost_ledger').insert({
        id,
        tenant_id: entry.tenantId,
        user_id: entry.userId || null,
        operation_type: entry.operationType,
        provider: entry.provider,
        model: entry.model,
        prompt_tokens: entry.promptTokens,
        completion_tokens: entry.completionTokens,
        total_tokens: entry.totalTokens,
        usage_basis: entry.usageBasis,
        cost_usd: entry.costUsd,
        cost_inr: entry.costInr,
        cost_basis: entry.costBasis,
        cost_rate_card_version: entry.costRateCardVersion || null,
        cost_rate_card_source: entry.costRateCardSource || null,
        latency_ms: entry.latencyMs,
        cache_hit: entry.cacheHit,
        created_at: now,
      });
      if (error && productionRuntime) {
        throw new AICostLedgerUnavailableError('Could not persist the production AI cost record.');
      }
    } else if (productionRuntime) {
      throw new AICostLedgerUnavailableError();
    }

    if (!productionRuntime) {
      this.ledgerStore.push({ ...entry, id, createdAt: now });
    }
  }

  static async recordProductionUsageAndLedger(
    entry: Omit<AICostLedgerEntry, 'id' | 'createdAt'> & { budgetCostUsd: number | null },
  ): Promise<void> {
    if (!isProductionLikeRuntime() || !isSupabaseConfigured || !isUsingServiceRole) {
      throw new AICostLedgerUnavailableError(
        'Atomic AI usage accounting requires the production service-role database connection.',
      );
    }

    const { data, error } = await supabase.rpc('record_ai_usage_and_ledger', {
      p_tenant_id: entry.tenantId,
      p_tokens: entry.totalTokens,
      p_spend_usd: entry.budgetCostUsd,
      p_user_id: entry.userId || null,
      p_operation_type: entry.operationType,
      p_provider: entry.provider,
      p_model: entry.model,
      p_prompt_tokens: entry.promptTokens,
      p_completion_tokens: entry.completionTokens,
      p_usage_basis: entry.usageBasis,
      p_cost_usd: entry.costUsd,
      p_cost_inr: entry.costInr,
      p_cost_basis: entry.costBasis,
      p_cost_rate_card_version: entry.costRateCardVersion || null,
      p_cost_rate_card_source: entry.costRateCardSource || null,
      p_latency_ms: entry.latencyMs,
      p_cache_hit: entry.cacheHit,
    });

    if (error || data !== true) {
      throw new AICostLedgerUnavailableError(
        'Could not atomically persist AI usage and its cost ledger entry.',
      );
    }
  }

  static getLedgerEntries(tenantId?: string): AICostLedgerEntry[] {
    return tenantId
      ? this.ledgerStore.filter((entry) => entry.tenantId === tenantId)
      : [...this.ledgerStore];
  }
}
