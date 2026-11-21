jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: true,
  isUsingServiceRole: true,
}));

import Fastify from 'fastify';
import { supabase } from '../lib/supabase';
import { feedRoutes } from '../routes/feed';

describe('Personal page submissions', () => {
  const app = Fastify();
  const owner = '11111111-1111-4111-8111-111111111111';
  const otherUser = '22222222-2222-4222-8222-222222222222';
  const from = supabase.from as jest.Mock;

  beforeAll(async () => {
    await app.register(feedRoutes);
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => jest.resetAllMocks());

  it('requires authentication before accessing private review data', async () => {
    const result = await app.inject('/api/v1/feed/my-submissions');
    expect(result.statusCode).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('uses the authenticated owner and returns the actual review state with pagination', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: Array.from({ length: 21 }, (_, id) => ({
          id,
          content: 'A post',
          review_status: 'pending',
        })),
        error: null,
      }),
    };
    from.mockReturnValue(query);
    const result = await app.inject({
      url: `/api/v1/feed/my-submissions?offset=20&authorId=${otherUser}`,
      headers: { 'x-user-id': owner },
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(query.eq).toHaveBeenCalledWith('author_id', owner);
    expect(query.eq).not.toHaveBeenCalledWith('author_id', otherUser);
    expect(query.in).toHaveBeenCalledWith('review_status', ['pending', 'rejected']);
    expect(query.range).toHaveBeenCalledWith(20, 40);
    expect(result.json().submissions).toHaveLength(20);
    expect(result.json().submissions[0].reviewStatus).toBe('pending');
    expect(result.json().nextOffset).toBe(40);
  });
});
