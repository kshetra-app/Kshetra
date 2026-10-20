/**
 * CTO Directive 117 — Workstream B
 * Deterministic Regression Test Suite for DM Unread-Count Error Behavior
 *
 * Verifies the 5 mandatory contract scenarios:
 * 1. Successful query returning zero unread messages (200 OK, { success: true, count: 0 })
 * 2. Successful query returning a positive unread count (200 OK, { success: true, count: 5 })
 * 3. Conversation lookup failure (500 DATABASE_ERROR fail-closed)
 * 4. Unread-message count failure (500 DATABASE_ERROR fail-closed)
 * 5. Unconfigured database (503 DATABASE_UNAVAILABLE fail-closed)
 */

import { buildApp } from '../server';
import { supabase, isSupabaseConfigured, setSupabaseConfiguredForTesting } from '../lib/supabase';
import type { FastifyInstance } from 'fastify';

describe('CTO Directive 117: DM Unread-Count Contract & Error Behavior', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    originalConfigured = isSupabaseConfigured;
    setSupabaseConfiguredForTesting(true);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    setSupabaseConfiguredForTesting(originalConfigured);
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  const mockUserProfiles = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { role: 'citizen', verification_status: 'unverified', created_at: new Date().toISOString() },
          error: null,
        }),
      }),
    }),
  });

  it('Case 1: returns HTTP 200 with count 0 when user has no unread messages or conversations', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return mockUserProfiles();
      }
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    }) as any);

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
    expect(body.count).toBe(0);
  });

  it('Case 2: returns HTTP 200 with positive unread count when unread messages exist', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return mockUserProfiles();
      }
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({
                data: [{ id: 'conv-101' }, { id: 'conv-102' }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: () => ({
            in: () => ({
              neq: () => ({
                is: async () => ({ count: 5, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    }) as any);

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
    expect(body.count).toBe(5);
  });

  it('Case 3: returns HTTP 500 DATABASE_ERROR fail-closed when conversation lookup fails', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return mockUserProfiles();
      }
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({
                data: null,
                error: { message: 'relation "conversations" connection timeout', code: '57P01' },
              }),
            }),
          }),
        };
      }
      return {};
    }) as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dm/unread-count',
      headers: {
        'x-user-id': '00000000-0000-0000-0000-000000000001',
      },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code || body.error).toMatch(/DATABASE_ERROR/i);
    // CRITICAL: Ensure genuine error is never masked as a valid zero count
    expect(body.count).toBeUndefined();
  });

  it('Case 4: returns HTTP 500 DATABASE_ERROR fail-closed when message count query fails', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return mockUserProfiles();
      }
      if (table === 'conversations') {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({
                data: [{ id: 'conv-101' }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          select: () => ({
            in: () => ({
              neq: () => ({
                is: async () => ({
                  count: null,
                  error: { message: 'query execution cancelled by statement timeout', code: '57014' },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    }) as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dm/unread-count',
      headers: {
        'x-user-id': '00000000-0000-0000-0000-000000000001',
      },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code || body.error).toMatch(/DATABASE_ERROR/i);
    // CRITICAL: Ensure genuine error is never masked as a valid zero count
    expect(body.count).toBeUndefined();
  });

  it('Case 5: returns HTTP 503 DATABASE_UNAVAILABLE fail-closed when database is unconfigured', async () => {
    setSupabaseConfiguredForTesting(false);

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
    expect(body.count).toBeUndefined();
  });
});
