import type { AICompletionRequest, AICompletionResponse } from '@kshetra/shared';
import { AICostControlService } from './aiCostControlService';
import { AICostLedgerService } from './aiCostLedgerService';
import { AIProviderUnavailableError, defaultAIRegistry } from './aiProvider';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';

export class AIBudgetLimitError extends Error {
  readonly code = 'AI_BUDGET_EXCEEDED';
  readonly resetInSeconds: number;

  constructor(message: string, resetInSeconds?: number) {
    super(message);
    this.name = 'AIBudgetLimitError';
    this.resetInSeconds = resetInSeconds ?? 86400;
  }
}

function estimateRequestTokens(request: AICompletionRequest): number {
  const promptCharacters = request.messages.reduce((total, message) => total + message.content.length, 0);
  const estimatedPromptTokens = Math.ceil(promptCharacters / 4);
  const outputTokenLimit = request.maxTokens ?? 1024;
  return Math.max(1, estimatedPromptTokens + outputTokenLimit);
}

async function recordUsageAndLedger(
  entry: Parameters<typeof AICostLedgerService.recordCostLedger>[0],
  budgetCostUsd: number | null,
): Promise<void> {
  if (isProductionLikeRuntime()) {
    await AICostLedgerService.recordProductionUsageAndLedger({ ...entry, budgetCostUsd });
    return;
  }
  await AICostControlService.recordUsage(entry.tenantId, entry.totalTokens, budgetCostUsd);
  await AICostLedgerService.recordCostLedger(entry);
}

/** Runs an AI completion only after budget checks, then durably accounts for its usage. */
export async function executeAICompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
  const tenantId = request.tenantId || 'default_tenant';
  const estimatedTokens = estimateRequestTokens(request);
  const budgetCheck = await AICostControlService.checkBudget(tenantId, estimatedTokens);
  if (!budgetCheck.allowed) {
    throw new AIBudgetLimitError(budgetCheck.reason || 'AI daily budget exceeded.', budgetCheck.resetInSeconds);
  }

  const startedAt = Date.now();
  let response: AICompletionResponse;
  try {
    response = await defaultAIRegistry.generateWithFallback(request);
  } catch (error) {
    if (error instanceof AIProviderUnavailableError && error.attemptedProviders.length > 0) {
      const promptTokens = Math.ceil(request.messages.reduce((total, message) => total + message.content.length, 0) / 4);
      await recordUsageAndLedger({
        tenantId,
        userId: request.userId,
        operationType: request.operation || 'ai_completion',
        provider: 'provider_cascade_failed',
        model: 'unresolved',
        promptTokens,
        completionTokens: Math.max(0, estimatedTokens - promptTokens),
        totalTokens: estimatedTokens,
        usageBasis: 'estimated',
        costUsd: null,
        costInr: null,
        costBasis: 'unavailable',
        costRateCardVersion: null,
        costRateCardSource: `Provider response failed after attempts to: ${error.attemptedProviders.join(', ')}.`,
        latencyMs: Date.now() - startedAt,
        cacheHit: false,
      }, null);
    }
    throw error;
  }

  // The local deterministic fallback has no provider charge. A real provider
  // response with missing usage/cost stays unknown and closes future spend use.
  const budgetCost = response.costUsd ?? (response.costBasis === 'offline_demo' ? 0 : null);
  await recordUsageAndLedger({
    tenantId,
    userId: request.userId,
    operationType: request.operation || 'ai_completion',
    provider: response.provider,
    model: response.model,
    promptTokens: response.usage.promptTokens,
    completionTokens: response.usage.completionTokens,
    totalTokens: response.usage.totalTokens,
    usageBasis: response.usageBasis,
    costUsd: response.costUsd,
    costInr: response.costInr,
    costBasis: response.costBasis,
    costRateCardVersion: response.costRateCardVersion,
    costRateCardSource: response.costRateCardSource,
    latencyMs: response.latencyMs,
    cacheHit: false,
  }, budgetCost);

  return response;
}
