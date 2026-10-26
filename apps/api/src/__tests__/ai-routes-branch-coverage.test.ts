import Fastify, { type FastifyInstance } from 'fastify';
import {
  analyzeConstituency,
  analyzeElectionTrends,
  chatWithAI,
  generateCampaignCopy,
  smartSearch,
  summarizeIssues,
} from '../services/ai';
import { aiRoutes } from '../routes/ai';

jest.mock('../services/ai', () => ({
  chatWithAI: jest.fn(),
  analyzeConstituency: jest.fn(),
  analyzeElectionTrends: jest.fn(),
  smartSearch: jest.fn(),
  summarizeIssues: jest.fn(),
  generateCampaignCopy: jest.fn(),
}));

const mocks = {
  chatWithAI: jest.mocked(chatWithAI),
  analyzeConstituency: jest.mocked(analyzeConstituency),
  analyzeElectionTrends: jest.mocked(analyzeElectionTrends),
  smartSearch: jest.mocked(smartSearch),
  summarizeIssues: jest.mocked(summarizeIssues),
  generateCampaignCopy: jest.mocked(generateCampaignCopy),
};

describe('AI route branch coverage: validation, provider outcomes and defaults', () => {
  let app: FastifyInstance;
  const originalOpenAI = process.env.OPENAI_API_KEY;
  const originalGemini = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    app = Fastify();
    await app.register(aiRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalOpenAI === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAI;
    if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGemini;
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mocks.chatWithAI.mockResolvedValue('chat answer' as never);
    mocks.analyzeConstituency.mockResolvedValue('constituency analysis' as never);
    mocks.analyzeElectionTrends.mockResolvedValue('trend analysis' as never);
    mocks.smartSearch.mockResolvedValue([] as never);
    mocks.summarizeIssues.mockResolvedValue('issue summary' as never);
    mocks.generateCampaignCopy.mockResolvedValue('campaign copy' as never);
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  it('covers chat success, optional context, malformed body and provider failure', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      payload: { messages: [{ role: 'user', content: 'hello' }], constituencyAcNo: 12, stateCode: 'TS' },
    });
    expect(ok.statusCode).toBe(200);
    expect(mocks.chatWithAI).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'hello' }],
      constituencyAcNo: 12,
      stateCode: 'TS',
    });

    for (const payload of [
      { messages: [] },
      { messages: [{ role: 'tool', content: 'bad role' }] },
      { messages: [{ role: 'user', content: '' }] },
      { messages: [{ role: 'user', content: 'hello' }], stateCode: 'TEX' },
    ]) {
      const invalid = await app.inject({ method: 'POST', url: '/api/v1/ai/chat', payload });
      expect(invalid.statusCode).toBe(400);
    }

    mocks.chatWithAI.mockRejectedValueOnce(new Error('provider down'));
    const failed = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      payload: { messages: [{ role: 'user', content: 'hello' }] },
    });
    expect(failed.statusCode).toBe(500);
    expect(JSON.parse(failed.payload).code).toBe('AI_PROVIDER_ERROR');
  });

  it('covers constituency AC validation, query fallback, normalization and provider failure', async () => {
    for (const acNo of ['0', '501', 'abc']) {
      const invalid = await app.inject({ method: 'GET', url: `/api/v1/ai/analyze/constituency/${acNo}` });
      expect(invalid.statusCode).toBe(400);
    }

    const defaultState = await app.inject({ method: 'GET', url: '/api/v1/ai/analyze/constituency/1' });
    expect(defaultState.statusCode).toBe(200);
    expect(JSON.parse(defaultState.payload)).toMatchObject({ acNo: 1, stateCode: 'TS' });

    const malformedQueryFallsBack = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/analyze/constituency/2?stateCode=TOOLONG',
    });
    expect(malformedQueryFallsBack.statusCode).toBe(200);
    expect(JSON.parse(malformedQueryFallsBack.payload).stateCode).toBe('TS');

    const normalized = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/analyze/constituency/3?stateCode=ka',
    });
    expect(JSON.parse(normalized.payload).stateCode).toBe('KA');

    mocks.analyzeConstituency.mockRejectedValueOnce(new Error('analysis failed'));
    const failed = await app.inject({ method: 'GET', url: '/api/v1/ai/analyze/constituency/4?stateCode=KA' });
    expect(failed.statusCode).toBe(500);
  });

  it('covers trend analysis success and provider failure', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/ai/analyze/trends' })).statusCode).toBe(200);
    mocks.analyzeElectionTrends.mockRejectedValueOnce(new Error('trends failed'));
    expect((await app.inject({ method: 'GET', url: '/api/v1/ai/analyze/trends' })).statusCode).toBe(500);
  });

  it('covers smart-search validation, optional state and provider failure', async () => {
    for (const query of ['', 'ab', 'x'.repeat(501)]) {
      const invalid = await app.inject({ method: 'POST', url: '/api/v1/ai/smart-search', payload: { query } });
      expect(invalid.statusCode).toBe(400);
    }
    const valid = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/smart-search',
      payload: { query: '  water supply  ', stateCode: 'TS' },
    });
    expect(valid.statusCode).toBe(200);
    expect(mocks.smartSearch).toHaveBeenCalledWith('water supply', 'TS');

    mocks.smartSearch.mockRejectedValueOnce(new Error('search failed'));
    expect((await app.inject({
      method: 'POST',
      url: '/api/v1/ai/smart-search',
      payload: { query: 'water supply' },
    })).statusCode).toBe(500);
  });

  it('covers issue summarization validation, success and provider failure', async () => {
    for (const payload of [
      { constituencyName: '', issues: ['water'] },
      { constituencyName: 'Hyderabad', issues: [] },
      { constituencyName: 'Hyderabad', issues: [''] },
      { constituencyName: 'Hyderabad', issues: ['x'.repeat(1001)] },
    ]) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/ai/summarize-issues', payload })).statusCode).toBe(400);
    }
    const valid = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/summarize-issues',
      payload: { constituencyName: 'Hyderabad', issues: ['water', 'roads'] },
    });
    expect(valid.statusCode).toBe(200);
    expect(mocks.summarizeIssues).toHaveBeenCalledWith('Hyderabad', ['water', 'roads']);

    mocks.summarizeIssues.mockRejectedValueOnce(new Error('summary failed'));
    expect((await app.inject({
      method: 'POST',
      url: '/api/v1/ai/summarize-issues',
      payload: { constituencyName: 'Hyderabad', issues: ['water'] },
    })).statusCode).toBe(500);
  });

  it('covers campaign-copy validation, defaults, explicit options and provider failure', async () => {
    for (const payload of [
      { candidateName: '', constituencyName: 'Hyderabad', topic: 'roads' },
      { candidateName: 'Candidate', constituencyName: '', topic: 'roads' },
      { candidateName: 'Candidate', constituencyName: 'Hyderabad', topic: '' },
      { candidateName: 'Candidate', constituencyName: 'Hyderabad', topic: 'roads', format: 'invalid' },
      { candidateName: 'Candidate', constituencyName: 'Hyderabad', topic: 'roads', language: 'tamil' },
    ]) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/ai/campaign-copy', payload })).statusCode).toBe(400);
    }

    const defaults = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/campaign-copy',
      payload: { candidateName: 'Candidate', constituencyName: 'Hyderabad', topic: 'roads' },
    });
    expect(defaults.statusCode).toBe(200);
    expect(JSON.parse(defaults.payload)).toMatchObject({ format: 'whatsapp', language: 'english', copy: 'campaign copy' });

    const explicit = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/campaign-copy',
      payload: {
        candidateName: 'Candidate',
        constituencyName: 'Hyderabad',
        topic: 'roads',
        format: 'speech',
        language: 'telugu',
        isPro: true,
      },
    });
    expect(explicit.statusCode).toBe(200);
    expect(mocks.generateCampaignCopy).toHaveBeenLastCalledWith({
      candidateName: 'Candidate',
      constituencyName: 'Hyderabad',
      topic: 'roads',
      format: 'speech',
      language: 'telugu',
    });

    mocks.generateCampaignCopy.mockRejectedValueOnce(new Error('copy failed'));
    expect((await app.inject({
      method: 'POST',
      url: '/api/v1/ai/campaign-copy',
      payload: { candidateName: 'Candidate', constituencyName: 'Hyderabad', topic: 'roads' },
    })).statusCode).toBe(500);
  });

  it('covers AI status provider-selection truth table', async () => {
    const readStatus = async () => JSON.parse((await app.inject({ method: 'GET', url: '/api/v1/ai/status' })).payload);

    expect(await readStatus()).toMatchObject({ configured: false, provider: 'gemini', model: 'gemini-flash-lite-latest' });
    process.env.OPENAI_API_KEY = 'test-openai-key';
    expect(await readStatus()).toMatchObject({ configured: true, provider: 'openai', model: 'gpt-4o-mini' });
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    expect(await readStatus()).toMatchObject({ configured: true, provider: 'gemini', model: 'gemini-flash-lite-latest' });
    delete process.env.OPENAI_API_KEY;
    expect(await readStatus()).toMatchObject({ configured: true, provider: 'gemini', model: 'gemini-flash-lite-latest' });
  });
});
