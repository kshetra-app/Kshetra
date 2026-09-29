/**
 * apps/api/src/__tests__/political-entities.test.ts
 *
 * Fastify API integration tests for Milestone W018:
 * - GET  /api/v1/entities/search
 * - GET  /api/v1/entities/persons/:id
 * - GET  /api/v1/entities/persons/:id/timeline
 * - GET  /api/v1/entities/organizations/:id
 * - GET  /api/v1/entities/legislators
 * - POST /api/v1/entities/persons/:id/claim
 */
import type { FastifyInstance } from 'fastify';

// Point test execution to the local Supabase container where Migration 050 is deployed
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
process.env.SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

describe('Political Entity Model API (W018)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Dynamic import ensures environment variables are applied before supabase client initialization
    const { buildApp } = await import('../server');
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const get = (url: string, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url,
      headers: {
        authorization: 'Bearer test-token',
        'x-test-role': 'service_role',
        ...headers,
      },
    });

  const post = (url: string, body: any, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'x-test-role': 'service_role',
        ...headers,
      },
      payload: body,
    });

  // ─── 1. SECURITY & AUTHORIZATION GATES ─────────────────────────────────────
  describe('Security & Authorization Gates', () => {
    it('returns 401 Unauthorized on POST /api/v1/entities/persons/:id/claim when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/entities/persons/00000000-0000-0000-0000-000000000001/claim',
        payload: {
          verificationType: 'voter_id',
          notes: 'Test claim without credentials',
        },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('AUTHENTICATION_REQUIRED');
      expect(body.requestId).toBeDefined();
    });

    it('rejects claim request when verificationType is missing (400 Validation Error)', async () => {
      const res = await post(
        '/api/v1/entities/persons/00000000-0000-0000-0000-000000000001/claim',
        { notes: 'Missing verificationType' },
        { 'x-test-role': 'authenticated' }
      );
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Bad Request');
    });
  });

  // ─── 2. ENTITY SEARCH & ROSTER ENDPOINTS ───────────────────────────────────
  describe('Entity Search & Roster Endpoints', () => {
    it('returns 200 with structured data for GET /api/v1/entities/search', async () => {
      const res = await get('/api/v1/entities/search?q=Revanth&type=person');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.persons)).toBe(true);
      expect(Array.isArray(body.data.organizations)).toBe(true);
      expect(typeof body.data.total).toBe('number');
    });

    it('returns 200 with organization search results', async () => {
      const res = await get('/api/v1/entities/search?q=Congress&type=organization');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.organizations)).toBe(true);
    });

    it('returns 200 for GET /api/v1/entities/legislators', async () => {
      const res = await get('/api/v1/entities/legislators?house=assembly&currentOnly=true');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.legislators)).toBe(true);
      expect(typeof body.data.total).toBe('number');
    });

    it('supports house=parliament parameter on GET /api/v1/entities/legislators', async () => {
      const res = await get('/api/v1/entities/legislators?house=parliament');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.legislators)).toBe(true);
    });
  });

  // ─── 3. NOT FOUND & BOUNDARY GATES ─────────────────────────────────────────
  describe('Not Found & Boundary Gates', () => {
    it('returns 404 with PERSON_NOT_FOUND when person does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099';
      const res = await get(`/api/v1/entities/persons/${nonExistentId}`);
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
      expect(body.code).toBe('PERSON_NOT_FOUND');
    });

    it('returns 404 with TIMELINE_FETCH_ERROR/PERSON_NOT_FOUND for non-existent timeline', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099';
      const res = await get(`/api/v1/entities/persons/${nonExistentId}/timeline`);
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
    });

    it('returns 404 with ORGANIZATION_NOT_FOUND when org does not exist', async () => {
      const res = await get('/api/v1/entities/organizations/ORG-NONEXISTENT-999');
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Not Found');
      expect(body.code).toBe('ORGANIZATION_NOT_FOUND');
    });

    it('returns 404 when claiming a non-existent person identity', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099';
      const res = await post(
        `/api/v1/entities/persons/${nonExistentId}/claim`,
        {
          verificationType: 'official_gazette',
          notes: 'Testing claiming non-existent entity',
        },
        { 'x-test-role': 'authenticated', 'x-test-user-id': 'user-123' }
      );
      expect(res.statusCode).toBe(404);
    });
  });
});
