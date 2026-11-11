import { buildApp } from '../server';
import { defaultAIRegistry } from '../services/aiProvider';

describe('AI Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/ai/status', () => {
    it('should return AI configuration status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/status',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body).toHaveProperty('configured');
      expect(body).toHaveProperty('model');
      expect(typeof body.configured).toBe('boolean');
      expect(Array.isArray(body.activeProviders)).toBe(true);
      expect(body.activeProviders).not.toContain('offline_heuristic');
      if (body.configured) {
        expect(body.activeProviders.length).toBeGreaterThan(0);
        expect(body.provider).toBe(body.activeProviders[0]);
        expect(body.model).toBeTruthy();
        expect(body.degradedOffline).toBe(false);
      } else {
        expect(body.activeProviders).toHaveLength(0);
        expect(body.provider).toBeNull();
        expect(body.model).toBeNull();
        expect(body.degradedOffline).toBe(true);
      }
    });
  });

  describe('POST /api/v1/ai/chat', () => {
    it('should reject empty messages', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        payload: { messages: [] },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message || body.error).toContain('messages');
    });

    it('should reject missing messages', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return graceful message when no API key', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      const originalGeminiKey = process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      defaultAIRegistry.resetForTesting();
      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/ai/chat',
          payload: {
            messages: [{ role: 'user', content: 'Tell me about Telangana' }],
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.response).toContain('AI responses are unavailable');
      } finally {
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
        else process.env.OPENAI_API_KEY = originalKey;
        if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalGeminiKey;
        defaultAIRegistry.resetForTesting();
      }
    });
  });

  describe('GET /api/v1/ai/analyze/constituency/:acNo', () => {
    it('should reject invalid AC number', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/analyze/constituency/999',
      });

      expect(res.statusCode).toBe(400);
    });

    it('should reject non-numeric AC', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/analyze/constituency/abc',
      });

      expect(res.statusCode).toBe(400);
    });

    it('should accept national AC numbers beyond 119 for non-TS states gracefully', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/analyze/constituency/150?stateCode=KA',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.acNo).toBe(150);
      expect(body.stateCode).toBe('KA');
      expect(body.analysis).toBeDefined();
    });
  });

  describe('POST /api/v1/ai/smart-search multi-state', () => {
    it('should accept search queries with optional stateCode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/smart-search',
        payload: {
          query: 'Bangalore rural constituency',
          stateCode: 'KA',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.results)).toBe(true);
    });
  });
});
