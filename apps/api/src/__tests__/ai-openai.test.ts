/**
 * Covers the OpenAI-configured path of services/ai.ts with a mocked client,
 * so no network call is made. Together with services.test.ts (no-key path)
 * this exercises both branches of every AI function.
 */

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import {
  chatWithAI,
  buildAIContextualPrompt,
  buildConstituencyContext,
  smartSearch,
  analyzeConstituency,
  analyzeElectionTrends,
  summarizeIssues,
} from '../services/ai';
import { defaultAIRegistry } from '../services/aiProvider';
import { AICostControlService } from '../services/aiCostControlService';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';

function mockReply(content: unknown) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  });
}

describe('ai service — OpenAI-configured path (mocked client)', () => {
  const original = Object.fromEntries(
    ['APP_ENV', 'EXPO_PUBLIC_APP_ENV', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'OPENAI_MODEL', 'GEMINI_MODEL', 'AI_PROVIDER_RATE_CARD_JSON']
      .map((key) => [key, process.env[key]]),
  );

  beforeAll(() => {
    process.env.APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.GEMINI_MODEL;
    delete process.env.OPENAI_MODEL;
    process.env.AI_PROVIDER_RATE_CARD_JSON = JSON.stringify({
      version: 'unit-test-rate-card',
      effectiveAt: '2026-01-01T00:00:00Z',
      source: 'unit-test fixture',
      rates: {
        'openai:gpt-4o-mini': { promptUsdPerMillionTokens: 1, completionUsdPerMillionTokens: 1 },
        'gemini:gemini-flash-lite-latest': { promptUsdPerMillionTokens: 1, completionUsdPerMillionTokens: 1 },
      },
    });
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    defaultAIRegistry.resetForTesting();
  });
  beforeEach(() => {
    mockCreate.mockReset();
    defaultAIRegistry.resetForTesting();
    AICostControlService.resetForTesting();
  });

  it('returns the model content for a basic chat', async () => {
    mockReply('Hello from KSHETRA AI.');
    const res = await chatWithAI({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res).toBe('Hello from KSHETRA AI.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('falls back when the model returns no content', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{}],
      usage: { prompt_tokens: 100, completion_tokens: 0, total_tokens: 100 },
    });
    const res = await chatWithAI({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res).toBe('No response generated.');
  });

  it('returns empty-context output for an unknown constituency', async () => {
    mockReply('ok');
    const res = await chatWithAI({
      messages: [{ role: 'user', content: 'hi' }],
      constituencyAcNo: 99999,
    });
    expect(res).toBe('ok');
  });

  it('does not pass unprovenanced demographic figures into constituency AI context', () => {
    const context = buildConstituencyContext(1, 'TS');
    expect(context).toContain('No provenance-backed constituency demographic records are connected');
    expect(context).not.toContain('Population:');
    expect(context).not.toContain('Turnout 2023:');
  });

  it('does not attach Telangana statewide history to another state context', () => {
    expect(buildAIContextualPrompt({ stateCode: 'AP', constituencyAcNo: 1 })).not.toContain('Election History:');
    expect(buildAIContextualPrompt({ stateCode: 'TS', constituencyAcNo: 1 })).toContain('Election History:');
  });

  it('builds rich context across all Telangana constituencies (all branches)', async () => {
    // Looping every AC exercises the defection, stronghold, MLA,
    // demographics and timeline branches of buildConstituencyContext.
    const acNos = TELANGANA_CONSTITUENCIES.map((c) => c.acNo);
    for (const acNo of acNos) {
      mockReply(`analysis-${acNo}`);
      const res = await analyzeConstituency(acNo);
      expect(res).toBe(`analysis-${acNo}`);
    }
    expect(mockCreate).toHaveBeenCalledTimes(acNos.length);
  });

  it('summarizes election trends using party-strength and defection data', async () => {
    mockReply('Trend summary.');
    const res = await analyzeElectionTrends();
    expect(res).toBe('Trend summary.');
    // The injected strength/defection data is appended to the user message.
    const sentMessages = mockCreate.mock.calls[0][0].messages as Array<{ content: string }>;
    const joined = sentMessages.map((m) => m.content).join('\n');
    expect(joined).toContain('Current Party Strength');
  });

  it('summarizes civic issues and short-circuits on an empty list', async () => {
    mockReply('- a\n- b\n- c');
    const res = await summarizeIssues('Jubilee Hills', ['Potholes', 'Water']);
    expect(res).toBe('- a\n- b\n- c');

    const empty = await summarizeIssues('Jubilee Hills', []);
    expect(empty).toContain('No civic issues');
  });

  describe('smartSearch parsing', () => {
    it('parses a plain JSON array', async () => {
      mockReply(JSON.stringify([{ acNo: 1, name: 'X', reason: 'match' }]));
      const res = await smartSearch('safest seat');
      expect(res).toEqual([{ acNo: 1, name: 'X', reason: 'match' }]);
    });

    it('strips markdown fences before parsing', async () => {
      mockReply('```json\n[{"acNo":2,"name":"Y","reason":"r"}]\n```');
      const res = await smartSearch('something');
      expect(res).toEqual([{ acNo: 2, name: 'Y', reason: 'r' }]);
    });

    it('returns an empty array on invalid JSON', async () => {
      mockReply('not json at all');
      const res = await smartSearch('broken');
      expect(res).toEqual([]);
    });
  });
});

describe('ai service — Gemini-configured path (mocked client)', () => {
  const original = Object.fromEntries(
    ['APP_ENV', 'EXPO_PUBLIC_APP_ENV', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'OPENAI_MODEL', 'GEMINI_MODEL', 'AI_PROVIDER_RATE_CARD_JSON']
      .map((key) => [key, process.env[key]]),
  );

  beforeAll(() => {
    process.env.APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.OPENAI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-flash-lite-latest';
    delete process.env.OPENAI_MODEL;
    process.env.AI_PROVIDER_RATE_CARD_JSON = JSON.stringify({
      version: 'unit-test-rate-card',
      effectiveAt: '2026-01-01T00:00:00Z',
      source: 'unit-test fixture',
      rates: {
        'openai:gpt-4o-mini': { promptUsdPerMillionTokens: 1, completionUsdPerMillionTokens: 1 },
        'gemini:gemini-flash-lite-latest': { promptUsdPerMillionTokens: 1, completionUsdPerMillionTokens: 1 },
      },
    });
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    defaultAIRegistry.resetForTesting();
  });
  beforeEach(() => {
    mockCreate.mockReset();
    defaultAIRegistry.resetForTesting();
    AICostControlService.resetForTesting();
  });

  it('uses gemini model for chat completions', async () => {
    mockReply('Hello from Gemini.');
    const res = await chatWithAI({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res).toBe('Hello from Gemini.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].model).toBe('gemini-flash-lite-latest');
  });

  it('uses gemini model for smartSearch', async () => {
    mockReply(JSON.stringify([{ acNo: 1, name: 'Sirpur', reason: 'match' }]));
    const res = await smartSearch('sirpur');
    expect(res).toEqual([{ acNo: 1, name: 'Sirpur', reason: 'match' }]);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].model).toBe('gemini-flash-lite-latest');
  });
});
