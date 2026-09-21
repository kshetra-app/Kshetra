import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('W011 Backend Fail-Closed Remediation (JOB 011 / DEF-005)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Campaign Routes Fail-Closed Behavior', () => {
    it('returns 503 DATABASE_UNAVAILABLE on booth update when Supabase is unconfigured for authenticated caller', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-54',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
          'x-user-role': 'admin',
        },
        payload: {
          turnout_status: 'high',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });

    it('returns 503 DATABASE_UNAVAILABLE on volunteer registration when Supabase is unconfigured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/campaign/volunteers',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
          'x-user-role': 'admin',
        },
        payload: {
          campaignId: 'c1',
          name: 'Jane Doe',
          phone: '+919876543210',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });
  });

  describe('DM Unread-Count Fail-Closed Behavior', () => {
    it('fails closed with 503 DATABASE_UNAVAILABLE instead of returning fake { count: 0 } when Supabase is unconfigured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });
  });

  describe('Moderation Routes Fail-Closed Behavior', () => {
    it('returns 503 DATABASE_UNAVAILABLE for verify-request when Supabase is unconfigured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
        payload: {
          verificationType: 'government_official',
          documentUrl: 'https://example.com/doc.pdf',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });

    it('returns 503 DATABASE_UNAVAILABLE for block user when Supabase is unconfigured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
        payload: {
          blockedUserId: '00000000-0000-0000-0000-000000000002',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });

    it('returns 503 DATABASE_UNAVAILABLE for unblock user when Supabase is unconfigured', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/00000000-0000-0000-0000-000000000002',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code || body.error).toMatch(/DATABASE_UNAVAILABLE/i);
    });
  });

  describe('Elimination of auth-token-user Fallback', () => {
    it('does not authenticate an invalid bearer token as auth-token-user in civic routes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/test-issue-1/comments',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: {
          body: 'Test comment',
        },
      });

      // Must be 401 Unauthorized, NEVER 200/201 mock success
      expect(res.statusCode).toBe(401);
    });

    it('does not authenticate an invalid bearer token as auth-token-user in campaign routes', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/campaign/booths/b-54',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        payload: {
          turnout_status: 'high',
        },
      });

      // Must be 401 Unauthorized, NEVER 200 mock success
      expect(res.statusCode).toBe(401);
    });
  });
});
