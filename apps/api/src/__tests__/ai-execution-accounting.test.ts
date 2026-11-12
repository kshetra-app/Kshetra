import type { AICompletionResponse } from '@kshetra/shared';
import { setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';
import { AICostControlService } from '../services/aiCostControlService';
import { defaultAIRegistry } from '../services/aiProvider';
import { executeAICompletion } from '../services/aiExecutionService';

describe('AI execution accounting', () => {
  const envKeys = ['APP_ENV', 'EXPO_PUBLIC_APP_ENV', 'NODE_ENV'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalSupabaseConfigured = isSupabaseConfigured;

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    setSupabaseConfiguredForTesting(originalSupabaseConfigured);
    AICostControlService.resetForTesting();
    defaultAIRegistry.resetForTesting();
  });

  it('records unknown provider cost as unknown and trips the daily budget circuit breaker', async () => {
    process.env.APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    setSupabaseConfiguredForTesting(false);
    AICostControlService.resetForTesting();

    const response: AICompletionResponse = {
      content: 'A provider response with reported usage but no configured rate card.',
      provider: 'openai',
      model: 'test-model',
      usage: { promptTokens: 8, completionTokens: 10, totalTokens: 18 },
      costUsd: null,
      costInr: null,
      costBasis: 'unavailable',
      costRateCardVersion: null,
      costRateCardSource: null,
      usageBasis: 'provider_reported',
      latencyMs: 10,
      degradedOffline: false,
    };

    defaultAIRegistry.registerProvider(
      {
        name: 'openai',
        isAvailable: () => true,
        generateCompletion: async () => response,
      },
      0,
    );

    const result = await executeAICompletion({
      messages: [{ role: 'user', content: 'Test AI cost accounting.' }],
      tenantId: 'accounting_test',
      operation: 'accounting_test',
    });

    expect(result.costUsd).toBeNull();
    expect(await AICostControlService.checkBudget('accounting_test')).toMatchObject({
      allowed: false,
    });
    const report = await AICostControlService.generateCostReport('accounting_test', 'day');
    expect(report.totalCostUsd).toBeNull();
    expect(report.costProvenance).toBe('partial');
  });

  it('does not make a provider call in production without a durable service-role budget connection', async () => {
    process.env.APP_ENV = 'production';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    setSupabaseConfiguredForTesting(false);
    const generateCompletion = jest.fn();
    defaultAIRegistry.registerProvider(
      {
        name: 'openai',
        isAvailable: () => true,
        generateCompletion,
      },
      0,
    );

    await expect(
      executeAICompletion({
        messages: [{ role: 'user', content: 'This must fail before provider execution.' }],
        tenantId: 'default_tenant',
      }),
    ).rejects.toMatchObject({ code: 'AI_BUDGET_UNAVAILABLE' });

    expect(generateCompletion).not.toHaveBeenCalled();
  });

  it('marks a successful fallback response cost as unknown after an earlier provider failure', async () => {
    process.env.APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    setSupabaseConfiguredForTesting(false);
    AICostControlService.resetForTesting();

    const response: AICompletionResponse = {
      content: 'Fallback provider response.',
      provider: 'openai',
      model: 'test-model',
      usage: { promptTokens: 8, completionTokens: 4, totalTokens: 12 },
      costUsd: 0.0001,
      costInr: 0.01,
      costBasis: 'provider_rate_card',
      costRateCardVersion: 'test-card',
      costRateCardSource: 'test fixture',
      usageBasis: 'provider_reported',
      latencyMs: 10,
      degradedOffline: false,
    };

    defaultAIRegistry.registerProvider(
      {
        name: 'gemini',
        isAvailable: () => true,
        generateCompletion: async () => {
          throw new Error('provider timeout');
        },
      },
      0,
    );
    defaultAIRegistry.registerProvider(
      {
        name: 'openai',
        isAvailable: () => true,
        generateCompletion: async () => response,
      },
      1,
    );

    const result = await executeAICompletion({
      messages: [{ role: 'user', content: 'Verify failover accounting.' }],
      tenantId: 'fallback_accounting_test',
    });

    expect(result.content).toBe(response.content);
    expect(result.costUsd).toBeNull();
    expect(result.costBasis).toBe('unavailable');
    expect(await AICostControlService.checkBudget('fallback_accounting_test')).toMatchObject({
      allowed: false,
    });
  });
});
