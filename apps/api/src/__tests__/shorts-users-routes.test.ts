import Fastify, { type FastifyInstance } from 'fastify';
import { shortsRoutes } from '../routes/shorts';
import { userRoutes } from '../routes/users';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Shorts and user relationship routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    app = Fastify();
    await app.register(shortsRoutes);
    await app.register(userRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    setSupabaseConfiguredForTesting(true);
  });

  function queryResult(result: any) {
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      update: jest.fn(() => chain),
      insert: jest.fn(() => Promise.resolve(result)),
      upsert: jest.fn(() => Promise.resolve(result)),
      delete: jest.fn(() => chain),
      maybeSingle: jest.fn(() => Promise.resolve(result)),
      then: (resolve: (value: any) => any) => Promise.resolve(result).then(resolve),
    };
    return chain;
  }

  it('increments a short view through the RPC path', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: null } as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/short-1/view', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, shortId: 'short-1', incremented: true });
    expect(supabase.rpc).toHaveBeenCalledWith('increment_short_views', { p_short_id: 'short-1' });
  });

  it('falls back to a database read/update when the view RPC errors', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'function unavailable' } } as any);
    const chain = queryResult({ data: { view_count: 4 }, error: null });
    const from = jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/short-2/view', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(from).toHaveBeenCalledWith('political_shorts');
    expect(chain.update).toHaveBeenCalledWith({ view_count: 5 });
  });

  it('returns a database error when the view-count read fails', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'function unavailable' } } as any);
    jest.spyOn(supabase, 'from').mockReturnValue(queryResult({ data: null, error: { message: 'read failed' } }) as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/short-3/view', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
  });

  it('authenticates and persists a short comment', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue(queryResult({ data: null, error: null }) as any);
    const response = await app.inject({
      method: 'POST', url: '/api/v1/shorts/short-4/comments',
      headers: { 'x-user-id': 'user-1' },
      payload: { content: 'A civic update' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ success: true, shortId: 'short-4', userId: 'user-1', content: 'A civic update' });
  });

  it('rejects a spoofed comment user ID', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/shorts/short-4/comments',
      headers: { 'x-user-id': 'user-1' },
      payload: { userId: 'user-2', content: 'spoof attempt' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('records a follow relationship for the authenticated user', async () => {
    const chain = queryResult({ data: null, error: null });
    const from = jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({
      method: 'POST', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ success: true, followerId: 'user-1', targetUserId: 'user-2', followed: true });
    expect(from).toHaveBeenCalledWith('user_follows');
    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ follower_id: 'user-1', followed_id: 'user-2' }), { onConflict: 'follower_id,followed_id' });
  });

  it('unfollows only the authenticated user relationship', async () => {
    const chain = queryResult({ data: null, error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({
      method: 'DELETE', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, followerId: 'user-1', targetUserId: 'user-2', unfollowed: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('follower_id', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('followed_id', 'user-2');
  });

  it('rejects a spoofed follower ID', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: { followerId: 'user-3' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('fails closed when the database is unconfigured for a follow mutation', async () => {
    setSupabaseConfiguredForTesting(false);
    const response = await app.inject({
      method: 'POST', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe('SERVICE_UNAVAILABLE');
  });
});
