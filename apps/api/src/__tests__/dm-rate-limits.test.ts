import { checkConversationRateLimit } from '../routes/dm';
import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('TICKET 3.5 & 3.2: Direct Message Tiered Rate Limiting & Anti-Abuse', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('checkConversationRateLimit function logic', () => {
    it('enforces 10 conversations/24h for accounts under 7 days old', () => {
      const youngUserId = 'user-young-test-1';
      const youngCreatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days old

      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        const res = checkConversationRateLimit(youngUserId, youngCreatedAt, false, false);
        expect(res.allowed).toBe(true);
      }

      // 11th should be rate-limited
      const rateLimited = checkConversationRateLimit(youngUserId, youngCreatedAt, false, false);
      expect(rateLimited.allowed).toBe(false);
      expect(rateLimited.error).toContain('Daily new conversation limit of 10 reached');
      expect(rateLimited.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('enforces hard hourly ceiling of 15 conversations/hour for any account', () => {
      const veteranUserId = 'user-veteran-test-2';
      const veteranCreatedAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year old

      // Veteran account gets up to 15 per hour before hard ceiling hits
      for (let i = 0; i < 15; i++) {
        const res = checkConversationRateLimit(veteranUserId, veteranCreatedAt, true, false);
        expect(res.allowed).toBe(true);
      }

      // 16th hit hourly ceiling
      const ceilingRes = checkConversationRateLimit(veteranUserId, veteranCreatedAt, true, false);
      expect(ceilingRes.allowed).toBe(false);
      expect(ceilingRes.error).toContain('Hourly conversation creation limit of 15 reached');
      expect(ceilingRes.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('allows mutual follows without consuming daily stranger limit', () => {
      const mutualUserId = 'user-mutual-test-3';
      const youngCreatedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day old

      // Consuming 10 mutual conversations
      for (let i = 0; i < 10; i++) {
        const res = checkConversationRateLimit(mutualUserId, youngCreatedAt, false, true);
        expect(res.allowed).toBe(true);
      }

      // 11th stranger conversation is still permitted because mutual follow didn't consume stranger quota
      const strangerRes = checkConversationRateLimit(mutualUserId, youngCreatedAt, false, false);
      expect(strangerRes.allowed).toBe(true);
    });
  });

  describe('DM Route Handlers', () => {
    it('rejects unauthenticated requests to start conversation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        payload: {
          recipientId: '00000000-0000-0000-0000-000000000002',
          initialMessage: 'Hello stranger',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('creates or retrieves conversation in dev mode with x-user-id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
        payload: {
          recipientId: '00000000-0000-0000-0000-000000000002',
          initialMessage: 'First greeting',
        },
      });

      expect([200, 201]).toContain(res.statusCode);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.conversation).toBeDefined();
    });

    it('supports one-tap block and report action', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/block-report',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
        payload: {
          targetUserId: '00000000-0000-0000-0000-000000000999',
          reason: 'harassment',
          description: 'Spamming abusive messages',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.blocked).toBe(true);
      expect(body.reported).toBe(true);
    });

    it('returns unread count for authenticated user via GET /api/v1/dm/unread-count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(typeof body.count).toBe('number');
    });
  });
});
