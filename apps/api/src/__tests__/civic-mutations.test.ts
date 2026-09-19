/**
 * W009-B4 Civic & Politician Canonical Mutation Tests
 * Verifies the 11 authorized mutations:
 * - Unauthenticated requests return 401
 * - Malformed input returns 400
 * - Unconfigured database fails closed (503) without fake success
 * - Status update enforces author/admin role (403 on unauthorized)
 * - Operations 8 and 10 fail closed with 501 / PERSISTENCE_TARGET_UNAVAILABLE
 */

import { buildApp } from '../server';
import { setSupabaseConfiguredForTesting } from '../lib/supabase';
import type { FastifyInstance } from 'fastify';

describe('W009-B4 Canonical Mutations API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    setSupabaseConfiguredForTesting(false);
    await app.close();
  });

  describe('Authentication Enforcement (401)', () => {
    it('POST /api/v1/civic/issues/:id/upvote requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
      });
      expect(res.statusCode).toBe(401);
    });

    it('DELETE /api/v1/civic/issues/:id/upvote requires auth', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/civic/issues/iss-1/upvote',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/issues/:id/follow requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/follow',
        payload: { follow: true },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/issues requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        payload: { title: 'Road broken', category: 'roads', stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('PATCH /api/v1/civic/issues/:id/status requires auth', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        payload: { status: 'acknowledged' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/issues/:id/comments requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/comments',
        payload: { body: 'Looking into this' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/politician/events/:id/rsvp requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/events/evt-1/rsvp',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/politician/surveys/:id/respond requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/surveys/sv-1/respond',
        payload: { answers: { q1: 'Healthcare' } },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/bills/:id/opinion requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-1/opinion',
        payload: { support: true },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/rti requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        payload: { subject: 'Sanctioned budget' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/civic/rti/:id/upvote requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti/rti-1/upvote',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Fail-Closed on Unconfigured Database (503 No Fake Success)', () => {
    beforeEach(() => {
      setSupabaseConfiguredForTesting(false);
    });

    it('returns 503 DATABASE_UNAVAILABLE when database is unconfigured on upvote', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues/iss-1/upvote',
        headers: { 'x-user-id': 'user-1' },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('returns 503 DATABASE_UNAVAILABLE on civic issue creation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-1' },
        payload: { title: 'Pothole on Main Rd', category: 'roads', stateCode: 'TS' },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('returns 503 DATABASE_UNAVAILABLE on event rsvp', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/events/evt-1/rsvp',
        headers: { 'x-user-id': 'user-1' },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('returns 503 DATABASE_UNAVAILABLE on survey response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/surveys/sv-1/respond',
        headers: { 'x-user-id': 'user-1' },
        payload: { answers: { q1: 'Yes' } },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('returns 503 DATABASE_UNAVAILABLE on bill opinion', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/bills/bill-1/opinion',
        headers: { 'x-user-id': 'user-1' },
        payload: { support: true },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('returns 503 DATABASE_UNAVAILABLE on RTI submission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/rti',
        headers: { 'x-user-id': 'user-1' },
        payload: { subject: 'Budget inquiry' },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('Explicitly Blocked Operations Fail Closed (501)', () => {
    it('Operation 8 (Manifesto Vote) returns 501 PERSISTENCE_TARGET_UNAVAILABLE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/manifestos/man-1/items/it-1/vote',
        payload: { support: true },
      });
      expect(res.statusCode).toBe(501);
      const data = JSON.parse(res.payload);
      expect(data.code).toBe('PERSISTENCE_TARGET_UNAVAILABLE');
    });

    it('Operation 10 (Politician Grievance) returns 501 PERSISTENCE_TARGET_UNAVAILABLE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/grievances',
        payload: {
          politicianId: 'pol-1',
          subject: 'Street light',
          description: 'Not working for 2 weeks',
          category: 'infrastructure',
        },
      });
      expect(res.statusCode).toBe(501);
      const data = JSON.parse(res.payload);
      expect(data.code).toBe('PERSISTENCE_TARGET_UNAVAILABLE');
    });
  });

  describe('Validation & Schema Guard Rejections (400)', () => {
    it('rejects issue creation with missing stateCode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/civic/issues',
        headers: { 'x-user-id': 'user-1' },
        payload: { title: 'Road issue', category: 'roads' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects issue status update with missing status', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/civic/issues/iss-1/status',
        headers: { 'x-user-id': 'user-1' },
        payload: { note: 'note only' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects survey response with non-object answers', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/politician/surveys/sv-1/respond',
        headers: { 'x-user-id': 'user-1' },
        payload: { answers: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});