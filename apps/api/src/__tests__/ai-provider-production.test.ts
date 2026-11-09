import {
  AIProviderRegistry,
  AIProviderUnavailableError,
  DeterministicOfflineAIProvider,
} from '../services/aiProvider';

describe('AI provider runtime safety', () => {
  const keys = ['APP_ENV', 'EXPO_PUBLIC_APP_ENV', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'CUSTOM_LLM_BASE_URL'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('does not expose deterministic generated text as production AI when no provider is configured', async () => {
    for (const key of ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'CUSTOM_LLM_BASE_URL']) {
      delete process.env[key];
    }
    process.env.APP_ENV = 'production';
    delete process.env.EXPO_PUBLIC_APP_ENV;

    const registry = new AIProviderRegistry();
    const offlineProvider = new DeterministicOfflineAIProvider();

    expect(offlineProvider.isAvailable()).toBe(false);
    expect(registry.getActiveChain()).toEqual([]);
    await expect(
      registry.generateWithFallback({ messages: [{ role: 'user', content: 'What happened?' }] }),
    ).rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE' });
    await expect(
      offlineProvider.generateCompletion({ messages: [{ role: 'user', content: 'What happened?' }] }),
    ).rejects.toBeInstanceOf(AIProviderUnavailableError);
  });

  it('keeps the deterministic provider available in development for local/demo use', () => {
    process.env.APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CUSTOM_LLM_BASE_URL;

    const registry = new AIProviderRegistry();

    expect(registry.getActiveChain().map((provider) => provider.name)).toEqual(['offline_heuristic']);
  });
});
