import Fastify, { type FastifyInstance } from 'fastify';
import { userRoutes } from '../routes/users';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Authenticated follow graph endpoint', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(userRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it('requires an authenticated principal', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/users/me/following' });
    expect(response.statusCode).toBe(401);
  });

  it('returns only follows belonging to the authenticated principal', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ followed_id: 'target-a' }, { followed_id: 'target-b' }],
      error: null,
    });
    const select = jest.fn(() => ({ eq }));
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      expect(table).toBe('user_follows');
      return { select } as any;
    }) as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/following',
      headers: { 'x-user-id': 'authenticated-user' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, followedUserIds: ['target-a', 'target-b'] });
    expect(eq).toHaveBeenCalledWith('follower_id', 'authenticated-user');
  });
});
