/**
 * Feed & Strangler Mutation Tests
 * Verifies that:
 * - Unauthenticated requests return 401
 * - Malformed payloads return 400
 * - Unconfigured database fails closed (503)
 * - Identity spoofing returns 403
 * - Canonical error envelope is returned
 */

import { buildApp } from '../server';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting } from '../lib/supabase';
import type { FastifyInstance } from 'fastify';

describe('Track 3: Fastify Strangler Mutations API', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    originalConfigured = isSupabaseConfigured;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    setSupabaseConfiguredForTesting(originalConfigured);
    await app.close();
  });

  describe('1. Authentication Enforcement (401)', () => {
    it('POST /api/v1/feed/posts requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        payload: { content: 'Hello Kshetra', stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.error).toBe('Unauthorized');
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('PATCH /api/v1/feed/posts/:id requires auth', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/feed/posts/post-1',
        payload: { content: 'Updated content' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('DELETE /api/v1/feed/posts/:id requires auth', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/feed/posts/post-1',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/feed/posts/:id/react requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/post-1/react',
        payload: { type: 'like' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('DELETE /api/v1/feed/posts/:id/react requires auth', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/feed/posts/post-1/react',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/feed/polls/:id/vote requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/polls/poll-1/vote',
        payload: { optionId: 'opt-1' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/feed/posts/:id/comments requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts/post-1/comments',
        payload: { content: 'Nice initiative' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('DELETE /api/v1/feed/comments/:id requires auth', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/feed/comments/comment-1',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/issues/:id/tag-mla requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/tag-mla',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/issues/:id/dispute requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/dispute',
        payload: { reason: 'Pothole was only partially patched' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/promises/:id/follow requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/promises/prom-1/follow',
        payload: { follow: true },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/promises/:id/evidence requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/promises/prom-1/evidence',
        payload: { title: 'Flyover Inauguration' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/user/favorites/toggle requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/user/favorites/toggle',
        payload: { targetType: 'constituency', targetId: 'TS_1', isFavorited: true },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/shorts requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/shorts',
        payload: { title: 'Townhall Highlight', videoUrl: 'https://video.example.com/1', stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('PATCH /api/v1/user/profile requires auth', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/user/profile',
        payload: { displayName: 'Citizen Rao' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/aspirant/register requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aspirant/register',
        payload: { targetConstituencyId: 'TS_1' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/aspirant/modules/:id/start requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aspirant/modules/mod-1/start',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('2. Validation Enforcement (400)', () => {
    it('POST /api/v1/feed/posts rejects missing content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: { 'x-user-id': 'usr-1' },
        payload: { stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/feed/posts rejects missing stateCode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'A valid thought' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/feed/polls/:id/vote rejects missing optionId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/polls/poll-1/vote',
        headers: { 'x-user-id': 'usr-1' },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/civic/issues/:id/dispute rejects missing reason', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/dispute',
        headers: { 'x-user-id': 'usr-1' },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('3. Identity Spoofing Protection (403)', () => {
    it('POST /api/v1/feed/posts rejects mismatched authorId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: { 'x-user-id': 'real-user' },
        payload: { content: 'Spoofed post', stateCode: 'TS', authorId: 'impersonated-user' },
      });
      expect(res.statusCode).toBe(403);
      const json = res.json();
      expect(json.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/feed/polls/:id/vote rejects mismatched userId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/polls/poll-1/vote',
        headers: { 'x-user-id': 'real-user' },
        payload: { optionId: 'opt-1', userId: 'spoofed-user' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('POST /api/v1/civic/issues/:id/dispute rejects mismatched userId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/dispute',
        headers: { 'x-user-id': 'real-user' },
        payload: { reason: 'Invalid repair', userId: 'spoofed-user' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('4. Database Fail-Closed Protection (503)', () => {
    beforeAll(() => {
      setSupabaseConfiguredForTesting(false);
    });

    afterAll(() => {
      setSupabaseConfiguredForTesting(originalConfigured);
    });

    it('POST /api/v1/feed/posts returns 503 when DB is unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/feed/posts',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'Real attempt', stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(503);
      const json = res.json();
      expect(json.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('POST /api/v1/promises/:id/follow returns 503 when DB is unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/promises/prom-1/follow',
        headers: { 'x-user-id': 'usr-1' },
        payload: { follow: true },
      });
      expect(res.statusCode).toBe(503);
    });

    it('POST /api/v1/civic/issues/:id/tag-mla returns 503 when DB is unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/tag-mla',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(res.statusCode).toBe(503);
    });
  });
});
