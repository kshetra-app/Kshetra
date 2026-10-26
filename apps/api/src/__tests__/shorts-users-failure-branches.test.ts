import Fastify, { type FastifyInstance } from 'fastify';
import { shortsRoutes } from '../routes/shorts';
import { userRoutes } from '../routes/users';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Shorts and relationship route failure branches', () => {
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

  function chainWith(result: any, overrides: Record<string, any> = {}) {
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      update: jest.fn(() => chain),
      insert: jest.fn(() => Promise.resolve(result)),
      upsert: jest.fn(() => Promise.resolve(result)),
      delete: jest.fn(() => chain),
      maybeSingle: jest.fn(() => Promise.resolve(result)),
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => Promise.resolve(result).then(resolve, reject),
      ...overrides,
    };
    return chain;
  }

  it('handles view RPC throws and a missing short without attempting an update', async () => {
    jest.spyOn(supabase, 'rpc').mockRejectedValueOnce(new Error('rpc transport failed'));
    const chain = chainWith({ data: null, error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/no-such-short/view', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(chain.update).not.toHaveBeenCalled();
  });

  it('returns an error when fallback view update reports a database error', async () => {
    jest.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: null, error: { message: 'rpc missing' } } as any);
    const chain = chainWith({ data: { view_count: 3 }, error: null });
    chain.update.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'update rejected' } }),
    }));
    jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({ method: 'POST', url: '/api/v1/shorts/short-1/view', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
  });

  it('handles comment insert errors and thrown persistence errors', async () => {
    const reportedError = chainWith(null, { insert: jest.fn().mockResolvedValue({ error: { message: 'insert rejected' } }) });
    jest.spyOn(supabase, 'from').mockReturnValueOnce(reportedError as any);
    const first = await app.inject({
      method: 'POST', url: '/api/v1/shorts/short-1/comments',
      headers: { 'x-user-id': 'user-1' }, payload: { content: 'comment' },
    });
    expect(first.statusCode).toBe(500);

    const thrown = chainWith(null, { insert: jest.fn().mockRejectedValue(new Error('insert transport failed')) });
    jest.spyOn(supabase, 'from').mockReturnValueOnce(thrown as any);
    const second = await app.inject({
      method: 'POST', url: '/api/v1/shorts/short-1/comments',
      headers: { 'x-user-id': 'user-1' }, payload: { content: 'comment' },
    });
    expect(second.statusCode).toBe(500);
    expect(second.json().code).toBe('DATABASE_ERROR');
  });

  it('handles follow upsert error and exception separately', async () => {
    const reportedError = chainWith(null, { upsert: jest.fn().mockResolvedValue({ error: { message: 'upsert rejected' } }) });
    jest.spyOn(supabase, 'from').mockReturnValueOnce(reportedError as any);
    const first = await app.inject({
      method: 'POST', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(first.statusCode).toBe(500);

    const thrown = chainWith(null, { upsert: jest.fn().mockRejectedValue(new Error('upsert transport failed')) });
    jest.spyOn(supabase, 'from').mockReturnValueOnce(thrown as any);
    const second = await app.inject({
      method: 'POST', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(second.statusCode).toBe(500);
    expect(second.json().code).toBe('DATABASE_ERROR');
  });

  it('handles unfollow query error and exception', async () => {
    const reportedError = chainWith({ data: null, error: { message: 'delete rejected' } });
    reportedError.eq.mockReturnValueOnce(reportedError).mockReturnValueOnce(Promise.resolve({ error: { message: 'delete rejected' } }));
    jest.spyOn(supabase, 'from').mockReturnValueOnce(reportedError as any);
    const first = await app.inject({
      method: 'DELETE', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(first.statusCode).toBe(500);

    const thrown = chainWith(null);
    thrown.delete.mockImplementation(() => { throw new Error('delete transport failed'); });
    jest.spyOn(supabase, 'from').mockReturnValueOnce(thrown as any);
    const second = await app.inject({
      method: 'DELETE', url: '/api/v1/users/user-2/follow',
      headers: { 'x-user-id': 'user-1' }, payload: {},
    });
    expect(second.statusCode).toBe(500);
    expect(second.json().code).toBe('DATABASE_ERROR');
  });
});
