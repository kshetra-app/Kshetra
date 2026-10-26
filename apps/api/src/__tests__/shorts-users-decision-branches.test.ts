import Fastify, { type FastifyInstance } from 'fastify';
import { shortsRoutes } from '../routes/shorts';
import { userRoutes } from '../routes/users';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Shorts and user relationship route decision branches', () => {
  let app: FastifyInstance;
  const originalHarness = process.env.TEST_HARNESS_ACTIVE;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    app = Fastify();
    await app.register(shortsRoutes);
    await app.register(userRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalHarness === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarness;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  const chain = (result: any) => {
    const q: any = {
      select: jest.fn(() => q),
      eq: jest.fn(() => q),
      update: jest.fn(() => q),
      delete: jest.fn(() => q),
      insert: jest.fn().mockResolvedValue(result),
      upsert: jest.fn().mockResolvedValue(result),
      maybeSingle: jest.fn().mockResolvedValue(result),
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
  };

  it('returns 503 for view, comment, follow and unfollow when the database provider is unconfigured', async () => {
    setSupabaseConfiguredForTesting(false);
    const view = await app.inject({ method: 'POST', url: '/api/v1/shorts/s-1/view', payload: {} });
    expect(view.statusCode).toBe(503);
    expect(view.json().code).toBe('SERVICE_UNAVAILABLE');

    const comment = await app.inject({
      method: 'POST', url: '/api/v1/shorts/s-1/comments',
      headers: { 'x-user-id': 'u-1' }, payload: { content: 'A valid comment' },
    });
    expect(comment.statusCode).toBe(503);

    const follow = await app.inject({
      method: 'POST', url: '/api/v1/users/u-2/follow',
      headers: { 'x-user-id': 'u-1' }, payload: {},
    });
    expect(follow.statusCode).toBe(503);

    const unfollow = await app.inject({
      method: 'DELETE', url: '/api/v1/users/u-2/follow',
      headers: { 'x-user-id': 'u-1' }, payload: {},
    });
    expect(unfollow.statusCode).toBe(503);
  });

  it('returns early for unauthenticated comment and relationship mutations', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TEST_HARNESS_ACTIVE = 'false';
    try {
      const comment = await app.inject({
        method: 'POST', url: '/api/v1/shorts/s-1/comments', payload: { content: 'comment' },
      });
      expect(comment.statusCode).toBe(401);

      const follow = await app.inject({ method: 'POST', url: '/api/v1/users/u-2/follow', payload: {} });
      expect(follow.statusCode).toBe(401);

      const unfollow = await app.inject({ method: 'DELETE', url: '/api/v1/users/u-2/follow', payload: {} });
      expect(unfollow.statusCode).toBe(401);
    } finally {
      process.env.NODE_ENV = 'test';
      process.env.TEST_HARNESS_ACTIVE = 'true';
    }
  });

  it('rejects caller-supplied identities that do not match the authenticated user', async () => {
    const comment = await app.inject({
      method: 'POST', url: '/api/v1/shorts/s-1/comments',
      headers: { 'x-user-id': 'u-1' }, payload: { userId: 'u-2', content: 'comment' },
    });
    expect(comment.statusCode).toBe(403);

    const follow = await app.inject({
      method: 'POST', url: '/api/v1/users/u-3/follow',
      headers: { 'x-user-id': 'u-1' }, payload: { followerId: 'u-2' },
    });
    expect(follow.statusCode).toBe(403);

    const unfollow = await app.inject({
      method: 'DELETE', url: '/api/v1/users/u-3/follow',
      headers: { 'x-user-id': 'u-1' }, payload: { followerId: 'u-2' },
    });
    expect(unfollow.statusCode).toBe(403);
  });

  it('uses the atomic view RPC success path without querying or updating a short', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: 1, error: null } as any);
    const from = jest.spyOn(supabase, 'from');
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/s-1/view', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, shortId: 's-1', incremented: true });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns a database error when fallback view-count lookup fails', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: null, error: { message: 'RPC unavailable' } } as any);
    const q = chain({ data: null, error: { message: 'lookup failed' } });
    jest.spyOn(supabase, 'from').mockReturnValue(q as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/s-1/view', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
    expect(q.update).not.toHaveBeenCalled();
  });

  it('persists a comment and returns its generated identifier on success', async () => {
    const q = chain({ data: null, error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(q as any);
    const response = await app.inject({
      method: 'POST', url: '/api/v1/shorts/s-1/comments',
      headers: { 'x-user-id': 'u-1' }, payload: { content: 'A valid comment' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ success: true, shortId: 's-1', userId: 'u-1', content: 'A valid comment' });
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ short_id: 's-1', user_id: 'u-1', content: 'A valid comment' }));
  });

  it('completes follow and unfollow successfully through their respective persistence paths', async () => {
    const q = chain({ data: null, error: null });
    const from = jest.spyOn(supabase, 'from').mockReturnValue(q as any);
    const followed = await app.inject({
      method: 'POST', url: '/api/v1/users/u-2/follow',
      headers: { 'x-user-id': 'u-1' }, payload: {},
    });
    expect(followed.statusCode).toBe(201);
    expect(followed.json()).toMatchObject({ followerId: 'u-1', targetUserId: 'u-2', followed: true });
    expect(q.upsert).toHaveBeenCalledWith(expect.objectContaining({ follower_id: 'u-1', followed_id: 'u-2' }), { onConflict: 'follower_id,followed_id' });

    const deleteQuery = chain({ data: null, error: null });
    from.mockReturnValue(deleteQuery as any);
    const unfollowed = await app.inject({
      method: 'DELETE', url: '/api/v1/users/u-2/follow',
      headers: { 'x-user-id': 'u-1' }, payload: {},
    });
    expect(unfollowed.statusCode).toBe(200);
    expect(unfollowed.json()).toMatchObject({ followerId: 'u-1', targetUserId: 'u-2', unfollowed: true });
    expect(deleteQuery.delete).toHaveBeenCalled();
  });
});
