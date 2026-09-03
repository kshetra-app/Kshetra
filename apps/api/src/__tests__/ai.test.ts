import { buildApp } from '../server';

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
      expect(['openai', 'gemini']).toContain(body.provider);
      expect(typeof body.configured).toBe('boolean');
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
      expect(body.error).toContain('messages');
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

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/chat',
        payload: {
          messages: [{ role: 'user', content: 'Tell me about Telangana' }],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.response).toContain('API key');

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
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
  });
});
