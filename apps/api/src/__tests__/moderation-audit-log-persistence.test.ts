import Fastify, { type FastifyInstance } from 'fastify';
import { moderationRoutes } from '../routes/moderation';
import { setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

const adminId = '11111111-1111-4111-8111-111111111111';

describe('GET /api/v1/moderation/audit-log persistence', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    setSupabaseConfiguredForTesting(true);
    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it('returns stored audit rows with the requested filters and page window', async () => {
    const rows = [
      {
        id: 'audit-1',
        actor_id: adminId,
        action: 'moderation.dismiss',
        entity_type: 'moderation',
        entity_id: 'report-1',
        created_at: '2026-11-12T12:00:00.000Z',
      },
    ];
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: rows, error: null, count: 7 }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
          }),
        } as never;
      }
      if (table === 'audit_log') return query as never;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/audit-log?limit=2&offset=4&entityType=moderation',
      headers: { 'x-user-id': adminId, 'x-test-role': 'admin' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data).toEqual({
      entries: rows,
      total: 7,
      limit: 2,
      offset: 4,
    });
    expect(query.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.range).toHaveBeenCalledWith(4, 5);
    expect(query.eq).toHaveBeenCalledWith('entity_type', 'moderation');
  });

  it('reports database failures as unavailable instead of an empty audit history', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'database offline' }, count: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
          }),
        } as never;
      }
      if (table === 'audit_log') return query as never;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/audit-log',
      headers: { 'x-user-id': adminId, 'x-test-role': 'admin' },
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.payload).code).toBe('DATABASE_UNAVAILABLE');
    expect(JSON.parse(response.payload).data).toBeUndefined();
  });

  it('does not substitute the current page length for a missing exact total', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' }, error: null }) }),
          }),
        } as never;
      }
      if (table === 'audit_log') return query as never;
      throw new Error(`Unexpected table ${table}`);
    }) as never);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/audit-log',
      headers: { 'x-user-id': adminId, 'x-test-role': 'admin' },
    });

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.payload).code).toBe('DATABASE_UNAVAILABLE');
  });
});
