import Fastify, { FastifyInstance } from 'fastify';
import { moderationRoutes } from '../routes/moderation';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

const reporterId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';

describe('POST /api/v1/moderation/report persistence', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it.each([
    ['post', { post_id: targetId, comment_id: null, reported_user_id: null }],
    ['comment', { post_id: null, comment_id: targetId, reported_user_id: null }],
    ['user', { post_id: null, comment_id: null, reported_user_id: targetId }],
  ] as const)(
    'persists a %s report with a database-generated UUID',
    async (contentType, targetColumns) => {
      let inserted: Record<string, unknown> | undefined;
      const single = jest.fn().mockResolvedValue({ data: { id: reportId }, error: null });
      const select = jest.fn().mockReturnValue({ single });
      const insert = jest.fn((payload: Record<string, unknown>) => {
        inserted = payload;
        return { select };
      });

      jest.spyOn(supabase, 'from').mockReturnValue({ insert } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/report',
        headers: { 'x-user-id': reporterId },
        payload: {
          contentId: targetId,
          contentType,
          reason: 'spam',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(inserted).toEqual({
        reporter_id: reporterId,
        ...targetColumns,
        reason: 'spam',
        description: null,
        status: 'pending',
      });
      expect(inserted).not.toHaveProperty('id');
      expect(JSON.parse(response.payload).data.reportId).toBe(reportId);
    },
  );

  it('rejects unauthenticated reports instead of inventing an anonymous identity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/report',
      payload: {
        contentId: targetId,
        contentType: 'post',
        reason: 'spam',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects unsupported target types before writing to the database', async () => {
    const from = jest.spyOn(supabase, 'from');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/report',
      headers: { 'x-user-id': reporterId },
      payload: {
        contentId: targetId,
        contentType: 'campaign',
        reason: 'spam',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('loads reported account details without relying on a nonexistent cross-table relationship', async () => {
    const report = {
      id: reportId,
      reporter_id: reporterId,
      reported_user_id: targetId,
      post_id: null,
      comment_id: null,
      reason: 'spam',
      status: 'pending',
    };
    const profile = {
      user_id: targetId,
      display_name: 'Reported Account',
      avatar_url: null,
      role: 'citizen',
    };

    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'reports') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [report], error: null }),
              }),
            }),
          }),
        } as any;
      }

      if (table === 'user_profiles') {
        return {
          select: () => ({
            in: async () => ({ data: [profile], error: null }),
          }),
        } as any;
      }

      throw new Error(`Unexpected table ${table}`);
    }) as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/queue',
      headers: {
        'x-user-id': reporterId,
        'x-test-role': 'moderator',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data.queue[0].reported_user).toEqual(profile);
  });
});
