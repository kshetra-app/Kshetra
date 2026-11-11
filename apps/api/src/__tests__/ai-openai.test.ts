import type { AICompletionRequest, AICompletionResponse } from '@kshetra/shared';
import {
  analyzeConstituency,
  analyzeElectionTrends,
  chatWithAI,
  smartSearch,
  summarizeIssues,
} from '../services/ai';
import { defaultAIRegistry } from '../services/aiProvider';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';

function response(content: string): AICompletionResponse {
  return {
    content,
    provider: 'openai',
    model: 'test-model',
    usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
    costUsd: 0,
    costInr: 0,
    latencyMs: 1,
    degradedOffline: false,
  };
}

describe('AI service registry integration', () => {
  const generate = jest.spyOn(defaultAIRegistry, 'generateWithFallback');

  beforeEach(() => {
    generate.mockReset();
    generate.mockResolvedValue(response('AI result'));
  });

  afterAll(() => {
    generate.mockRestore();
  });

  it('returns the configured provider response for a basic chat', async () => {
    generate.mockResolvedValueOnce(response('Hello from the configured provider.'));
    await expect(chatWithAI({ messages: [{ role: 'user', content: 'hi' }] })).resolves.toBe(
      'Hello from the configured provider.',
    );
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].messages.some((message) => message.content === 'hi')).toBe(
      true,
    );
  });

  it('returns a clear fallback when a provider response is empty', async () => {
    generate.mockResolvedValueOnce(response(''));
    await expect(chatWithAI({ messages: [{ role: 'user', content: 'hi' }] })).resolves.toBe(
      'No response generated.',
    );
  });

  it('does not add constituency-specific data for an unknown constituency', async () => {
    await chatWithAI({
      messages: [{ role: 'user', content: 'hi' }],
      constituencyAcNo: 99999,
    });
    const request = generate.mock.calls[0][0] as AICompletionRequest;
    expect(request.messages.map((message) => message.content).join('\n')).not.toContain(
      'CONSTITUENCY CONTEXT',
    );
  });

  it('builds constituency context from the bundled Telangana records', async () => {
    const sample = TELANGANA_CONSTITUENCIES.slice(0, 3);
    for (const constituency of sample) {
      generate.mockResolvedValueOnce(response('Analysis'));
      await analyzeConstituency(constituency.acNo);
    }
    expect(generate).toHaveBeenCalledTimes(sample.length);
    const requests = generate.mock.calls.map(([request]) => request as AICompletionRequest);
    for (const constituency of sample) {
      expect(
        requests.some((request) =>
          request.messages.some((message) => message.content.includes(constituency.name)),
        ),
      ).toBe(true);
    }
  });

  it('includes party-strength context for election-trend analysis', async () => {
    await analyzeElectionTrends();
    const request = generate.mock.calls[0][0] as AICompletionRequest;
    expect(request.messages.map((message) => message.content).join('\n')).toContain(
      'Current Party Strength',
    );
  });

  it('short-circuits empty issue lists and forwards supplied issues', async () => {
    await expect(summarizeIssues('Jubilee Hills', [])).resolves.toContain('No civic issues');
    expect(generate).not.toHaveBeenCalled();

    await summarizeIssues('Jubilee Hills', ['Potholes', 'Water supply']);
    const request = generate.mock.calls[0][0] as AICompletionRequest;
    expect(request.messages.map((message) => message.content).join('\n')).toContain('Potholes');
  });

  it('parses plain JSON arrays returned by the provider', async () => {
    generate.mockResolvedValueOnce(response('[{"acNo":1,"name":"Sirpur","reason":"match"}]'));
    await expect(smartSearch('sirpur')).resolves.toEqual([
      { acNo: 1, name: 'Sirpur', reason: 'match' },
    ]);
  });

  it('strips markdown fences before parsing provider JSON', async () => {
    generate.mockResolvedValueOnce(
      response('\x60\x60\x60json\n[{"acNo":2,"name":"Y","reason":"r"}]\n\x60\x60\x60'),
    );
    await expect(smartSearch('something')).resolves.toEqual([{ acNo: 2, name: 'Y', reason: 'r' }]);
  });

  it('uses deterministic record matching when provider output is invalid JSON', async () => {
    generate.mockResolvedValueOnce(response('not json'));
    await expect(smartSearch('no_such_place_xyz')).resolves.toEqual([]);
  });
});
